import { describe, it, expect } from 'vitest';
import {
	SIG_PATTERNS,
	UNIT_PATTERNS,
	FREQUENCY_PATTERNS,
	CONFIDENCE_RULES,
} from '../../lib/constants/sigPatterns';

describe('SIG Pattern Constants', () => {
	describe('SIG_PATTERNS', () => {
		it('should have patterns ordered by priority (highest first)', () => {
			for (let i = 0; i < SIG_PATTERNS.length - 1; i++) {
				expect(SIG_PATTERNS[i].priority).toBeGreaterThanOrEqual(
					SIG_PATTERNS[i + 1].priority
				);
			}
		});

		it('should have at least 10 patterns', () => {
			expect(SIG_PATTERNS.length).toBeGreaterThanOrEqual(10);
		});

		it('should have valid regex patterns', () => {
			for (const pattern of SIG_PATTERNS) {
				expect(() => new RegExp(pattern.pattern)).not.toThrow();
			}
		});

		it('should match common SIG patterns', () => {
			const testCases = [
				'Take 1 tablet by mouth twice daily',
				'Take 2 tablets by mouth every 12 hours',
				'Take 1 tablet orally once daily',
				'Take 1 tablet by mouth three times daily',
			];

			for (const testCase of testCases) {
				const matched = SIG_PATTERNS.some((p) => p.pattern.test(testCase));
				expect(matched).toBe(true);
			}
		});
	});

	describe('UNIT_PATTERNS', () => {
		it('should have patterns for all supported units', () => {
			const normalizedUnits = UNIT_PATTERNS.map((p) => p.normalized);
			expect(normalizedUnits).toContain('tablet');
			expect(normalizedUnits).toContain('capsule');
			expect(normalizedUnits).toContain('pill');
			expect(normalizedUnits).toContain('mL');
			expect(normalizedUnits).toContain('L');
			expect(normalizedUnits).toContain('unit');
			expect(normalizedUnits).toContain('actuation');
		});

		it('should match unit variations', () => {
			// Find all tablet patterns (there may be multiple)
			const tabletPatterns = UNIT_PATTERNS.filter((p) => p.normalized === 'tablet');
			expect(tabletPatterns.length).toBeGreaterThan(0);
			
			// Check that at least one pattern matches each variation
			expect(tabletPatterns.some((p) => p.pattern.test('tablet'))).toBe(true);
			expect(tabletPatterns.some((p) => p.pattern.test('tablets'))).toBe(true);
			expect(tabletPatterns.some((p) => p.pattern.test('tab'))).toBe(true);
			expect(tabletPatterns.some((p) => p.pattern.test('tabs'))).toBe(true);
		});

		it('should have valid regex patterns', () => {
			for (const pattern of UNIT_PATTERNS) {
				expect(() => new RegExp(pattern.pattern)).not.toThrow();
			}
		});
	});

	describe('FREQUENCY_PATTERNS', () => {
		it('should handle fixed frequencies', () => {
			// Test once daily - should find the "once daily" pattern, not "daily"
			const onceDailyPatterns = FREQUENCY_PATTERNS.filter((p) =>
				p.pattern.test('once daily')
			);
			expect(onceDailyPatterns.length).toBeGreaterThan(0);
			// Find the most specific one (once daily, not just daily)
			const onceDaily = onceDailyPatterns.find((p) =>
				p.pattern.source.includes('once')
			);
			expect(onceDaily).toBeDefined();
			if (onceDaily && typeof onceDaily.frequency === 'number') {
				expect(onceDaily.frequency).toBe(1);
			}

			// Test twice daily
			const twiceDailyPatterns = FREQUENCY_PATTERNS.filter((p) =>
				p.pattern.test('twice daily')
			);
			expect(twiceDailyPatterns.length).toBeGreaterThan(0);
			// Find the most specific one (twice daily)
			const twiceDaily = twiceDailyPatterns.find((p) =>
				p.pattern.source.includes('twice')
			);
			expect(twiceDaily).toBeDefined();
			if (twiceDaily && typeof twiceDaily.frequency === 'number') {
				expect(twiceDaily.frequency).toBe(2);
			}
		});

		it('should handle calculated frequencies (every X hours)', () => {
			const everyHours = FREQUENCY_PATTERNS.find((p) =>
				p.pattern.test('every 8 hours')
			);
			expect(everyHours).toBeDefined();
			if (everyHours && typeof everyHours.frequency === 'function') {
				const match = 'every 8 hours'.match(everyHours.pattern);
				expect(match).not.toBeNull();
				if (match) {
					const frequency = everyHours.frequency(match);
					expect(frequency).toBe(3); // 24 / 8 = 3
				}
			}
		});

		it('should handle PRN (frequency = 0)', () => {
			const prn = FREQUENCY_PATTERNS.find((p) => p.pattern.test('as needed'));
			expect(prn).toBeDefined();
			if (prn && typeof prn.frequency === 'number') {
				expect(prn.frequency).toBe(0);
			}
		});

		it('should have valid regex patterns', () => {
			for (const pattern of FREQUENCY_PATTERNS) {
				expect(() => new RegExp(pattern.pattern)).not.toThrow();
			}
		});
	});

	describe('CONFIDENCE_RULES', () => {
		it('should have valid confidence ranges', () => {
			expect(CONFIDENCE_RULES.exactMatch).toBeGreaterThanOrEqual(0.9);
			expect(CONFIDENCE_RULES.exactMatch).toBeLessThanOrEqual(1.0);
			expect(CONFIDENCE_RULES.partialMatch).toBeGreaterThanOrEqual(0.8);
			expect(CONFIDENCE_RULES.partialMatch).toBeLessThan(0.9);
			expect(CONFIDENCE_RULES.weakMatch).toBeGreaterThanOrEqual(0.7);
			expect(CONFIDENCE_RULES.weakMatch).toBeLessThan(0.8);
		});

		it('should have decreasing confidence values', () => {
			expect(CONFIDENCE_RULES.exactMatch).toBeGreaterThan(
				CONFIDENCE_RULES.partialMatch
			);
			expect(CONFIDENCE_RULES.partialMatch).toBeGreaterThan(
				CONFIDENCE_RULES.weakMatch
			);
		});
	});
});

