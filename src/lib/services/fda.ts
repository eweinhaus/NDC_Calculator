/**
 * FDA NDC Directory API service wrapper.
 * Provides package details, active status, and NDC lookups.
 */

import { logger } from '$lib/utils/logger.js';
import { withRetry } from '$lib/utils/retry.js';
import { cache } from './cache.js';
import { deduplicate } from '$lib/utils/requestDeduplicator.js';
import { fdaPackageKey, fdaPackagesKey } from '$lib/constants/cacheKeys.js';
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
		return true; // Assume active if no expiration date
	}

	// Parse YYYYMMDD format
	const year = parseInt(expirationDate.substring(0, 4), 10);
	const month = parseInt(expirationDate.substring(4, 6), 10);
	const day = parseInt(expirationDate.substring(6, 8), 10);
	const expiration = new Date(year, month - 1, day);
	const now = new Date();

	return expiration >= now;
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
					return { results: [] };
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
 * Map FDA API result to FdaPackageDetails.
 */
function mapToPackageDetails(result: FdaPackageResult, packageNdc: string): FdaPackageDetails | null {
	if (!result.packaging || result.packaging.length === 0) {
		return null;
	}

	// Find the specific package
	const packageInfo = result.packaging.find((pkg) => {
		const normalizedPkg = normalizeNdcForApi(pkg.package_ndc);
		const normalizedTarget = normalizeNdcForApi(packageNdc);
		return normalizedPkg === normalizedTarget;
	});

	if (!packageInfo) {
		return null;
	}

	return {
		product_ndc: result.product_ndc,
		package_ndc: packageInfo.package_ndc,
		package_description: packageInfo.description,
		active: isActive(result.listing_expiration_date),
		manufacturer_name: result.labeler_name || result.openfda?.manufacturer_name?.[0] || 'Unknown',
		dosage_form: result.dosage_form || 'Unknown',
		rxcui: result.openfda?.rxcui,
		strength: result.active_ingredients?.[0]?.strength
	};
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
 * Get all packages for a given RxCUI.
 * Uses FDA API search by openfda.rxcui to find all NDCs associated with the RxCUI.
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

		// Make API call
		try {
			const response = await makeRequest(`?search=openfda.rxcui:${rxcui}&limit=100`);

			if (!response.results || response.results.length === 0) {
				logger.info(`No packages found for RxCUI: ${rxcui}`);
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

			logger.info(`Found ${packages.length} packages for RxCUI: ${rxcui}`);

			// Cache result
			await cache.set(cacheKey, packages, FDA_PACKAGE_TTL);

			return packages;
		} catch (error) {
			logger.error(`Error getting packages for RxCUI: ${rxcui}`, error as Error);
			throw error;
		}
	});
}

