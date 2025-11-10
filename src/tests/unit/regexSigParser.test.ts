import { describe, it, expect } from 'vitest';
import { parse } from '../../lib/core/regexSigParser';
import { ParsedSig } from '../../lib/types/sig';

describe('Regex SIG Parser', () => {
	describe('parse()', () => {
		it('should parse simple "Take X tablet twice daily" pattern', () => {
			const result = parse('Take 1 tablet by mouth twice daily');
			expect(result).not.toBeNull();
			expect(result?.dosage).toBe(1);
			expect(result?.frequency).toBe(2);
			expect(result?.unit).toBe('tablet');
			expect(result?.confidence).toBeGreaterThanOrEqual(0.7);
		});

		it('should parse "Take X tablets every X hours" pattern', () => {
			const result = parse('Take 2 tablets by mouth every 12 hours');
			expect(result).not.toBeNull();
			expect(result?.dosage).toBe(2);
			expect(result?.frequency).toBe(2); // 24 / 12 = 2
			expect(result?.unit).toBe('tablet');
		});

		it('should parse "Take X tablet once daily" pattern', () => {
			const result = parse('Take 1 tablet orally once daily');
			expect(result).not.toBeNull();
			expect(result?.dosage).toBe(1);
			expect(result?.frequency).toBe(1);
			expect(result?.unit).toBe('tablet');
		});

		it('should parse "Take X tablet three times daily" pattern', () => {
			const result = parse('Take 1 tablet by mouth three times daily');
			expect(result).not.toBeNull();
			expect(result?.dosage).toBe(1);
			expect(result?.frequency).toBe(3);
			expect(result?.unit).toBe('tablet');
		});

		it('should parse "Take X tablets every 8 hours" pattern', () => {
			const result = parse('Take 2 tablets by mouth every 8 hours');
			expect(result).not.toBeNull();
			expect(result?.dosage).toBe(2);
			expect(result?.frequency).toBe(3); // 24 / 8 = 3
			expect(result?.unit).toBe('tablet');
		});

		it('should parse "Take X tablet twice a day" pattern', () => {
			const result = parse('Take 1 tablet twice a day');
			expect(result).not.toBeNull();
			expect(result?.dosage).toBe(1);
			expect(result?.frequency).toBe(2);
			expect(result?.unit).toBe('tablet');
		});

		it('should parse "Take X tablet daily" pattern', () => {
			const result = parse('Take 1 tablet daily');
			expect(result).not.toBeNull();
			expect(result?.dosage).toBe(1);
			expect(result?.frequency).toBe(1);
			expect(result?.unit).toBe('tablet');
		});

		it('should parse "Take X tablet every morning" pattern', () => {
			const result = parse('Take 2 tablets every morning');
			expect(result).not.toBeNull();
			expect(result?.dosage).toBe(2);
			expect(result?.frequency).toBe(1);
			expect(result?.unit).toBe('tablet');
		});

		it('should parse capsule units', () => {
			const result = parse('Take 1 capsule by mouth twice daily with meals');
			expect(result).not.toBeNull();
			expect(result?.unit).toBe('capsule');
		});

		it('should parse "Take X tablet at bedtime" pattern', () => {
			const result = parse('Take 1 tablet at bedtime');
			expect(result).not.toBeNull();
			expect(result?.dosage).toBe(1);
			expect(result?.frequency).toBe(1);
			expect(result?.unit).toBe('tablet');
		});

		it('should parse "Take X tablet in the morning and X tablet in the evening" pattern', () => {
			const result = parse('Take 1 tablet in the morning and 1 tablet in the evening');
			expect(result).not.toBeNull();
			expect(result?.dosage).toBe(1);
			expect(result?.frequency).toBe(2);
			expect(result?.unit).toBe('tablet');
		});

		it('should parse "Take X tablet four times daily" pattern', () => {
			const result = parse('Take 1 tablet by mouth four times daily before meals and at bedtime');
			expect(result).not.toBeNull();
			expect(result?.dosage).toBe(1);
			expect(result?.frequency).toBe(4);
			expect(result?.unit).toBe('tablet');
		});

		it('should parse "Take X tablet every 6 hours" pattern', () => {
			const result = parse('Take 1 tablet by mouth every 6 hours as needed');
			expect(result).not.toBeNull();
			expect(result?.dosage).toBe(1);
			expect(result?.frequency).toBe(4); // 24 / 6 = 4
			expect(result?.unit).toBe('tablet');
		});

		it('should parse "Take X tablet every 8 hours for X days" pattern', () => {
			const result = parse('Take 1 tablet every 8 hours for 10 days');
			expect(result).not.toBeNull();
			expect(result?.dosage).toBe(1);
			expect(result?.frequency).toBe(3); // 24 / 8 = 3
			expect(result?.unit).toBe('tablet');
		});

		it('should parse "Take X tablet by mouth once daily with food" pattern', () => {
			const result = parse('Take 2 tablets by mouth once daily with food');
			expect(result).not.toBeNull();
			expect(result?.dosage).toBe(2);
			expect(result?.frequency).toBe(1);
			expect(result?.unit).toBe('tablet');
		});

		it('should parse "Take X tablet every morning on an empty stomach" pattern', () => {
			const result = parse('Take 1 tablet every morning on an empty stomach');
			expect(result).not.toBeNull();
			expect(result?.dosage).toBe(1);
			expect(result?.frequency).toBe(1);
			expect(result?.unit).toBe('tablet');
		});

		it('should parse "Take X tablet by mouth three times daily with meals" pattern', () => {
			const result = parse('Take 1 tablet by mouth three times daily with meals');
			expect(result).not.toBeNull();
			expect(result?.dosage).toBe(1);
			expect(result?.frequency).toBe(3);
			expect(result?.unit).toBe('tablet');
		});

		it('should parse "Take X tablets twice daily" pattern', () => {
			const result = parse('Take 2 tablets twice daily');
			expect(result).not.toBeNull();
			expect(result?.dosage).toBe(2);
			expect(result?.frequency).toBe(2);
			expect(result?.unit).toBe('tablet');
		});

		it('should handle PRN medications (frequency = 0)', () => {
			const result = parse('Take 1-2 tablets by mouth as needed for pain');
			expect(result).not.toBeNull();
			expect(result?.dosage).toBe(1.5); // Average of 1-2
			expect(result?.frequency).toBe(0); // PRN
			expect(result?.unit).toBe('tablet');
		});

		it('should handle dosage ranges (use average)', () => {
			const result = parse('Take 1-2 tablets by mouth as needed for pain');
			expect(result).not.toBeNull();
			expect(result?.dosage).toBe(1.5); // (1 + 2) / 2 = 1.5
		});

		it('should return null for invalid input', () => {
			expect(parse('')).toBeNull();
			expect(parse(null as any)).toBeNull();
			expect(parse(undefined as any)).toBeNull();
		});

		it('should return null for unparseable SIG', () => {
			expect(parse('Random text that does not match any pattern')).toBeNull();
		});

		it('should have confidence >= 0.7 for successful parses', () => {
			const testCases = [
				'Take 1 tablet by mouth twice daily',
				'Take 2 tablets by mouth every 12 hours',
				'Take 1 tablet orally once daily',
			];

			for (const testCase of testCases) {
				const result = parse(testCase);
				expect(result).not.toBeNull();
				if (result) {
					expect(result.confidence).toBeGreaterThanOrEqual(0.7);
					expect(result.confidence).toBeLessThanOrEqual(1.0);
				}
			}
		});

		it('should parse at least 80% of Phase 0 test data', () => {
			const testData = [
				'Take 1 tablet by mouth twice daily',
				'Take 2 tablets by mouth every 12 hours with food',
				'Take 1 tablet orally once daily',
				'Take 1 tablet by mouth three times daily',
				'Take 2 tablets by mouth every 8 hours',
				'Take 1 tablet twice a day',
				'Take 1 tablet daily',
				'Take 2 tablets every morning',
				'Take 1 capsule by mouth twice daily with meals',
				'Take 1 tablet at bedtime',
				'Take 1 tablet by mouth every 6 hours as needed',
				'Take 2 tablets by mouth every 12 hours for 7 days',
				'Take 1 tablet in the morning and 1 tablet in the evening',
				'Take 1 tablet by mouth four times daily before meals and at bedtime',
				'Take 2 tablets by mouth once daily with food',
				'Take 1 tablet every morning on an empty stomach',
				'Take 1 tablet by mouth three times daily with meals',
				'Take 2 tablets twice daily',
				'Take 1 tablet every 8 hours for 10 days',
			];

			let successCount = 0;
			for (const testCase of testData) {
				const result = parse(testCase);
				if (result && result.confidence >= 0.7) {
					successCount++;
				}
			}

			const successRate = successCount / testData.length;
			expect(successRate).toBeGreaterThanOrEqual(0.8); // At least 80%
		});
	});
});

