import { describe, it, expect } from 'vitest';
import { getErrorMessage } from '../../lib/utils/errorMessages';

describe('Error Messages Utility', () => {
	it('should return user-friendly message for known error codes', () => {
		expect(getErrorMessage('DRUG_NOT_FOUND')).toContain('Drug not found');
		expect(getErrorMessage('NO_NDCS_FOUND')).toContain('No active NDCs');
		expect(getErrorMessage('SIG_PARSE_FAILED')).toContain('Could not parse');
		expect(getErrorMessage('API_ERROR')).toContain('Service temporarily unavailable');
		expect(getErrorMessage('CALCULATION_ERROR')).toContain('error occurred during calculation');
	});

	it('should return default message for unknown error codes', () => {
		const message = getErrorMessage('UNKNOWN_ERROR');
		expect(message).toContain('unexpected error');
	});

	it('should handle all error codes from API', () => {
		const codes = [
			'INVALID_INPUT',
			'DRUG_NOT_FOUND',
			'NO_NDCS_FOUND',
			'SIG_PARSE_FAILED',
			'API_ERROR',
			'CALCULATION_ERROR',
			'RATE_LIMIT_ERROR',
			'TIMEOUT_ERROR',
			'NETWORK_ERROR',
		];

		codes.forEach((code) => {
			const message = getErrorMessage(code);
			expect(message).toBeTruthy();
			expect(typeof message).toBe('string');
			expect(message.length).toBeGreaterThan(0);
		});
	});
});

