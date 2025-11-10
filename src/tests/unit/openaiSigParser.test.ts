import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parse } from '../../lib/core/openaiSigParser';
import * as openaiService from '../../lib/services/openai';
import { ParsedSig } from '../../lib/types/sig';

// Mock the OpenAI service
vi.mock('../../lib/services/openai', () => ({
	parseSig: vi.fn(),
}));

describe('OpenAI SIG Parser', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('parse()', () => {
		it('should parse SIG successfully', async () => {
			const mockParsed: ParsedSig = {
				dosage: 1,
				frequency: 2,
				unit: 'tablet',
				confidence: 0.9,
			};

			vi.mocked(openaiService.parseSig).mockResolvedValue(mockParsed);

			const result = await parse('Take 1 tablet twice daily');
			expect(result).not.toBeNull();
			expect(result?.dosage).toBe(1);
			expect(result?.frequency).toBe(2);
			expect(result?.unit).toBe('tablet');
			expect(result?.confidence).toBe(0.9);
		});

		it('should normalize unit to lowercase', async () => {
			const mockParsed: ParsedSig = {
				dosage: 1,
				frequency: 2,
				unit: 'TABLET', // Uppercase
				confidence: 0.9,
			};

			vi.mocked(openaiService.parseSig).mockResolvedValue(mockParsed);

			const result = await parse('Take 1 tablet twice daily');
			expect(result).not.toBeNull();
			expect(result?.unit).toBe('tablet'); // Lowercase
		});

		it('should return null for invalid input', async () => {
			const result1 = await parse('');
			expect(result1).toBeNull();

			const result2 = await parse(null as any);
			expect(result2).toBeNull();

			const result3 = await parse(undefined as any);
			expect(result3).toBeNull();
		});

		it('should return null if OpenAI service throws error', async () => {
			vi.mocked(openaiService.parseSig).mockRejectedValue(new Error('API error'));

			const result = await parse('Take 1 tablet twice daily');
			expect(result).toBeNull();
		});

		it('should return null if OpenAI service returns invalid dosage', async () => {
			const mockParsed = {
				dosage: 0, // Invalid: must be > 0
				frequency: 2,
				unit: 'tablet',
				confidence: 0.9,
			};

			vi.mocked(openaiService.parseSig).mockResolvedValue(mockParsed as ParsedSig);

			const result = await parse('Take 1 tablet twice daily');
			expect(result).toBeNull();
		});

		it('should return null if OpenAI service returns invalid frequency', async () => {
			const mockParsed = {
				dosage: 1,
				frequency: -1, // Invalid: must be >= 0
				unit: 'tablet',
				confidence: 0.9,
			};

			vi.mocked(openaiService.parseSig).mockResolvedValue(mockParsed as ParsedSig);

			const result = await parse('Take 1 tablet twice daily');
			expect(result).toBeNull();
		});

		it('should return null if OpenAI service returns invalid unit', async () => {
			const mockParsed = {
				dosage: 1,
				frequency: 2,
				unit: 'invalid_unit', // Invalid: not in valid units list
				confidence: 0.9,
			};

			vi.mocked(openaiService.parseSig).mockResolvedValue(mockParsed as ParsedSig);

			const result = await parse('Take 1 tablet twice daily');
			expect(result).toBeNull();
		});

		it('should return null if OpenAI service returns invalid confidence', async () => {
			const mockParsed = {
				dosage: 1,
				frequency: 2,
				unit: 'tablet',
				confidence: 1.5, // Invalid: must be 0-1
			};

			vi.mocked(openaiService.parseSig).mockResolvedValue(mockParsed as ParsedSig);

			const result = await parse('Take 1 tablet twice daily');
			expect(result).toBeNull();
		});

		it('should return null if OpenAI service returns missing fields', async () => {
			const mockParsed = {
				dosage: 1,
				// Missing frequency, unit, confidence
			};

			vi.mocked(openaiService.parseSig).mockResolvedValue(mockParsed as ParsedSig);

			const result = await parse('Take 1 tablet twice daily');
			expect(result).toBeNull();
		});

		it('should handle PRN medications (frequency = 0)', async () => {
			const mockParsed: ParsedSig = {
				dosage: 1.5,
				frequency: 0, // PRN
				unit: 'tablet',
				confidence: 0.8,
			};

			vi.mocked(openaiService.parseSig).mockResolvedValue(mockParsed);

			const result = await parse('Take 1-2 tablets as needed');
			expect(result).not.toBeNull();
			expect(result?.frequency).toBe(0);
		});

		it('should normalize SIG input', async () => {
			const mockParsed: ParsedSig = {
				dosage: 1,
				frequency: 2,
				unit: 'tablet',
				confidence: 0.9,
			};

			vi.mocked(openaiService.parseSig).mockResolvedValue(mockParsed);

			// Test with various formats
			const result1 = await parse('Take 1 tablet twice daily');
			const result2 = await parse('  Take 1 tablet twice daily  ');
			const result3 = await parse('Take 1 tablet, twice daily.');

			expect(result1).not.toBeNull();
			expect(result2).not.toBeNull();
			expect(result3).not.toBeNull();
		});
	});
});

