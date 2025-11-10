/**
 * Maps API error codes to user-friendly error messages
 */
export function getErrorMessage(code: string): string {
	const errorMessages: Record<string, string> = {
		INVALID_INPUT: 'Please check your input and try again.',
		DRUG_NOT_FOUND: 'Drug not found. Please check the spelling or try a different name.',
		NO_NDCS_FOUND: 'No active NDCs found for this drug. The drug may be discontinued or unavailable.',
		SIG_PARSE_FAILED: 'Could not parse the prescription instructions. Please use a format like "Take 1 tablet twice daily".',
		API_ERROR: 'Service temporarily unavailable. Please try again in a moment.',
		CALCULATION_ERROR: 'An error occurred during calculation. Please check your inputs and try again.',
		RATE_LIMIT_ERROR: 'Too many requests. Please wait a moment before trying again.',
		TIMEOUT_ERROR: 'The request took too long. Please try again.',
		NETWORK_ERROR: 'Network error. Please check your connection and try again.',
	};

	return errorMessages[code] || 'An unexpected error occurred. Please try again.';
}

