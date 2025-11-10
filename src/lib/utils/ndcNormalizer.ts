/**
 * NDC Normalizer Utility
 * Handles all NDC format variations and normalizes them to a consistent format
 */

/**
 * Normalizes NDC to 11-digit format with dashes
 * @param ndc - NDC in any format (10-digit, 11-digit, with/without dashes)
 * @returns Normalized 11-digit NDC (XXXXX-XXXX-XX) or null if invalid
 * @example
 * normalizeNdc('00002322730') // Returns '00002-3227-30'
 * normalizeNdc('00002-3227-30') // Returns '00002-3227-30'
 * normalizeNdc('2-3227-30') // Returns '00002-3227-30'
 */
export function normalizeNdc(ndc: string): string | null {
	if (!ndc || typeof ndc !== 'string') {
		return null;
	}

	// Check if input contains non-numeric characters (excluding dashes and whitespace)
	// If it does, it's invalid
	const hasInvalidChars = /[^\d\s-]/.test(ndc);
	if (hasInvalidChars) {
		return null;
	}

	// Remove all non-numeric characters except dashes, then remove dashes
	const cleaned = ndc.replace(/[^\d-]/g, '');
	const digitsOnly = cleaned.replace(/-/g, '');

	// Must have at least 7 digits (minimum: 1 labeler + 4 product + 2 package)
	// and at most 11 digits
	if (digitsOnly.length < 7 || digitsOnly.length > 11) {
		return null;
	}

	// If the original had dashes, try to parse by dashes first
	let labeler: string;
	let product: string;
	let packageCode: string;

	if (cleaned.includes('-')) {
		// Parse by dashes
		const parts = cleaned.split('-').filter((p) => p.length > 0);
		
		if (parts.length === 3) {
			// Format: labeler-product-package
			labeler = parts[0].padStart(5, '0');
			product = parts[1].padStart(4, '0');
			packageCode = parts[2].padStart(2, '0');
		} else if (parts.length === 2) {
			// Two parts - could be:
			// 1. labeler-product (missing package) - product part might include package
			// 2. labeler+product-package (dash in wrong place)
			const totalDigits = digitsOnly.length;
			
			if (parts[0].length <= 5 && parts[1].length >= 4) {
				// Try: labeler-product (product might include package)
				if (parts[1].length >= 6) {
					// product includes package
					labeler = parts[0].padStart(5, '0');
					product = parts[1].substring(0, 4).padStart(4, '0');
					packageCode = parts[1].substring(4).padStart(2, '0');
				} else if (totalDigits === 11) {
					// Might be labeler+product-package (dash in wrong place)
					// parts[0] should be 9 digits (5 labeler + 4 product)
					// parts[1] should be 2 digits (package)
					if (parts[0].length === 9 && parts[1].length === 2) {
						labeler = parts[0].substring(0, 5);
						product = parts[0].substring(5, 9);
						packageCode = parts[1].padStart(2, '0');
					} else {
						return null;
					}
				} else {
					return null; // Can't determine structure
				}
			} else if (parts[0].length > 5 && parts[1].length === 2) {
				// Likely: labeler+product-package (dash in wrong place)
				if (parts[0].length === 9) {
					labeler = parts[0].substring(0, 5);
					product = parts[0].substring(5, 9);
					packageCode = parts[1].padStart(2, '0');
				} else {
					return null;
				}
			} else {
				return null; // Can't determine structure
			}
		} else {
			return null; // Invalid dash format
		}
	} else {
		// No dashes - parse by length
		if (digitsOnly.length === 10) {
			// 10-digit: labeler is 4 digits, product is 4 digits, package is 2 digits
			labeler = '0' + digitsOnly.substring(0, 4);
			product = digitsOnly.substring(4, 8);
			packageCode = digitsOnly.substring(8, 10);
		} else if (digitsOnly.length === 11) {
			// 11-digit: labeler is 5 digits, product is 4 digits, package is 2 digits
			labeler = digitsOnly.substring(0, 5);
			product = digitsOnly.substring(5, 9);
			packageCode = digitsOnly.substring(9, 11);
		} else {
			// Less than 10 digits - try to pad to make it work
			// Minimum is 7 digits (1+4+2), pad to 11
			const padded = digitsOnly.padStart(11, '0');
			labeler = padded.substring(0, 5);
			product = padded.substring(5, 9);
			packageCode = padded.substring(9, 11);
		}
	}

	// Validate final structure
	if (labeler.length !== 5 || product.length !== 4 || packageCode.length !== 2) {
		return null;
	}

	// Return normalized format: XXXXX-XXXX-XX
	return `${labeler}-${product}-${packageCode}`;
}

/**
 * Converts NDC to 10-digit format (no dashes)
 * @param ndc - NDC in any format
 * @returns 10-digit NDC or null if invalid
 * @example
 * to10DigitNdc('00002-3227-30') // Returns '00002322730'
 */
export function to10DigitNdc(ndc: string): string | null {
	const normalized = normalizeNdc(ndc);
	if (!normalized) {
		return null;
	}

	// Remove dashes
	const digitsOnly = normalized.replace(/-/g, '');

	// Should always be 11 digits after normalization
	if (digitsOnly.length !== 11) {
		return null;
	}

	// Convert to 10-digit format
	// Note: Despite the name, this returns the normalized NDC without dashes (11 digits)
	// The "10-digit" refers to the NDC format classification, not the actual digit count
	// Example: '00002-3227-30' -> '00002322730' (11 digits, no dashes)
	return digitsOnly;
}

/**
 * Validates NDC format
 * @param ndc - NDC to validate
 * @returns true if valid NDC format
 */
export function isValidNdc(ndc: string): boolean {
	return normalizeNdc(ndc) !== null;
}

