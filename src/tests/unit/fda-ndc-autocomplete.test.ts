/**
 * Unit tests for FDA NDC autocomplete functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getNdcAutocompleteSuggestions } from '../../lib/services/fda.js';
import * as cacheModule from '../../lib/services/cache.js';
import * as requestDeduplicatorModule from '../../lib/utils/requestDeduplicator.js';

// Mock dependencies
vi.mock('../../lib/services/cache.js');
vi.mock('../../lib/utils/requestDeduplicator.js');
vi.mock('../../lib/utils/logger.js', () => ({
	logger: {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn()
	}
}));

describe('FDA NDC Autocomplete', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Mock deduplicate to just execute the function
		vi.spyOn(requestDeduplicatorModule, 'deduplicate').mockImplementation(
			async (key: string, fn: () => Promise<any>) => fn()
		);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Input Validation', () => {
		it('should return empty array for queries less than 2 characters', async () => {
			const result = await getNdcAutocompleteSuggestions('1');
			expect(result).toEqual([]);
		});

		it('should return empty array for empty string', async () => {
			const result = await getNdcAutocompleteSuggestions('');
			expect(result).toEqual([]);
		});

		it('should return empty array for non-numeric input', async () => {
			const result = await getNdcAutocompleteSuggestions('abc');
			expect(result).toEqual([]);
		});

		it('should accept queries with dashes', async () => {
			// Mock cache to return null (cache miss)
			vi.spyOn(cacheModule.cache, 'get').mockResolvedValue(null);
			vi.spyOn(cacheModule.cache, 'set').mockResolvedValue(undefined);

			// Mock fetch to return empty results
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({ results: [] })
			});

			const result = await getNdcAutocompleteSuggestions('76420-345');
			expect(result).toEqual([]);
		});
	});

