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
	});

	return {
		product_ndc: result.product_ndc,
		package_ndc: packageInfo.package_ndc,
		package_description: packageInfo.description,
		active: active,
		manufacturer_name: result.labeler_name || result.openfda?.manufacturer_name?.[0] || 'Unknown',
		dosage_form: result.dosage_form || 'Unknown',
		rxcui: result.openfda?.rxcui,
		strength: result.active_ingredients?.[0]?.strength
	};
}

/**
 * Map FDA API result to FdaPackageDetails.
 * Used when we need to find a specific package by NDC.
 */
function mapToPackageDetails(result: FdaPackageResult, packageNdc: string): FdaPackageDetails | null {
	if (!result.packaging || result.packaging.length === 0) {
		logger.debug(`mapToPackageDetails: No packaging array for packageNdc: ${packageNdc}`);
		return null;
	}

	// Find the specific package
	const packageInfo = result.packaging.find((pkg) => {
		const normalizedPkg = normalizeNdcForApi(pkg.package_ndc);
		const normalizedTarget = normalizeNdcForApi(packageNdc);
		const matches = normalizedPkg === normalizedTarget;
		if (!matches) {
			logger.debug(`mapToPackageDetails: NDC mismatch`, {
				packageNdc,
				pkgNdc: pkg.package_ndc,
				normalizedPkg,
				normalizedTarget,
			});
		}
		return matches;
	});

	if (!packageInfo) {
		logger.warn(`mapToPackageDetails: Package not found in packaging array`, {
			packageNdc,
			productNdc: result.product_ndc,
			availablePackages: result.packaging.map((p) => p.package_ndc),
		});
		return null;
	}

	return mapPackageInfoToDetails(result, packageInfo);
}

/**
 * Get package details for a specific NDC.
 * @param ndc - NDC (product or package NDC)
 * @returns Package details or null if not found
 */
export async function getPackageDetails(ndc: string): Promise<FdaPackageDetails | null> {
	const normalizedNdc = normalizeNdcForApi(ndc);
	const cacheKey = fdaPackageKey(normalizedNdc);

	return deduplicate(cacheKey, async () => {
		// Check cache
		const cached = await cache.get<FdaPackageDetails>(cacheKey);
		if (cached) {
			logger.debug(`FDA cache hit: ${ndc}`);
			return cached;
		}

		// Make API call
		try {
			const response = await makeRequest(`?search=product_ndc:${normalizedNdc}&limit=5`);

			if (!response.results || response.results.length === 0) {
				logger.info(`Package not found: ${ndc}`);
				// Cache null result to avoid repeated API calls
				await cache.set(cacheKey, null as unknown as FdaPackageDetails, FDA_PACKAGE_TTL);
				return null;
			}

			// Find matching package
			const result = response.results[0];
			const packageDetails = mapToPackageDetails(result, ndc);

			if (!packageDetails) {
				logger.info(`Package details not found for NDC: ${ndc}`);
				await cache.set(cacheKey, null as unknown as FdaPackageDetails, FDA_PACKAGE_TTL);
				return null;
			}

			logger.info(`Found package details for NDC: ${ndc}`);

			// Cache result
			await cache.set(cacheKey, packageDetails, FDA_PACKAGE_TTL);

			return packageDetails;
		} catch (error) {
			logger.error(`Error getting package details for NDC: ${ndc}`, error as Error);
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
	const normalizedNdc = normalizeNdcForApi(productNdc);
	const cacheKey = fdaPackagesKey(normalizedNdc);

	return deduplicate(cacheKey, async () => {
		// Check cache
		const cached = await cache.get<FdaPackageDetails[]>(cacheKey);
		if (cached) {
			logger.debug(`FDA packages cache hit: ${productNdc}`);
			return cached;
		}

		// Make API call
		try {
			const response = await makeRequest(`?search=product_ndc:${normalizedNdc}&limit=100`);

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
					process.stderr.write(`🔄 [FDA] Using generic_name fallback: ${genericName}\n`);
					console.error(`🔄 [FDA] Using generic_name fallback: ${genericName}`);
					const fallbackEndpoint = `?search=generic_name:${encodeURIComponent(genericName.toUpperCase())}&limit=100`;
					response = await makeRequest(fallbackEndpoint);
					
					process.stderr.write(`📥 [FDA] Fallback API response: results=${response.results?.length || 0}\n`);
					console.error(`📥 [FDA] Fallback API response:`, {
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

