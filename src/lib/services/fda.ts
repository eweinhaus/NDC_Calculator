/**
 * FDA NDC Directory API service wrapper.
 * Provides package details, active status, and NDC lookups.
 */

import { logger } from '$lib/utils/logger.js';
import { withRetry } from '$lib/utils/retry.js';
import { cache } from './cache.js';
import { deduplicate } from '$lib/utils/requestDeduplicator.js';
import { fdaPackageKey, fdaPackagesKey, fdaNdcAutocompleteKey } from '$lib/constants/cacheKeys.js';
import { FDA_PACKAGE_TTL } from '$lib/constants/cacheTtl.js';
import { normalizeNdc } from '$lib/utils/ndcNormalizer.js';

const BASE_URL = 'https://api.fda.gov/drug/ndc.json';
const TIMEOUT_MS = 10000; // 10 seconds
const RATE_LIMIT_PER_MINUTE = 240;

/**
 * FDA API response structure.
 */
interface FdaApiResponse {
	meta?: {
		disclaimer?: string;
		last_updated?: string;
		results?: {
			skip: number;
			limit: number;
			total: number;
		};
	};
	results?: FdaPackageResult[];
	error?: {
		code: string;
		message: string;
	};
}

/**
 * FDA package result from API.
 */
interface FdaPackageResult {
	product_ndc: string;
	generic_name?: string;
	labeler_name?: string;
	brand_name?: string;
	active_ingredients?: Array<{
		name: string;
		strength: string;
	}>;
	finished?: boolean;
	packaging?: Array<{
		package_ndc: string;
		description: string;
		marketing_start_date?: string;
		sample?: boolean;
	}>;
	listing_expiration_date?: string;
	openfda?: {
		rxcui?: string[];
		manufacturer_name?: string[];
	};
	dosage_form?: string;
	product_type?: string;
}

/**
 * FDA package details (normalized).
 */
export interface FdaPackageDetails {
	product_ndc: string;
	package_ndc: string;
	package_description: string;
	active: boolean;
	manufacturer_name: string;
	dosage_form: string;
	rxcui?: string[];
	strength?: string;
	generic_name?: string; // Add generic name for RxNorm fallback lookup
	brand_name?: string;   // Add brand name as additional fallback
}

/**
 * Normalize NDC for API calls (remove dashes).
 */
function normalizeNdcForApi(ndc: string): string {
	const normalized = normalizeNdc(ndc);
	if (!normalized) {
		return ndc.replace(/-/g, '').trim();
	}
	return normalized.replace(/-/g, '');
}

/**
 * Determine active status from expiration date.
 */
function isActive(expirationDate?: string): boolean {
	if (!expirationDate) {
		logger.debug('isActive: No expiration date, assuming active');
		return true; // Assume active if no expiration date
	}

	// Parse YYYYMMDD format
	try {
	const year = parseInt(expirationDate.substring(0, 4), 10);
	const month = parseInt(expirationDate.substring(4, 6), 10);
	const day = parseInt(expirationDate.substring(6, 8), 10);
		
		if (isNaN(year) || isNaN(month) || isNaN(day)) {
			logger.warn('isActive: Invalid expiration date format', { expirationDate });
			return true; // Assume active if date is invalid
		}

	const expiration = new Date(year, month - 1, day);
	const now = new Date();
		const isActiveResult = expiration >= now;

		logger.debug('isActive: Checking expiration', {
			expirationDate,
			parsedDate: expiration.toISOString(),
			now: now.toISOString(),
			isActive: isActiveResult,
		});

		return isActiveResult;
	} catch (error) {
		logger.error('isActive: Error parsing expiration date', {
			expirationDate,
			error: error instanceof Error ? error.message : String(error),
		});
		return true; // Assume active on error
	}
}

/**
 * Fetch with timeout.
 */
async function fetchWithTimeout(url: string, timeoutMs: number = TIMEOUT_MS): Promise<Response> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const response = await fetch(url, { signal: controller.signal });
		clearTimeout(timeoutId);
		return response;
	} catch (error) {
		clearTimeout(timeoutId);
		if (error instanceof Error && error.name === 'AbortError') {
			throw new Error('Request timeout');
		}
		throw error;
	}
}

/**
 * Make request to FDA API with retry logic.
 */
async function makeRequest(endpoint: string): Promise<FdaApiResponse> {
	const url = `${BASE_URL}${endpoint}`;
	logger.debug(`FDA API request: ${url}`);

	return withRetry(
		async () => {
			const response = await fetchWithTimeout(url);

			if (!response.ok) {
				if (response.status === 404) {
					// 404 is not an error for FDA (NDC not found)
					return { results: [] };
				}
				if (response.status === 429) {
					// Rate limit - retry with backoff
					throw { status: 429, message: 'Rate limit exceeded' };
				}
				throw { status: response.status, message: `HTTP ${response.status}` };
			}

			const data = await response.json();

			// Check for API error in response
			if (data.error) {
				if (data.error.code === 'NOT_FOUND') {
					// Return error object so caller can detect and use fallback
					return { results: [], error: data.error };
				}
				throw new Error(data.error.message || 'FDA API error');
			}

			return data;
		},
		{
			maxAttempts: 3,
			initialDelayMs: 1000,
			maxDelayMs: 10000,
			backoffMultiplier: 2
		}
	);
}

/**
 * Map FDA API package info directly to FdaPackageDetails (when we already have the package info).
 */
function mapPackageInfoToDetails(
	result: FdaPackageResult,
	packageInfo: { package_ndc: string; description: string }
): FdaPackageDetails {
	const expirationDate = result.listing_expiration_date;
	const active = isActive(expirationDate);

	logger.debug(`mapPackageInfoToDetails: Creating package details`, {
		packageNdc: packageInfo.package_ndc,
		productNdc: result.product_ndc,
		expirationDate,
		active,
		description: packageInfo.description,
		genericName: result.generic_name,
		brandName: result.brand_name
	});

	return {
		product_ndc: result.product_ndc,
		package_ndc: packageInfo.package_ndc,
		package_description: packageInfo.description,
		active: active,
		manufacturer_name: result.labeler_name || result.openfda?.manufacturer_name?.[0] || 'Unknown',
		dosage_form: result.dosage_form || 'Unknown',
		rxcui: result.openfda?.rxcui,
		strength: result.active_ingredients?.[0]?.strength,
		generic_name: result.generic_name, // Include generic name for RxNorm fallback
		brand_name: result.brand_name       // Include brand name as fallback
	};
}

/**
 * Map FDA API result to FdaPackageDetails.
 * Used when we need to find a specific package by NDC.
 */
function mapToPackageDetails(result: FdaPackageResult, packageNdc: string): FdaPackageDetails | null {
	logger.debug(`[mapToPackageDetails] START`, undefined, {
		packageNdc,
		productNdc: result.product_ndc,
		packagingCount: result.packaging?.length || 0
	});
	
	if (!result.packaging || result.packaging.length === 0) {
		logger.debug(`[mapToPackageDetails] NO PACKAGING ARRAY`, undefined, {
			packageNdc,
			productNdc: result.product_ndc
		});
		return null;
	}

	// Normalize target NDC once
	const normalizedTarget = normalizeNdcForApi(packageNdc);
	const availablePackages = result.packaging.map(p => p.package_ndc);
	
	logger.debug(`[mapToPackageDetails] Searching for match`, undefined, {
		packageNdc,
		normalizedTarget,
		availablePackages
	});

	// Find the specific package
	const packageInfo = result.packaging.find((pkg) => {
		const normalizedPkg = normalizeNdcForApi(pkg.package_ndc);
		return normalizedPkg === normalizedTarget;
	});

	if (!packageInfo) {
		logger.warn(`[mapToPackageDetails] NO MATCH FOUND`, undefined, {
			packageNdc,
			normalizedTarget,
			productNdc: result.product_ndc,
			availablePackages,
			availableNormalized: result.packaging.map((p) => normalizeNdcForApi(p.package_ndc))
		});
		return null;
	}

	logger.debug(`[mapToPackageDetails] MATCH FOUND: ${packageInfo.package_ndc}`, undefined, {
		packageNdc: packageInfo.package_ndc
	});
	
	const details = mapPackageInfoToDetails(result, packageInfo);
	return details;
}

/**
 * Generate alternative labeler code formats for searching.
 * FDA may store NDCs with 4-digit or 5-digit labeler codes.
 * FDA may also store product codes with or without leading zeros.
 * @param productNdc - Product NDC in format "XXXXX-XXXX" or "XXXX-XXXX"
 * @returns Array of alternative formats to try, including original
 */
function generateLabelerFormatVariants(productNdc: string): string[] {
	const variants: string[] = [productNdc]; // Always include original
	
	const parts = productNdc.split('-');
	
	if (parts.length === 2) {
		const labeler = parts[0];
		const product = parts[1];
		
		// Generate labeler variants (4-digit vs 5-digit)
		const labelerVariants: string[] = [labeler];
		
		// If labeler is 5 digits starting with 0, add 4-digit version
		if (labeler.length === 5 && labeler.startsWith('0')) {
			labelerVariants.push(labeler.substring(1));
		}
		// If labeler is 4 digits, add 5-digit version with leading zero
		else if (labeler.length === 4) {
			labelerVariants.push(`0${labeler}`);
		}
		
		// Generate product variants (with/without leading zeros)
		const productVariants: string[] = [product];
		
		// If product has leading zeros, add variant(s) with them stripped
		if (product.startsWith('0')) {
			// Strip one leading zero at a time to generate all variants
			let stripped = product;
			while (stripped.startsWith('0') && stripped.length > 1) {
				stripped = stripped.substring(1);
				productVariants.push(stripped);
			}
		}
		
		// Generate all combinations of labeler and product variants
		for (const labelerVar of labelerVariants) {
			for (const productVar of productVariants) {
				variants.push(`${labelerVar}-${productVar}`);
		}
	}
	}
	
	const uniqueVariants = [...new Set(variants)];
	
	return uniqueVariants;
}

/**
 * Extract product NDC from package NDC (remove package code).
 * @param packageNdc - Full package NDC (e.g., "00002-3227-30")
 * @returns Product NDC (e.g., "00002-3227") or null if invalid
 */
function extractProductNdc(packageNdc: string): string | null {
	const normalized = normalizeNdc(packageNdc);
	if (!normalized) {
		return null;
	}
	
	// Normalized format is XXXXX-XXXX-XX (labeler-product-package)
	// Extract product NDC by removing the package part (last 2 digits after last dash)
	const parts = normalized.split('-');
	if (parts.length === 3) {
		// Format: labeler-product-package
		return `${parts[0]}-${parts[1]}`;
	}
	
	// Fallback: remove dashes and extract first 9 digits
	const digitsOnly = normalized.replace(/-/g, '');
	if (digitsOnly.length < 9) {
		return null;
	}
	
	// Extract product NDC: first 9 digits, format as XXXXX-XXXX
	const labeler = digitsOnly.substring(0, 5);
	const product = digitsOnly.substring(5, 9);
	return `${labeler}-${product}`;
}

/**
 * Get package details for a specific NDC.
 * @param ndc - NDC (product or package NDC)
 * @returns Package details or null if not found
 */
export async function getPackageDetails(ndc: string): Promise<FdaPackageDetails | null> {
	const normalizedNdc = normalizeNdcForApi(ndc);
	const cacheKey = fdaPackageKey(normalizedNdc);

	logger.info(`[FDA getPackageDetails] START - Input NDC: "${ndc}"`, undefined, {
		ndc,
		normalizedNdc,
		cacheKey
	});

	return deduplicate(cacheKey, async () => {
		// Check cache
		const cached = await cache.get<FdaPackageDetails>(cacheKey);
		if (cached) {
			// CRITICAL: Verify cached result matches the exact NDC we're looking for
			if (cached.package_ndc) {
				const cachedNormalized = normalizeNdcForApi(cached.package_ndc);
				const searchedNormalized = normalizeNdcForApi(ndc);
				if (cachedNormalized !== searchedNormalized) {
					logger.warn(`[FDA] Cached result has wrong NDC - clearing cache`, undefined, {
						searched: ndc,
						cached: cached.package_ndc,
						searchedNormalized,
						cachedNormalized
					});
					await cache.delete(cacheKey);
				} else {
					logger.info(`[FDA] Cache HIT for NDC: ${ndc}`, undefined, { ndc, cachedNdc: cached.package_ndc });
			return cached;
				}
			} else {
				logger.info(`[FDA] Cache HIT for NDC: ${ndc}`, undefined, { ndc });
				return cached;
			}
		}

		logger.info(`[FDA] Cache MISS for NDC: ${ndc} - making API call`, undefined, { ndc });

		// Make API call
		try {
			// For package NDCs (11 digits), extract product NDC and search by that
			// For product NDCs (9 digits), search directly
			const normalized = normalizeNdc(ndc);
			console.error(`📐 [FDA] normalizeNdc() result: "${normalized}"`);
			
			// Strategy: Try searching with UNNORMALIZED NDC first (as FDA might store it without padding)
			// If that fails, try with normalized/padded version
			let productNdcToSearch: string;
			let productNdcToSearchFallback: string | null = null;
			
			// First, try extracting product NDC from the ORIGINAL input (without normalization)
			const parts = ndc.trim().replace(/\s/g, '').split('-');
			console.error(`🔍 [FDA] Original NDC parts: ${JSON.stringify(parts)}`);
			console.error(`🔍 [FDA] Part lengths: [${parts[0]?.length}, ${parts[1]?.length}, ${parts[2]?.length}]`);
			console.error(`🔍 [FDA] Parts count: ${parts.length}`);
			
			// Check if this is a valid 3-part NDC format (labeler-product-package)
			// Package code can be 1-2 digits, product can be 3-4 digits, labeler can be 4-5 digits
			const labelerValid = parts.length > 0 && (parts[0].length === 4 || parts[0].length === 5);
			const productValid = parts.length > 1 && (parts[1].length === 3 || parts[1].length === 4);
			const packageValid = parts.length > 2 && (parts[2].length === 1 || parts[2].length === 2);
			const isThreeParts = parts.length === 3;
			
			console.error(`🔍 [FDA] Condition check:`, {
				isThreeParts,
				labelerValid,
				productValid,
				packageValid,
				allValid: isThreeParts && labelerValid && productValid && packageValid
			});
			
			if (isThreeParts && labelerValid && productValid && packageValid) {
				// This looks like a valid NDC with dashes
				// Product NDC is first two parts (labeler-product) WITH THE DASH
				const originalProductNdc = `${parts[0]}-${parts[1]}`;  // Keep dash, no padding
				productNdcToSearch = originalProductNdc;
				console.error(`✅ [FDA] Extracted product NDC from original (with dash, no padding): "${productNdcToSearch}"`);
				
				// Also prepare a fallback with normalized version (padded)
			if (normalized) {
					const normalizedParts = normalized.split('-');
					if (normalizedParts.length === 3) {
						productNdcToSearchFallback = `${normalizedParts[0]}-${normalizedParts[1]}`;
						console.error(`📝 [FDA] Fallback product NDC (normalized, with dash): "${productNdcToSearchFallback}"`);
					}
				}
			} else if (normalized) {
				// Fall back to normalized extraction
				const digitsOnly = normalized.replace(/-/g, '');
				console.error(`🔢 [FDA] Digits only (normalized): "${digitsOnly}" (length: ${digitsOnly.length})`);
				
				if (digitsOnly.length === 11) {
					// This is a package NDC - extract product NDC
					console.error(`📦 [FDA] Detected PACKAGE NDC (11 digits) - extracting product NDC`);
					const extracted = extractProductNdc(ndc);
					console.error(`📦 [FDA] extractProductNdc() result: "${extracted}"`);
					
					if (extracted) {
						productNdcToSearch = normalizeNdcForApi(extracted);
						console.error(`✅ [FDA] Will search using extracted product NDC: "${productNdcToSearch}"`);
						logger.debug(`Extracted product NDC from package NDC: ${ndc} -> ${extracted}`);
					} else {
						productNdcToSearch = normalizedNdc;
						console.error(`⚠️ [FDA] Extraction failed - using normalized NDC: "${productNdcToSearch}"`);
					}
				} else if (digitsOnly.length === 10) {
					// This might be a product NDC with missing leading zero
					console.error(`⚠️ [FDA] Detected 10-digit NDC - likely PRODUCT NDC`);
					productNdcToSearch = normalizedNdc;
				} else {
					// This is a product NDC - search directly
					console.error(`📋 [FDA] Detected PRODUCT NDC (${digitsOnly.length} digits)`);
					productNdcToSearch = normalizedNdc;
				}
			} else {
				console.error(`❌ [FDA] normalizeNdc() returned null - using original normalized: "${normalizedNdc}"`);
				productNdcToSearch = normalizedNdc;
			}

			// Strategy: For package NDCs, try searching by package_ndc first (more precise)
			// If that fails, fall back to product_ndc search
			const normalizedInput = normalizeNdc(ndc);
			const isPackageNdc = normalizedInput && normalizedInput.replace(/-/g, '').length === 11;
			
			let response: FdaApiResponse;
			
			console.error(`🔍 [FDA] isPackageNdc check:`, {
				normalizedInput,
				normalizedInputLength: normalizedInput?.replace(/-/g, '').length,
				isPackageNdc
			});
			
			if (isPackageNdc) {
				// Try searching by package_ndc first (exact match)
				// Generate variants for labeler (4 vs 5 digits) AND product (with/without leading zeros)
				const normalizedWithDashes = normalizeNdc(ndc);
				let packageNdcVariants: string[] = [];
				
				if (normalizedWithDashes) {
					const parts = normalizedWithDashes.split('-');
					if (parts.length === 3) {
						const labeler = parts[0]; // e.g., "00002" or "00046"
						const product = parts[1]; // e.g., "1214" or "0749"
						const package_ = parts[2]; // e.g., "04" or "05"
						
						// Generate labeler variants (4-digit vs 5-digit)
						const labelerVariants: string[] = [labeler];
						if (labeler.length === 5 && labeler.startsWith('0')) {
							labelerVariants.push(labeler.substring(1));
						}
						
						// Generate product variants (with/without leading zeros)
						const productVariants: string[] = [product];
						if (product.startsWith('0')) {
							let stripped = product;
							while (stripped.startsWith('0') && stripped.length > 1) {
								stripped = stripped.substring(1);
								productVariants.push(stripped);
							}
						}
						
						// Generate all combinations of labeler + product + package
						for (const labelerVar of labelerVariants) {
							for (const productVar of productVariants) {
								const variant = `${labelerVar}${productVar}${package_}`;
								packageNdcVariants.push(variant);
							}
						}
					}
				}
				
				if (packageNdcVariants.length === 0) {
					packageNdcVariants.push(normalizeNdcForApi(ndc));
				}
				
				// Remove duplicates
				packageNdcVariants = [...new Set(packageNdcVariants)];
				
				// Try each variant until we get results
				let foundResults = false;
				for (const packageNdcForSearch of packageNdcVariants) {
					const packageSearchQuery = `?search=package_ndc:${packageNdcForSearch}&limit=5`;
					const packageSearchUrl = `${BASE_URL}${packageSearchQuery}`;
					
					console.error(`🔍 [FDA] Trying package NDC variant: "${packageNdcForSearch}"`, {
						packageSearchQuery,
						packageSearchUrl
					});
					
					logger.info(`[FDA] Making API request (package_ndc search variant)`, undefined, {
						url: packageSearchUrl,
						searchTerm: `package_ndc:${packageNdcForSearch}`,
						lookingFor: ndc,
						variant: packageNdcForSearch
					});
					
					response = await makeRequest(packageSearchQuery);
					
					console.error(`📥 [FDA] package_ndc search response (variant "${packageNdcForSearch}"):`, {
						resultsCount: response.results?.length || 0,
						hasError: !!response.error,
						error: response.error
					});
					
					logger.info(`[FDA] package_ndc search response received`, undefined, {
						resultsCount: response.results?.length || 0,
						hasError: !!response.error,
						variant: packageNdcForSearch
					});
					
					// If we got results, stop trying variants
					if (response.results && response.results.length > 0) {
						console.error(`✅ [FDA] Found results with package NDC variant: "${packageNdcForSearch}"`);
						foundResults = true;
						break;
					}
				}
				
				if (!foundResults) {
					response = { results: [] };
				}
				
				// CRITICAL: Verify that package_ndc search returned the EXACT package we're looking for
				if (response.results && response.results.length > 0) {
					// Generate all possible normalized versions to compare against
					const targetPackageVariants = packageNdcVariants;
					console.error(`🔍 [FDA] Looking for exact package match:`, {
						searchedNdc: ndc,
						targetPackageVariants
					});
					
					let exactMatchFound = false;
					const foundPackages: string[] = [];
					
					for (const candidate of response.results) {
						if (candidate.packaging) {
							for (const pkg of candidate.packaging) {
								foundPackages.push(pkg.package_ndc);
								const pkgNormalized = normalizeNdcForApi(pkg.package_ndc);
								
								// Check if package matches any of our target variants
								const matches = targetPackageVariants.some(variant => pkgNormalized === variant);
								
								console.error(`🔍 [FDA] Comparing package:`, {
									pkgPackageNdc: pkg.package_ndc,
									pkgNormalized,
									targetPackageVariants,
									matches
								});
								
								if (matches) {
									exactMatchFound = true;
									console.error(`✅ [FDA] Found exact package match in package_ndc search: ${pkg.package_ndc}`);
									logger.info(`[FDA] Found exact package match in package_ndc search: ${pkg.package_ndc}`, undefined, {
										packageNdc: pkg.package_ndc
									});
									break;
								}
							}
						}
						if (exactMatchFound) break;
					}
					
					if (!exactMatchFound) {
						console.error(`⚠️ [FDA] package_ndc search returned results but NONE contain the exact package "${ndc}"`, {
							searchedNdc: ndc,
							foundPackages,
							targetPackageVariants
						});
						logger.warn(`[FDA] package_ndc search returned results but NONE contain the exact package "${ndc}"`, undefined, {
							searchedNdc: ndc,
							foundPackages
						});
						response = { results: [] };
					}
				}
				
				// If package_ndc search returns no results or no exact match, fall back to product_ndc search
				if (!response.results || response.results.length === 0) {
					console.error(`⚠️ [FDA] package_ndc search failed, trying product_ndc search`, {
						ndc,
						productNdcToSearch
					});
					logger.info(`[FDA] package_ndc search failed, trying product_ndc search`, undefined, {
						ndc,
						productNdcToSearch
					});
					
					// Generate all labeler format variants to try
					const productNdcVariants = generateLabelerFormatVariants(productNdcToSearch);
					if (productNdcToSearchFallback && productNdcToSearchFallback !== productNdcToSearch) {
						productNdcVariants.push(...generateLabelerFormatVariants(productNdcToSearchFallback));
					}
					const uniqueVariants = [...new Set(productNdcVariants)];
					
					console.error(`🔍 [FDA] Trying product NDC variants:`, uniqueVariants);
					
					// Try each variant until we get results
					for (const variant of uniqueVariants) {
						const productSearchQuery = `?search=product_ndc:${variant}&limit=5`;
						const productSearchUrl = `${BASE_URL}${productSearchQuery}`;
						
						console.error(`🔍 [FDA] Product NDC search (variant):`, {
							variant,
							productSearchQuery,
							productSearchUrl
						});
						
						logger.info(`[FDA] Making API request (product_ndc search variant)`, undefined, {
							url: productSearchUrl,
							searchTerm: `product_ndc:${variant}`
						});
						
						response = await makeRequest(productSearchQuery);
						
						console.error(`📥 [FDA] product_ndc search response (variant "${variant}"):`, {
							resultsCount: response.results?.length || 0,
							hasError: !!response.error,
							error: response.error
						});
						
						logger.info(`[FDA] product_ndc search response received`, undefined, {
							resultsCount: response.results?.length || 0,
							variant
						});
						
						// If we got results, stop trying variants
						if (response.results && response.results.length > 0) {
							console.error(`✅ [FDA] Found results with variant: "${variant}"`);
							break;
						}
					}
				}
			} else {
				// For product NDCs, search by product_ndc
				// Generate all labeler format variants to try
				const productNdcVariants = generateLabelerFormatVariants(productNdcToSearch);
				if (productNdcToSearchFallback && productNdcToSearchFallback !== productNdcToSearch) {
					productNdcVariants.push(...generateLabelerFormatVariants(productNdcToSearchFallback));
				}
				const uniqueVariants = [...new Set(productNdcVariants)];
				
				console.error(`\n🌐 [FDA] Making API request (product_ndc search):`);
				console.error(`   Trying variants: ${uniqueVariants.join(', ')}`);
				
				logger.debug(`Searching for NDC: ${ndc}, using product NDC variants: ${uniqueVariants.join(', ')}`);
				
				// Try each variant until we get results
				for (const variant of uniqueVariants) {
					const searchQuery = `?search=product_ndc:${variant}&limit=5`;
					const fullUrl = `${BASE_URL}${searchQuery}`;
					
					console.error(`   Trying variant: "${variant}"`);
					console.error(`   URL: ${fullUrl}`);
					
					response = await makeRequest(searchQuery);
					
					console.error(`   Response: ${response.results?.length || 0} results`);
					
					// If we got results, stop trying variants
					if (response.results && response.results.length > 0) {
						console.error(`✅ [FDA] Found results with variant: "${variant}"`);
						break;
					}
				}
			}

			console.error(`📥 [FDA] Final API response received:`, {
				resultsCount: response.results?.length || 0,
				hasError: !!response.error,
				error: response.error,
				meta: response.meta
			});
			
			logger.info(`[FDA] Final API response received`, undefined, {
				resultsCount: response.results?.length || 0,
				hasError: !!response.error,
				error: response.error,
				meta: response.meta
			});

			if (!response.results || response.results.length === 0) {
				console.error(`❌ [FDA] NO RESULTS FOUND for NDC: "${ndc}"`, {
					ndc,
					searchedWith: productNdcToSearch,
					productNdcToSearchFallback,
					cacheKey
				});
				logger.warn(`[FDA] NO RESULTS FOUND for NDC: "${ndc}"`, undefined, {
					ndc,
					searchedWith: productNdcToSearch,
					cacheKey
				});
				
				// Cache null result to avoid repeated API calls
				await cache.set(cacheKey, null as unknown as FdaPackageDetails, FDA_PACKAGE_TTL);
				return null;
			}

			// Find matching package in the packaging array
			// CRITICAL: Verify the product NDC matches EXACTLY what we searched for
			// (FDA API might return similar products if exact match not found)
			let result: FdaPackageResult | null = null;
			
			// For package NDC searches, we MUST find the exact package in the results
			let exactPackageInfo: { package_ndc: string; description: string } | null = null;
			if (isPackageNdc) {
				const targetPackageNormalized = normalizeNdcForApi(ndc);
				const targetPackageOriginal = ndc.trim();
				
				logger.info(`[FDA] Searching for EXACT package NDC: "${ndc}"`, undefined, {
					ndc,
					normalized: targetPackageNormalized,
					original: targetPackageOriginal
				});
				
				// Search through all results to find the exact package
				let foundExactPackage = false;
				console.error(`🔍 [FDA] Searching through ${response.results.length} results for exact package match`);
				for (const candidate of response.results) {
					console.error(`🔍 [FDA] Checking candidate product: ${candidate.product_ndc}`, {
						hasPackaging: !!candidate.packaging,
						packagingCount: candidate.packaging?.length || 0
					});
					if (candidate.packaging) {
						for (const pkg of candidate.packaging) {
							const pkgNormalized = normalizeNdcForApi(pkg.package_ndc);
							const pkgOriginal = pkg.package_ndc.trim();
							
							// Check both normalized and original formats
							const normalizedMatch = pkgNormalized === targetPackageNormalized;
							const originalMatch = pkgOriginal === targetPackageOriginal;
							
							console.error(`🔍 [FDA] Checking package: "${pkg.package_ndc}"`, {
								pkgNormalized,
								targetNormalized: targetPackageNormalized,
								normalizedMatch,
								pkgOriginal,
								targetOriginal: targetPackageOriginal,
								originalMatch,
								willMatch: normalizedMatch || originalMatch
							});
							
							logger.debug(`[FDA] Checking package: "${pkg.package_ndc}"`, undefined, {
								pkgNormalized,
								targetNormalized: targetPackageNormalized,
								normalizedMatch,
								pkgOriginal,
								targetOriginal: targetPackageOriginal,
								originalMatch
							});
							
							if (normalizedMatch || originalMatch) {
								result = candidate;
								exactPackageInfo = { package_ndc: pkg.package_ndc, description: pkg.description };
								foundExactPackage = true;
								console.error(`✅ [FDA] Found EXACT package match: ${pkg.package_ndc} in product ${candidate.product_ndc}`);
								logger.info(`[FDA] Found EXACT package match: ${pkg.package_ndc} in product ${candidate.product_ndc}`, undefined, {
									packageNdc: pkg.package_ndc,
									productNdc: candidate.product_ndc
								});
								break;
							}
						}
					}
					if (foundExactPackage) break;
				}
				
				if (!foundExactPackage || !result || !exactPackageInfo) {
					const availableProducts = response.results.map(r => r.product_ndc);
					const availablePackages = response.results.flatMap(r => 
						r.packaging ? r.packaging.map(p => `${r.product_ndc}: ${p.package_ndc}`) : []
					);
					
					console.error(`❌ [FDA] EXACT package "${ndc}" not found in any results`, {
						searchedNdc: ndc,
						targetPackageNormalized,
						targetPackageOriginal,
						availableProducts,
						availablePackages,
						resultsCount: response.results.length
					});
					
					logger.warn(`[FDA] EXACT package "${ndc}" not found in any results`, undefined, {
						searchedNdc: ndc,
						availableProducts,
						availablePackages
					});
					
					await cache.set(cacheKey, null as unknown as FdaPackageDetails, FDA_PACKAGE_TTL);
					return null;
				}
			} else {
				// For product NDC searches, verify product matches exactly
				for (const candidate of response.results) {
					// Compare both normalized (no dashes) AND original format
					const candidateProductNormalized = normalizeNdcForApi(candidate.product_ndc);
					const searchedProductNormalized = normalizeNdcForApi(productNdcToSearch);
					
					// Also check if the original formats match (handles leading zero differences)
					const candidateProductOriginal = candidate.product_ndc.trim();
					const searchedProductOriginal = productNdcToSearch.trim();
					
					if (candidateProductNormalized === searchedProductNormalized || candidateProductOriginal === searchedProductOriginal) {
						result = candidate;
						logger.info(`[FDA] Found result with matching product NDC: ${candidate.product_ndc}`, undefined, {
							productNdc: candidate.product_ndc
						});
						break;
					} else {
						logger.debug(`[FDA] Skipping result - product NDC mismatch`, undefined, {
							candidate: candidate.product_ndc,
							candidateNormalized: candidateProductNormalized,
							searched: productNdcToSearch,
							searchedNormalized: searchedProductNormalized
						});
					}
				}
				
				// If no exact product match, try fallback product NDC
				if (!result && productNdcToSearchFallback) {
					for (const candidate of response.results) {
						const candidateProductNormalized = normalizeNdcForApi(candidate.product_ndc);
						const fallbackProductNormalized = normalizeNdcForApi(productNdcToSearchFallback);
						
						if (candidateProductNormalized === fallbackProductNormalized) {
							result = candidate;
							logger.info(`[FDA] Found result with matching fallback product NDC: ${candidate.product_ndc}`, undefined, {
								productNdc: candidate.product_ndc
							});
							break;
						}
					}
				}
				
				if (!result) {
					const availableProducts = response.results.map(r => r.product_ndc);
					logger.warn(`[FDA] No result with matching product NDC found`, undefined, {
						searched: productNdcToSearch,
						fallback: productNdcToSearchFallback,
						availableProducts
					});
					
					await cache.set(cacheKey, null as unknown as FdaPackageDetails, FDA_PACKAGE_TTL);
					return null;
				}
			}
			
			logger.info(`[FDA] Processing matched result`, undefined, {
				productNdc: result.product_ndc,
				genericName: result.generic_name,
				brandName: result.brand_name,
				packagingCount: result.packaging?.length || 0,
				packageNdcs: result.packaging?.map(p => p.package_ndc) || []
			});
			
			// Use the exact package we found, or try to find it via mapToPackageDetails
			let packageDetails: FdaPackageDetails | null = null;
			if (exactPackageInfo) {
				// We already found the exact package - use it directly
				logger.info(`[FDA] Using pre-validated exact package: ${exactPackageInfo.package_ndc}`, undefined, {
					packageNdc: exactPackageInfo.package_ndc
				});
				packageDetails = mapPackageInfoToDetails(result, exactPackageInfo);
			} else {
				// For product NDC searches, try to find the package
				packageDetails = mapToPackageDetails(result, ndc);
			}

			// For package NDC searches, we should have already found the exact package above
			// Only do fallback matching for product NDC searches
			if (!packageDetails && result.packaging && result.packaging.length > 0 && !isPackageNdc) {
				logger.info(`[FDA] Exact package match not found for product NDC search, trying normalized comparison`, undefined, {
					ndc
				});
				
				// Try to find a package that matches when both are normalized
				const targetNormalized = normalizeNdcForApi(ndc);
				const matchingPkg = result.packaging.find((pkg) => {
					const pkgNormalized = normalizeNdcForApi(pkg.package_ndc);
					return pkgNormalized === targetNormalized;
				});
				
				if (matchingPkg) {
					logger.info(`[FDA] Found match after normalization: ${matchingPkg.package_ndc}`, undefined, {
						packageNdc: matchingPkg.package_ndc
					});
					packageDetails = mapPackageInfoToDetails(result, matchingPkg);
				} else {
					// For product NDC searches, it's OK to return first package if no exact match
					// (user searched by product, not specific package)
					logger.info(`[FDA] No normalized match found - using first package from product`, undefined, {
						firstPackage: result.packaging[0].package_ndc
					});
					packageDetails = mapPackageInfoToDetails(result, result.packaging[0]);
				}
			}

			if (!packageDetails) {
				logger.warn(`[FDA] mapToPackageDetails() returned NULL`, undefined, {
					ndc,
					availablePackages: result.packaging?.map(p => p.package_ndc) || []
				});
				
				await cache.set(cacheKey, null as unknown as FdaPackageDetails, FDA_PACKAGE_TTL);
				return null;
			}

			// FINAL VERIFICATION: Ensure the returned package matches the exact NDC we searched for
			const returnedPackageNormalized = normalizeNdcForApi(packageDetails.package_ndc);
			const searchedPackageNormalized = normalizeNdcForApi(ndc);
			const returnedOriginal = packageDetails.package_ndc.trim();
			const searchedOriginal = ndc.trim();
			
			const normalizedMatch = returnedPackageNormalized === searchedPackageNormalized;
			const originalMatch = returnedOriginal === searchedOriginal;
			
			if (!normalizedMatch && !originalMatch) {
				logger.error(`[FDA] CRITICAL ERROR: Returned package does not match searched NDC!`, undefined, {
					searched: ndc,
					returned: packageDetails.package_ndc,
					searchedNormalized: searchedPackageNormalized,
					returnedNormalized: returnedPackageNormalized,
					searchedOriginal,
					returnedOriginal,
					normalizedMatch,
					originalMatch
				});
				
				await cache.set(cacheKey, null as unknown as FdaPackageDetails, FDA_PACKAGE_TTL);
				return null;
			}

			logger.info(`[FDA] SUCCESS - Package details found and verified!`, undefined, {
				searchedNdc: ndc,
				returnedNdc: packageDetails.package_ndc,
				productNdc: packageDetails.product_ndc,
				active: packageDetails.active,
				manufacturer: packageDetails.manufacturer_name,
				verified: true
			});

			// Cache result
			await cache.set(cacheKey, packageDetails, FDA_PACKAGE_TTL);

			return packageDetails;
		} catch (error) {
			logger.error(`[FDA] EXCEPTION in getPackageDetails()`, error as Error, {
				ndc,
				errorMessage: error instanceof Error ? error.message : String(error)
			});
			throw error;
		}
	});
}

/**
 * Get all packages for a product NDC.
 * @param productNdc - Product NDC (without package code)
 * @returns Array of package details
 */
export async function getAllPackages(productNdc: string): Promise<FdaPackageDetails[]> {
	// FDA API requires dashes in product_ndc searches, so preserve the original format
	// Try with dashes first, then fallback to normalized if needed
	const productNdcWithDashes = productNdc.includes('-') ? productNdc : 
		productNdc.length === 9 ? `${productNdc.substring(0, 5)}-${productNdc.substring(5)}` : productNdc;
	
	const normalizedNdc = normalizeNdcForApi(productNdc);
	const cacheKey = fdaPackagesKey(normalizedNdc);

	return deduplicate(cacheKey, async () => {
		// Check cache
		const cached = await cache.get<FdaPackageDetails[]>(cacheKey);
		if (cached) {
			logger.debug(`FDA packages cache hit: ${productNdc}`);
			return cached;
		}

		// Make API call - try with dashes first (FDA API format)
		try {
			console.error(`🔍 [FDA getAllPackages] Searching for product NDC: "${productNdcWithDashes}" (original: "${productNdc}")`);
			let response = await makeRequest(`?search=product_ndc:"${productNdcWithDashes}"&limit=100`);
			
			// If no results with dashes, try without dashes (normalized)
			if (!response.results || response.results.length === 0) {
				console.error(`⚠️ [FDA getAllPackages] No results with dashes, trying normalized: "${normalizedNdc}"`);
				response = await makeRequest(`?search=product_ndc:${normalizedNdc}&limit=100`);
			}

			if (!response.results || response.results.length === 0) {
				logger.info(`No packages found for product NDC: ${productNdc}`);
				// Cache empty array
				await cache.set(cacheKey, [], FDA_PACKAGE_TTL);
				return [];
			}

			// Map all packages from all results
			const packages: FdaPackageDetails[] = [];
			for (const result of response.results) {
				if (result.packaging) {
					for (const pkg of result.packaging) {
						const packageDetails = mapToPackageDetails(result, pkg.package_ndc);
						if (packageDetails) {
							packages.push(packageDetails);
						}
					}
				}
			}

			logger.info(`Found ${packages.length} packages for product NDC: ${productNdc}`);

			// Cache result
			await cache.set(cacheKey, packages, FDA_PACKAGE_TTL);

			return packages;
		} catch (error) {
			logger.error(`Error getting packages for product NDC: ${productNdc}`, error as Error);
			throw error;
		}
	});
}

/**
 * Get generic name from RxCUI using RxNorm API.
 * This is used as a fallback when FDA openfda.rxcui search fails.
 */
async function getGenericNameFromRxcui(rxcui: string): Promise<string | null> {
	try {
		const response = await fetch(`https://rxnav.nlm.nih.gov/REST/rxcui/${rxcui}/properties.json`);
		if (!response.ok) {
			return null;
		}
		const data = await response.json();
		return data.properties?.name || null;
	} catch (error) {
		logger.warn(`Error getting generic name for RxCUI ${rxcui}`, error as Error);
		return null;
	}
}

/**
 * Get all packages for a given RxCUI.
 * Uses FDA API search by openfda.rxcui to find all NDCs associated with the RxCUI.
 * Falls back to generic_name search if openfda.rxcui search fails.
 * @param rxcui - RxCUI identifier
 * @returns Array of package details
 */
export async function getPackagesByRxcui(rxcui: string): Promise<FdaPackageDetails[]> {
	const cacheKey = `fda:rxcui:${rxcui}`;

	return deduplicate(cacheKey, async () => {
		// Check cache
		const cached = await cache.get<FdaPackageDetails[]>(cacheKey);
		if (cached) {
			logger.debug(`FDA RxCUI cache hit: ${rxcui}`);
			return cached;
		}

		// Make API call - try openfda.rxcui first
		try {
			const endpoint = `?search=openfda.rxcui:${rxcui}&limit=100`;
			process.stderr.write(`🌐 [FDA] Fetching packages for RxCUI: ${rxcui}, endpoint: ${endpoint}\n`);
			console.error(`🌐 [FDA] Fetching packages for RxCUI: ${rxcui}`, { endpoint });
			logger.info(`Fetching packages for RxCUI: ${rxcui}`, { endpoint });
			let response = await makeRequest(endpoint);

			process.stderr.write(`📥 [FDA] API response for RxCUI ${rxcui}: results=${response.results?.length || 0}, hasError=${!!response.error}\n`);
			console.error(`📥 [FDA] API response for RxCUI ${rxcui}:`, {
				resultsCount: response.results?.length || 0,
				meta: response.meta,
				hasError: !!response.error,
				error: response.error,
			});
			logger.info(`FDA API response for RxCUI ${rxcui}:`, {
				resultsCount: response.results?.length || 0,
				meta: response.meta,
			});

			// If no results (either empty or error), try fallback to generic_name search
			if (!response.results || response.results.length === 0) {
				process.stderr.write(`⚠️ [FDA] openfda.rxcui search returned no results, trying generic_name fallback for RxCUI: ${rxcui}\n`);
				console.error(`⚠️ [FDA] openfda.rxcui search returned no results, trying generic_name fallback for RxCUI: ${rxcui}`, {
					hasError: !!response.error,
					error: response.error,
				});
				logger.warn(`openfda.rxcui search returned no results, trying generic_name fallback for RxCUI: ${rxcui}`);
				
				// Get generic name from RxNorm
				const genericName = await getGenericNameFromRxcui(rxcui);
				process.stderr.write(`🔄 [FDA] Generic name lookup result: ${genericName || 'NOT FOUND'}\n`);
				if (genericName) {
					// Extract base ingredient name (first word, lowercase for case-insensitive matching)
					const baseIngredient = genericName.toLowerCase().split(/\s+/)[0];
					
					// Try multiple search strategies
					const searchStrategies = [
						// Strategy 1: Try exact generic name (case-insensitive)
						`generic_name:${encodeURIComponent(genericName)}`,
						// Strategy 2: Try base ingredient name only (more likely to match)
						`generic_name:${encodeURIComponent(baseIngredient)}`,
					];
					
					for (const searchTerm of searchStrategies) {
						process.stderr.write(`🔄 [FDA] Trying generic_name fallback: ${searchTerm}\n`);
						console.error(`🔄 [FDA] Trying generic_name fallback: ${searchTerm}`);
						const fallbackEndpoint = `?search=${searchTerm}&limit=100`;
						const fallbackResponse = await makeRequest(fallbackEndpoint);
						
						// Validate results: ensure they match the expected drug
						if (fallbackResponse.results && fallbackResponse.results.length > 0) {
							const baseIngredientLower = baseIngredient.toLowerCase();
							const validResults = fallbackResponse.results.filter((result: FdaPackageResult) => {
								const resultGenericName = (result.generic_name || '').toLowerCase();
								// Check if generic name contains the base ingredient
								return resultGenericName.includes(baseIngredientLower);
							});
							
							if (validResults.length > 0) {
								process.stderr.write(`✅ [FDA] Found ${validResults.length} valid results with search: ${searchTerm}\n`);
								console.error(`✅ [FDA] Found ${validResults.length} valid results with search: ${searchTerm}`);
								response = { ...fallbackResponse, results: validResults };
								break;
							} else {
								process.stderr.write(`⚠️ [FDA] Search returned results but none matched expected drug (${baseIngredient})\n`);
								console.error(`⚠️ [FDA] Search returned results but none matched expected drug (${baseIngredient})`);
							}
						}
					}
					
					process.stderr.write(`📥 [FDA] Final fallback API response: results=${response.results?.length || 0}\n`);
					console.error(`📥 [FDA] Final fallback API response:`, {
						resultsCount: response.results?.length || 0,
						meta: response.meta,
						hasError: !!response.error,
						error: response.error,
					});
				} else {
					process.stderr.write(`⚠️ [FDA] Could not get generic name for RxCUI ${rxcui}\n`);
					console.error(`⚠️ [FDA] Could not get generic name for RxCUI ${rxcui}`);
				}
			}

			if (!response.results || response.results.length === 0) {
				process.stderr.write(`⚠️ [FDA] No packages found for RxCUI: ${rxcui} after all attempts\n`);
				console.error(`⚠️ [FDA] No packages found for RxCUI: ${rxcui}`, {
					responseMeta: response.meta,
					hasError: !!response.error,
					error: response.error,
				});
				logger.warn(`No packages found for RxCUI: ${rxcui}`, {
					responseMeta: response.meta,
					hasError: !!response.error,
					error: response.error,
				});
				// Cache empty array
				await cache.set(cacheKey, [], FDA_PACKAGE_TTL);
				return [];
			}

			// Map all packages from all results
			const packages: FdaPackageDetails[] = [];
			let totalPackagingEntries = 0;
			let skippedNoPackaging = 0;
			let skippedMappingFailed = 0;

			for (const result of response.results) {
				logger.debug(`Processing result for product_ndc: ${result.product_ndc}`, {
					hasPackaging: !!result.packaging,
					packagingCount: result.packaging?.length || 0,
					expirationDate: result.listing_expiration_date,
					dosageForm: result.dosage_form,
					finished: result.finished,
				});

				if (!result.packaging || result.packaging.length === 0) {
					skippedNoPackaging++;
					logger.debug(`Skipping result - no packaging array for product_ndc: ${result.product_ndc}`);
					continue;
				}

				totalPackagingEntries += result.packaging.length;

					for (const pkg of result.packaging) {
					try {
						const packageDetails = mapPackageInfoToDetails(result, {
							package_ndc: pkg.package_ndc,
							description: pkg.description,
						});
						logger.debug(`Mapped package: ${pkg.package_ndc}`, {
							active: packageDetails.active,
							description: packageDetails.package_description,
							expirationDate: result.listing_expiration_date,
						});
							packages.push(packageDetails);
					} catch (error) {
						skippedMappingFailed++;
						logger.warn(`Failed to map package: ${pkg.package_ndc}`, {
							packageNdc: pkg.package_ndc,
							productNdc: result.product_ndc,
							description: pkg.description,
							error: error instanceof Error ? error.message : String(error),
						});
					}
				}
			}

			console.log(`✅ [FDA] Package mapping summary for RxCUI ${rxcui}:`, {
				totalResults: response.results.length,
				totalPackagingEntries,
				successfullyMapped: packages.length,
				skippedNoPackaging,
				skippedMappingFailed,
				activeCount: packages.filter((p) => p.active).length,
				inactiveCount: packages.filter((p) => !p.active).length,
			});
			logger.info(`Package mapping summary for RxCUI ${rxcui}:`, {
				totalResults: response.results.length,
				totalPackagingEntries,
				successfullyMapped: packages.length,
				skippedNoPackaging,
				skippedMappingFailed,
				activeCount: packages.filter((p) => p.active).length,
				inactiveCount: packages.filter((p) => !p.active).length,
			});

			// Cache result
			await cache.set(cacheKey, packages, FDA_PACKAGE_TTL);

			return packages;
		} catch (error) {
			logger.error(`Error getting packages for RxCUI: ${rxcui}`, error as Error);
			throw error;
		}
	});
}

/**
 * Get autocomplete suggestions for a partial NDC code.
 * Uses FDA API with wildcard search to find matching NDC codes.
 * @param query - Partial NDC code query (minimum 2-3 digits recommended)
 * @returns Array of suggested NDC codes with drug names (limited to 20)
 */
export async function getNdcAutocompleteSuggestions(query: string): Promise<string[]> {
	const trimmedQuery = query.trim();
	
	// Don't search for very short queries (less than 2 characters)
	if (trimmedQuery.length < 2) {
		return [];
	}

	// Normalize query: remove dashes for API search
	const normalizedQuery = trimmedQuery.replace(/-/g, '');
	
	// Only search if we have at least 2 digits
	if (!/^\d+$/.test(normalizedQuery)) {
		return [];
	}

	const cacheKey = fdaNdcAutocompleteKey(trimmedQuery);

	return deduplicate(cacheKey, async () => {
		// Check cache
		const cached = await cache.get<string[]>(cacheKey);
		if (cached) {
			logger.debug(`FDA NDC autocomplete cache hit: ${trimmedQuery}`);
			return cached;
		}

		try {
			// Use wildcard search for prefix matching
			// Search both product_ndc and package_ndc to get comprehensive results
			const searchQueries = [
				`?search=product_ndc:${normalizedQuery}*&limit=50`,
				`?search=package_ndc:${normalizedQuery}*&limit=50`
			];

			const suggestions = new Set<string>();

			// Search both product_ndc and package_ndc in parallel
			const searchPromises = searchQueries.map(async (searchQuery) => {
				try {
					const response = await makeRequest(searchQuery);
					
					if (response.results && response.results.length > 0) {
						response.results.forEach((result) => {
							// Add product NDC
							if (result.product_ndc) {
								const normalized = normalizeNdc(result.product_ndc);
								if (normalized) {
									// Format: "NDC - Drug Name" if available
									const drugName = result.generic_name || result.brand_name || '';
									const displayText = drugName 
										? `${normalized} - ${drugName}` 
										: normalized;
									suggestions.add(displayText);
								}
							}

							// Add package NDCs
							if (result.packaging) {
								result.packaging.forEach((pkg) => {
									if (pkg.package_ndc) {
										const normalized = normalizeNdc(pkg.package_ndc);
										if (normalized) {
											const drugName = result.generic_name || result.brand_name || '';
											const displayText = drugName 
												? `${normalized} - ${drugName}` 
												: normalized;
											suggestions.add(displayText);
										}
									}
								});
							}
						});
					}
				} catch (error) {
					logger.debug(`FDA NDC autocomplete search failed for: ${searchQuery}`, error as Error);
					// Don't throw - continue with other search
				}
			});

			await Promise.all(searchPromises);

			// Convert to array, sort, and limit to 20
			const suggestionsArray = Array.from(suggestions)
				.sort()
				.slice(0, 20);

			logger.debug(`FDA NDC autocomplete returned ${suggestionsArray.length} suggestions for: ${trimmedQuery}`);

			// Cache result (24 hours TTL, same as FDA package details)
			await cache.set(cacheKey, suggestionsArray, FDA_PACKAGE_TTL);

			return suggestionsArray;
		} catch (error) {
			logger.error(`Error getting NDC autocomplete suggestions for: ${trimmedQuery}`, error as Error);
			// Return empty array on error (don't expose error details)
			return [];
		}
	});
}

