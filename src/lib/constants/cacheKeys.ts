/**
 * Cache key generation functions.
 * All keys are normalized to ensure consistent caching.
 */

/**
 * Normalize a string for use in cache keys (lowercase, trim, remove extra spaces).
 */
function normalizeKey(input: string): string {
	return input.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Generate cache key for RxNorm drug name lookup.
 */
export function rxnormNameKey(drugName: string): string {
	return `rxnorm:name:${normalizeKey(drugName)}`;
}

/**
 * Generate cache key for RxNorm NDCs lookup.
 */
export function rxnormNdcsKey(rxcui: string): string {
	return `rxnorm:ndcs:${rxcui}`;
}

/**
 * Generate cache key for FDA package details.
 */
export function fdaPackageKey(ndc: string): string {
	// Normalize NDC: remove dashes, ensure consistent format
	const normalized = ndc.replace(/-/g, '').trim();
	return `fda:package:${normalized}`;
}

/**
 * Generate cache key for FDA all packages lookup.
 */
export function fdaPackagesKey(productNdc: string): string {
	const normalized = productNdc.replace(/-/g, '').trim();
	return `fda:packages:${normalized}`;
}

/**
 * Generate cache key for SIG parsing.
 */
export function sigParseKey(sig: string): string {
	return `sig:parse:${normalizeKey(sig)}`;
}

/**
 * Generate cache key for FDA NDC autocomplete suggestions.
 */
export function fdaNdcAutocompleteKey(query: string): string {
	// Normalize query: remove dashes, lowercase for consistency
	const normalized = query.replace(/-/g, '').toLowerCase().trim();
	return `fda:ndc:autocomplete:${normalized}`;
}

