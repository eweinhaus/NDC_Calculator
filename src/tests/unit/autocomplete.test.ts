/**
 * Unit tests for autocomplete functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getAutocompleteSuggestions } from '../../lib/services/rxnorm.js';

// Mock the RxNorm API
vi.mock('../../lib/services/rxnorm', async () => {
	const actual = await vi.importActual('../../lib/services/rxnorm');
	return {
		...actual,
		makeRequest: vi.fn()
	};
});

describe('Autocomplete Service', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should return empty array for queries shorter than 2 characters', async () => {
		const result = await getAutocompleteSuggestions('L');
		expect(result).toEqual([]);
	});

	it('should return empty array for empty query', async () => {
		const result = await getAutocompleteSuggestions('');
		expect(result).toEqual([]);
	});

	it('should return empty array for whitespace-only query', async () => {
		const result = await getAutocompleteSuggestions('   ');
		expect(result).toEqual([]);
	});

	it('should handle API errors gracefully', async () => {
		// This test verifies that errors don't throw
		// The actual implementation catches errors and returns empty array
		const result = await getAutocompleteSuggestions('InvalidDrug12345');
		expect(Array.isArray(result)).toBe(true);
	});
});

