/**
 * RxNorm API service wrapper.
 * Provides drug name normalization, NDC lookup, and related functionality.
 */

import { logger } from '$lib/utils/logger.js';
import { withRetry } from '$lib/utils/retry.js';
import { cache } from './cache.js';
import { deduplicate } from '$lib/utils/requestDeduplicator.js';
import { rxnormNameKey, rxnormNdcsKey } from '$lib/constants/cacheKeys.js';
import { RXNORM_NAME_TTL as NAME_TTL, RXNORM_NDCS_TTL as NDC_TTL } from '$lib/constants/cacheTtl.js';

const BASE_URL = 'https://rxnav.nlm.nih.gov/REST';
const TIMEOUT_MS = 10000; // 10 seconds

/**
 * RxNorm API response types.
 */
interface RxNormIdGroup {
	idGroup?: {
		rxnormId?: string[];
	};
}

interface RxNormNdcGroup {
	ndcGroup?: {
		ndc?: string[];
	};
}

interface RxNormPropertyResponse {
	propertyConceptGroup?: {
		propertyConcept?: Array<{
			propName?: string;
			propValue?: string;
		}>;
	};
}

interface RxNormSuggestionResponse {
	suggestionGroup?: {
		suggestionList?: {
			suggestion?: string[];
		};
	};
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
 * Make request to RxNorm API with retry logic.
 */
async function makeRequest<T>(endpoint: string): Promise<T> {
	const url = `${BASE_URL}${endpoint}`;
	logger.debug(`RxNorm API request: ${url}`);

	return withRetry(
		async () => {
			const response = await fetchWithTimeout(url);

			if (!response.ok) {
				if (response.status === 404) {
					// 404 is not an error for RxNorm (drug not found)
					return {} as T;
				}
				throw { status: response.status, message: `HTTP ${response.status}` };
			}

			const data = await response.json();
			return data as T;
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
 * Normalize drug name for cache key.
 */
function normalizeDrugName(drugName: string): string {
	return drugName.toLowerCase().trim();
}

/**
 * Search for RxCUI by drug name.
 * @param drugName - Drug name to search
 * @returns RxCUI string or null if not found
 */
export async function searchByDrugName(drugName: string): Promise<string | null> {
	const normalizedName = normalizeDrugName(drugName);
	const cacheKey = rxnormNameKey(normalizedName);

	return deduplicate(cacheKey, async () => {
		// Check cache
		const cached = await cache.get<string>(cacheKey);
		if (cached) {
			logger.debug(`RxNorm cache hit: ${drugName} -> ${cached}`);
			return cached;
		}

		// Make API call
		try {
			const response = await makeRequest<RxNormIdGroup>(`/rxcui.json?name=${encodeURIComponent(drugName)}`);
			const rxnormIds = response.idGroup?.rxnormId;

			if (!rxnormIds || rxnormIds.length === 0) {
				logger.info(`Drug not found: ${drugName}`);
				return null;
			}

			// Use first RxCUI (usually there's only one for exact matches)
			const rxcui = rxnormIds[0];
			logger.info(`Found RxCUI for ${drugName}: ${rxcui}`);

			// Cache result
			await cache.set(cacheKey, rxcui, NAME_TTL);

			return rxcui;
		} catch (error) {
			logger.error(`Error searching for drug: ${drugName}`, error as Error);
			throw error;
		}
	});
}

/**
 * Get all NDCs for an RxCUI.
 * Note: This endpoint is unreliable per Phase 0 findings, but we implement it for completeness.
 * @param rxcui - RxCUI identifier
 * @returns Array of NDC strings (may be empty)
 */
export async function getAllNdcs(rxcui: string): Promise<string[]> {
	const cacheKey = rxnormNdcsKey(rxcui);

	return deduplicate(cacheKey, async () => {
		// Check cache
		const cached = await cache.get<string[]>(cacheKey);
		if (cached) {
			logger.debug(`RxNorm NDCs cache hit: ${rxcui}`);
			return cached;
		}

		// Make API call
		try {
			const response = await makeRequest<RxNormNdcGroup>(`/rxcui/${rxcui}/allndcs.json`);
			const ndcs = response.ndcGroup?.ndc || [];

			logger.info(`Found ${ndcs.length} NDCs for RxCUI ${rxcui}`);

			// Normalize NDCs (remove dashes, ensure consistent format)
			const normalizedNdcs = ndcs.map((ndc) => ndc.replace(/-/g, '').trim()).filter((ndc) => ndc.length > 0);

			// Cache result (even if empty)
			await cache.set(cacheKey, normalizedNdcs, NDC_TTL);

			return normalizedNdcs;
		} catch (error) {
			logger.error(`Error getting NDCs for RxCUI: ${rxcui}`, error as Error);
			throw error;
		}
	});
}

/**
 * Get strength information for an RxCUI.
 * Note: This endpoint is unreliable per Phase 0 findings, but we implement it for completeness.
 * @param rxcui - RxCUI identifier
 * @returns Strength string or null if not found
 */
export async function getStrength(rxcui: string): Promise<string | null> {
	const cacheKey = `rxnorm:strength:${rxcui}`;

	return deduplicate(cacheKey, async () => {
		// Check cache
		const cached = await cache.get<string>(cacheKey);
		if (cached !== null) {
			logger.debug(`RxNorm strength cache hit: ${rxcui}`);
			return cached;
		}

		// Make API call
		try {
			const response = await makeRequest<RxNormPropertyResponse>(
				`/rxcui/${rxcui}/property.json?propName=AVAILABLE_STRENGTH`
			);
			const properties = response.propertyConceptGroup?.propertyConcept;

			if (!properties || properties.length === 0) {
				logger.debug(`No strength found for RxCUI: ${rxcui}`);
				// Cache null result to avoid repeated API calls
				await cache.set(cacheKey, null as unknown as string, NAME_TTL);
				return null;
			}

			const strength = properties[0]?.propValue || null;
			logger.info(`Found strength for RxCUI ${rxcui}: ${strength}`);

			// Cache result
			if (strength) {
				await cache.set(cacheKey, strength, NAME_TTL);
			}

			return strength;
		} catch (error) {
			logger.error(`Error getting strength for RxCUI: ${rxcui}`, error as Error);
			throw error;
		}
	});
}

/**
 * Get spelling suggestions for a drug name.
 * @param drugName - Drug name (potentially misspelled)
 * @returns Array of suggested drug names
 */
export async function getSpellingSuggestions(drugName: string): Promise<string[]> {
	// Don't cache spelling suggestions (they may change)
	try {
		const response = await makeRequest<RxNormSuggestionResponse>(
			`/spellingsuggestions.json?name=${encodeURIComponent(drugName)}`
		);
		const suggestions = response.suggestionGroup?.suggestionList?.suggestion || [];

		logger.info(`Found ${suggestions.length} spelling suggestions for: ${drugName}`);
		return suggestions;
	} catch (error) {
		logger.error(`Error getting spelling suggestions for: ${drugName}`, error as Error);
		// Return empty array on error (don't throw)
		return [];
	}
}

/**
 * Get autocomplete suggestions for a partial drug name.
 * Uses both RxNorm spelling suggestions API and FDA API for comprehensive results.
 * @param query - Partial drug name query (minimum 3 characters)
 * @returns Array of suggested drug names (limited to 20)
 */
export async function getAutocompleteSuggestions(query: string): Promise<string[]> {
	const trimmedQuery = query.trim();
	
	// Don't search for very short queries (less than 3 characters)
	if (trimmedQuery.length < 3) {
		return [];
	}

	const suggestions = new Set<string>();
	const queryUpper = trimmedQuery.toUpperCase();

	// Strategy 1: Try RxNorm spelling suggestions API (fast, no rate limits)
	try {
		const response = await makeRequest<RxNormSuggestionResponse>(
			`/spellingsuggestions.json?name=${encodeURIComponent(trimmedQuery)}`
		);
		const rxnormSuggestions = response.suggestionGroup?.suggestionList?.suggestion || [];
		rxnormSuggestions.forEach(s => suggestions.add(s));
		logger.debug(`RxNorm returned ${rxnormSuggestions.length} suggestions`);
	} catch (error) {
		logger.debug(`RxNorm suggestions failed for: ${trimmedQuery}`, error as Error);
	}

	// Strategy 2: Use FDA API for prefix search (more comprehensive, but has rate limits)
	// Only use if we have fewer than 10 suggestions from RxNorm
	// IMPORTANT: Validate FDA suggestions against RxNorm to ensure they work
	if (suggestions.size < 10) {
		try {
			const fdaUrl = `https://api.fda.gov/drug/ndc.json?search=generic_name:${encodeURIComponent(queryUpper)}*&limit=50`;
			logger.debug(`FDA API request: ${fdaUrl}`);
			
			const fdaResponse = await fetchWithTimeout(fdaUrl, TIMEOUT_MS);
			if (fdaResponse.ok) {
				const fdaData = await fdaResponse.json() as {
					results?: Array<{
						generic_name?: string;
					}>;
				};
				
				if (fdaData.results) {
					// Extract unique generic names that start with the query
					const fdaGenericNames = new Set<string>();
					fdaData.results.forEach((result) => {
						if (result.generic_name) {
							const genericName = result.generic_name.trim();
							// Only add if it starts with the query (case-insensitive)
							if (genericName.toUpperCase().startsWith(queryUpper)) {
								fdaGenericNames.add(genericName);
							}
						}
					});

					// Validate FDA suggestions against RxNorm (only show drugs that RxNorm recognizes)
					// Validate in parallel but limit to first 20 to avoid too many API calls
					const fdaNamesArray = Array.from(fdaGenericNames).slice(0, 20);
					const validationPromises = fdaNamesArray.map(async (genericName) => {
						try {
							const rxcui = await searchByDrugName(genericName);
							if (rxcui) {
								return genericName;
							}
							return null;
						} catch (error) {
							logger.debug(`Validation failed for ${genericName}`, error as Error);
							return null;
						}
					});

					const validatedNames = await Promise.all(validationPromises);
					validatedNames.forEach((name) => {
						if (name) {
							suggestions.add(name);
						}
					});

					logger.debug(`FDA returned ${fdaData.results.length} results, validated ${validatedNames.filter(n => n).length} suggestions`);
				}
			}
		} catch (error) {
			logger.debug(`FDA suggestions failed for: ${trimmedQuery}`, error as Error);
			// Don't throw - FDA is a fallback
		}
	}

	// Convert to array, sort, and limit
	const suggestionsArray = Array.from(suggestions)
		.sort()
		.slice(0, 20); // Increased limit to 20
	
	logger.debug(`Total unique suggestions for "${trimmedQuery}": ${suggestionsArray.length}`);
	return suggestionsArray;
}
