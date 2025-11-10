import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parse } from '../../lib/core/sigParser';
import * as regexParser from '../../lib/core/regexSigParser';
import * as openaiParser from '../../lib/core/openaiSigParser';
import * as openaiService from '../../lib/services/openai';
import * as cacheService from '../../lib/services/cache';
import { ParsedSig } from '../../lib/types/sig';

// Mock dependencies
vi.mock('../../lib/core/regexSigParser', () => ({
	parse: vi.fn(),
}));

vi.mock('../../lib/core/openaiSigParser', () => ({
	parse: vi.fn(),
}));

vi.mock('../../lib/services/openai', () => ({
	rewriteSig: vi.fn(),
}));

vi.mock('../../lib/services/cache', () => ({
	cache: {
		get: vi.fn(),
		set: vi.fn(),
		delete: vi.fn(),
	},
}));

describe('SIG Parser Orchestrator', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('parse()', () => {
		it('should return cached result on cache hit', async () => {
			const cached: ParsedSig = {
				dosage: 1,
				frequency: 2,
				unit: 'tablet',
				confidence: 0.9,
			};

			vi.mocked(cacheService.cache.get).mockResolvedValue(cached);

			const result = await parse('Take 1 tablet twice daily');
			expect(result).toEqual(cached);
			expect(regexParser.parse).not.toHaveBeenCalled();
			expect(openaiParser.parse).not.toHaveBeenCalled();
		});

		it('should try regex parser first on cache miss', async () => {
			const regexResult: ParsedSig = {
				dosage: 1,
				frequency: 2,
				unit: 'tablet',
				confidence: 0.85, // High confidence
			};

			vi.mocked(cacheService.cache.get).mockResolvedValue(null);
			vi.mocked(regexParser.parse).mockReturnValue(regexResult);
			vi.mocked(cacheService.cache.set).mockResolvedValue();

			const result = await parse('Take 1 tablet twice daily');
			expect(result).toEqual(regexResult);
			expect(regexParser.parse).toHaveBeenCalledWith('Take 1 tablet twice daily');
			expect(openaiParser.parse).not.toHaveBeenCalled();
			expect(cacheService.cache.set).toHaveBeenCalled();
		});

		it('should cache regex result with high confidence', async () => {
			const regexResult: ParsedSig = {
				dosage: 1,
				frequency: 2,
				unit: 'tablet',
				confidence: 0.9, // High confidence
			};

			vi.mocked(cacheService.cache.get).mockResolvedValue(null);
			vi.mocked(regexParser.parse).mockReturnValue(regexResult);
			vi.mocked(cacheService.cache.set).mockResolvedValue();

			await parse('Take 1 tablet twice daily');
			expect(cacheService.cache.set).toHaveBeenCalled();
		});

		it('should fall back to OpenAI when regex confidence < 0.8', async () => {
			const regexResult: ParsedSig = {
				dosage: 1,
				frequency: 2,
				unit: 'tablet',
				confidence: 0.7, // Low confidence
			};

			const openaiResult: ParsedSig = {
				dosage: 1,
				frequency: 2,
				unit: 'tablet',
				confidence: 0.9,
			};

			vi.mocked(cacheService.cache.get).mockResolvedValue(null);
			vi.mocked(regexParser.parse).mockReturnValue(regexResult);
			vi.mocked(openaiParser.parse).mockResolvedValue(openaiResult);
			vi.mocked(cacheService.cache.set).mockResolvedValue();

			const result = await parse('Take 1 tablet twice daily');
			expect(result).toEqual(openaiResult);
			expect(regexParser.parse).toHaveBeenCalled();
			expect(openaiParser.parse).toHaveBeenCalled();
			expect(cacheService.cache.set).toHaveBeenCalled();
		});

		it('should fall back to OpenAI when regex returns null', async () => {
			const openaiResult: ParsedSig = {
				dosage: 1,
				frequency: 2,
				unit: 'tablet',
				confidence: 0.9,
			};

			vi.mocked(cacheService.cache.get).mockResolvedValue(null);
			vi.mocked(regexParser.parse).mockReturnValue(null);
			vi.mocked(openaiParser.parse).mockResolvedValue(openaiResult);
			vi.mocked(cacheService.cache.set).mockResolvedValue();

			const result = await parse('Take 1 tablet twice daily');
			expect(result).toEqual(openaiResult);
			expect(regexParser.parse).toHaveBeenCalled();
			expect(openaiParser.parse).toHaveBeenCalled();
		});

		it('should return null when both parsers fail', async () => {
			vi.mocked(cacheService.cache.get).mockResolvedValue(null);
			vi.mocked(regexParser.parse).mockReturnValue(null);
			vi.mocked(openaiParser.parse).mockResolvedValue(null);

			const result = await parse('Invalid SIG text');
			expect(result).toBeNull();
			expect(regexParser.parse).toHaveBeenCalled();
			expect(openaiParser.parse).toHaveBeenCalled();
		});

		it('should handle cache errors gracefully', async () => {
			const regexResult: ParsedSig = {
				dosage: 1,
				frequency: 2,
				unit: 'tablet',
				confidence: 0.9,
			};

			vi.mocked(cacheService.cache.get).mockRejectedValue(new Error('Cache error'));
			vi.mocked(regexParser.parse).mockReturnValue(regexResult);

			const result = await parse('Take 1 tablet twice daily');
			expect(result).toEqual(regexResult);
			// Should continue even if cache fails
		});

		it('should handle regex parser errors gracefully', async () => {
			const openaiResult: ParsedSig = {
				dosage: 1,
				frequency: 2,
				unit: 'tablet',
				confidence: 0.9,
			};

			vi.mocked(cacheService.cache.get).mockResolvedValue(null);
			vi.mocked(regexParser.parse).mockImplementation(() => {
				throw new Error('Regex parser error');
			});
			vi.mocked(openaiParser.parse).mockResolvedValue(openaiResult);

			const result = await parse('Take 1 tablet twice daily');
			expect(result).toEqual(openaiResult);
			expect(openaiParser.parse).toHaveBeenCalled();
		});

		it('should validate cached results', async () => {
			const invalidCached = {
				dosage: 0, // Invalid
				frequency: 2,
				unit: 'tablet',
				confidence: 0.9,
			};

			const regexResult: ParsedSig = {
				dosage: 1,
				frequency: 2,
				unit: 'tablet',
				confidence: 0.9,
			};

			vi.mocked(cacheService.cache.get).mockResolvedValue(invalidCached as ParsedSig);
			vi.mocked(cacheService.cache.delete).mockResolvedValue();
			vi.mocked(regexParser.parse).mockReturnValue(regexResult);

			const result = await parse('Take 1 tablet twice daily');
			expect(result).toEqual(regexResult);
			expect(cacheService.cache.delete).toHaveBeenCalled();
		});

		it('should return null for invalid input', async () => {
			expect(await parse('')).toBeNull();
			expect(await parse(null as any)).toBeNull();
			expect(await parse(undefined as any)).toBeNull();
		});

		it('should normalize SIG for cache key', async () => {
			const cached: ParsedSig = {
				dosage: 1,
				frequency: 2,
				unit: 'tablet',
				confidence: 0.9,
			};

			vi.mocked(cacheService.cache.get).mockResolvedValue(cached);

			// Different formats should use same cache key
			const result1 = await parse('Take 1 tablet twice daily');
			const result2 = await parse('  Take 1 tablet twice daily  ');

			expect(result1).toEqual(cached);
			expect(result2).toEqual(cached);
		});

		describe('rewrite fallback', () => {
			it('should attempt rewrite when both parsers fail', async () => {
				const rewrittenSig = 'Take 1 tablet twice daily';
				const parsedResult: ParsedSig = {
					dosage: 1,
					frequency: 2,
					unit: 'tablet',
					confidence: 0.9,
				};

				vi.mocked(cacheService.cache.get).mockResolvedValue(null);
				vi.mocked(regexParser.parse).mockReturnValue(null);
				vi.mocked(openaiParser.parse).mockResolvedValue(null);
				vi.mocked(openaiService.rewriteSig).mockResolvedValue(rewrittenSig);
				// Mock recursive parse call (rewritten SIG parses successfully)
				vi.mocked(regexParser.parse).mockReturnValueOnce(null).mockReturnValueOnce(parsedResult);
				vi.mocked(cacheService.cache.set).mockResolvedValue();

				const result = await parse('Take 1 tablt twic daily');
				expect(result).toEqual(parsedResult);
				expect(openaiService.rewriteSig).toHaveBeenCalledWith('Take 1 tablt twic daily');
				expect(cacheService.cache.set).toHaveBeenCalled();
			});

			it('should return null if rewrite fails', async () => {
				vi.mocked(cacheService.cache.get).mockResolvedValue(null);
				vi.mocked(regexParser.parse).mockReturnValue(null);
				vi.mocked(openaiParser.parse).mockResolvedValue(null);
				vi.mocked(openaiService.rewriteSig).mockResolvedValue(null);

				const result = await parse('Invalid SIG text');
				expect(result).toBeNull();
				expect(openaiService.rewriteSig).toHaveBeenCalled();
			});

			it('should return null if rewritten SIG still fails to parse', async () => {
				const rewrittenSig = 'Take 1 tablet twice daily';

				vi.mocked(cacheService.cache.get).mockResolvedValue(null);
				vi.mocked(regexParser.parse).mockReturnValue(null);
				vi.mocked(openaiParser.parse).mockResolvedValue(null);
				vi.mocked(openaiService.rewriteSig).mockResolvedValue(rewrittenSig);
				// Mock recursive parse call (rewritten SIG also fails)
				vi.mocked(regexParser.parse).mockReturnValue(null);
				vi.mocked(openaiParser.parse).mockResolvedValue(null);

				const result = await parse('Invalid SIG text');
				expect(result).toBeNull();
				expect(openaiService.rewriteSig).toHaveBeenCalled();
			});

			it('should not rewrite if recursion depth is 1', async () => {
				vi.mocked(cacheService.cache.get).mockResolvedValue(null);
				vi.mocked(regexParser.parse).mockReturnValue(null);
				vi.mocked(openaiParser.parse).mockResolvedValue(null);

				const result = await parse('Invalid SIG text', 1);
				expect(result).toBeNull();
				expect(openaiService.rewriteSig).not.toHaveBeenCalled();
			});

			it('should cache result with original SIG key after rewrite', async () => {
				const rewrittenSig = 'Take 1 tablet twice daily';
				const parsedResult: ParsedSig = {
					dosage: 1,
					frequency: 2,
					unit: 'tablet',
					confidence: 0.9,
				};

				vi.mocked(cacheService.cache.get).mockResolvedValue(null);
				vi.mocked(regexParser.parse).mockReturnValue(null);
				vi.mocked(openaiParser.parse).mockResolvedValue(null);
				vi.mocked(openaiService.rewriteSig).mockResolvedValue(rewrittenSig);
				// Mock recursive parse call
				vi.mocked(regexParser.parse).mockReturnValueOnce(null).mockReturnValueOnce(parsedResult);
				vi.mocked(cacheService.cache.set).mockResolvedValue();

				await parse('Take 1 tablt twic daily');
				// Should cache with original SIG's key, not rewritten SIG's key
				expect(cacheService.cache.set).toHaveBeenCalled();
			});

			it('should handle rewrite errors gracefully', async () => {
				vi.mocked(cacheService.cache.get).mockResolvedValue(null);
				vi.mocked(regexParser.parse).mockReturnValue(null);
				vi.mocked(openaiParser.parse).mockResolvedValue(null);
				vi.mocked(openaiService.rewriteSig).mockRejectedValue(new Error('Rewrite error'));

				const result = await parse('Invalid SIG text');
				expect(result).toBeNull();
				expect(openaiService.rewriteSig).toHaveBeenCalled();
			});

			it('should not rewrite if rewrite returns identical SIG', async () => {
				const originalSig = 'Take 1 tablet twice daily';

				vi.mocked(cacheService.cache.get).mockResolvedValue(null);
				vi.mocked(regexParser.parse).mockReturnValue(null);
				vi.mocked(openaiParser.parse).mockResolvedValue(null);
				vi.mocked(openaiService.rewriteSig).mockResolvedValue(originalSig);

				const result = await parse(originalSig);
				expect(result).toBeNull();
				expect(openaiService.rewriteSig).toHaveBeenCalled();
			});
		});
	});
});

