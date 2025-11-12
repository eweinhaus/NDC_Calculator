import { describe, it, expect } from 'vitest';
import {
	convertLiquidVolume,
	convertInsulinUnitsToVolume,
	normalizeUnitForMatching,
} from '$lib/utils/unitConverter';

describe('unitConverter', () => {
	describe('convertLiquidVolume', () => {
		it('should convert mL to L', () => {
			const result = convertLiquidVolume(1000, 'mL', 'L');
			expect(result).toEqual({
				converted: 1,
				unit: 'L',
				original: 1000,
				originalUnit: 'mL',
			});
		});

		it('should convert L to mL', () => {
			const result = convertLiquidVolume(1, 'L', 'mL');
			expect(result).toEqual({
				converted: 1000,
				unit: 'mL',
				original: 1,
				originalUnit: 'L',
			});
		});

		it('should handle same unit (no conversion)', () => {
			const result = convertLiquidVolume(100, 'mL', 'mL');
			expect(result).toEqual({
				converted: 100,
				unit: 'mL',
				original: 100,
				originalUnit: 'mL',
			});
		});

		it('should round to 2 decimal places', () => {
			const result = convertLiquidVolume(1500, 'mL', 'L');
			expect(result?.converted).toBe(1.5);
		});

		it('should handle fractional conversions', () => {
			const result = convertLiquidVolume(500, 'mL', 'L');
			expect(result?.converted).toBe(0.5);
		});

		it('should return null for incompatible units', () => {
			const result = convertLiquidVolume(100, 'mL', 'tablet');
			expect(result).toBeNull();
		});

		it('should handle case-insensitive unit names', () => {
			const result1 = convertLiquidVolume(1000, 'ml', 'l');
			const result2 = convertLiquidVolume(1000, 'milliliter', 'liter');
			expect(result1?.converted).toBe(1);
			expect(result2?.converted).toBe(1);
		});

		it('should return null for invalid values', () => {
			expect(convertLiquidVolume(NaN, 'mL', 'L')).toBeNull();
			expect(convertLiquidVolume(-1, 'mL', 'L')).toBeNull();
		});
	});

	describe('convertInsulinUnitsToVolume', () => {
		it('should convert units to mL with U-100', () => {
			const result = convertInsulinUnitsToVolume(100, 100);
			expect(result).toEqual({
				converted: 1,
				unit: 'mL',
				original: 100,
				originalUnit: 'unit',
			});
		});

		it('should convert units to mL with U-200', () => {
			const result = convertInsulinUnitsToVolume(200, 200);
			expect(result).toEqual({
				converted: 1,
				unit: 'mL',
				original: 200,
				originalUnit: 'unit',
			});
		});

		it('should default to U-100 if strength not specified', () => {
			const result = convertInsulinUnitsToVolume(100);
			expect(result.converted).toBe(1);
		});

		it('should round to 2 decimal places', () => {
			const result = convertInsulinUnitsToVolume(150, 100);
			expect(result.converted).toBe(1.5);
		});

		it('should throw error for invalid units', () => {
			expect(() => convertInsulinUnitsToVolume(NaN, 100)).toThrow();
			expect(() => convertInsulinUnitsToVolume(-1, 100)).toThrow();
		});

		it('should throw error for invalid strength', () => {
			expect(() => convertInsulinUnitsToVolume(100, 0)).toThrow();
			expect(() => convertInsulinUnitsToVolume(100, NaN)).toThrow();
		});
	});

	describe('normalizeUnitForMatching', () => {
		it('should match exact same units', () => {
			const result = normalizeUnitForMatching('tablet', 'tablet');
			expect(result).toEqual({ canMatch: true, conversionNeeded: false });
		});

		it('should match liquid units with conversion', () => {
			const result = normalizeUnitForMatching('mL', 'L');
			expect(result).toEqual({ canMatch: true, conversionNeeded: true });
		});

		it('should match same category units without conversion', () => {
			const result = normalizeUnitForMatching('tablet', 'capsule');
			expect(result).toEqual({ canMatch: true, conversionNeeded: false });
		});

		it('should not match different categories', () => {
			const result = normalizeUnitForMatching('tablet', 'mL');
			expect(result).toEqual({ canMatch: false, conversionNeeded: false });
		});

		it('should match unit variations', () => {
			expect(normalizeUnitForMatching('unit', 'u')).toEqual({ canMatch: true, conversionNeeded: false });
			expect(normalizeUnitForMatching('actuation', 'puff')).toEqual({ canMatch: true, conversionNeeded: false });
		});

		it('should handle case-insensitive matching', () => {
			const result = normalizeUnitForMatching('ML', 'ml');
			expect(result).toEqual({ canMatch: true, conversionNeeded: false });
		});

		it('should return false for empty strings', () => {
			const result = normalizeUnitForMatching('', 'tablet');
			expect(result).toEqual({ canMatch: false, conversionNeeded: false });
		});
	});
});

