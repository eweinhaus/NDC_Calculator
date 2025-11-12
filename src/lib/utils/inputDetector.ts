/**
 * Input Type Detector Utility
 * Detects whether user input is an NDC code or a drug name
 */

/**
 * Detects the type of input (NDC code or drug name)
 * @param input - User input string
 * @returns 'ndc' if input appears to be an NDC, 'drug' if drug name, 'unknown' if ambiguous
 * @example
 * detectInputType('76420') // Returns 'ndc'
 * detectInputType('00002-3227') // Returns 'ndc'
 * detectInputType('Lisinopril') // Returns 'drug'
 * detectInputType('2mg') // Returns 'drug' (common drug pattern)
 */
export function detectInputType(input: string): 'ndc' | 'drug' | 'unknown' {
	if (!input || typeof input !== 'string') {
		return 'unknown';
	}

	const trimmed = input.trim();
	if (trimmed.length === 0) {
		return 'unknown';
	}

	// Remove whitespace and check first character
	const firstChar = trimmed[0];

	// If starts with a digit (0-9), likely an NDC
	if (/^\d/.test(firstChar)) {
		// Edge case: "2mg", "3ml" etc. are drug names, not NDCs
		// Check if it's a common drug pattern: digit followed by letters (no dashes)
		const drugPattern = /^\d+[a-zA-Z]/.test(trimmed);
		if (drugPattern && !trimmed.includes('-')) {
			return 'drug';
		}
		return 'ndc';
	}

	// If starts with a letter, likely a drug name
	if (/^[a-zA-Z]/.test(firstChar)) {
		return 'drug';
	}

	// If starts with dash or other character, could be partial NDC
	// Check if it contains digits
	if (/\d/.test(trimmed)) {
		// If it has dashes and digits, likely NDC
		if (trimmed.includes('-')) {
			return 'ndc';
		}
	}

	return 'unknown';
}

