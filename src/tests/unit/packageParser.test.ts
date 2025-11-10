import { describe, it, expect } from 'vitest';
import { parsePackageDescription } from '$lib/core/packageParser';

describe('parsePackageDescription', () => {
	describe('simple formats', () => {
		it('should parse "30 TABLET in 1 BOTTLE"', () => {
			const result = parsePackageDescription('30 TABLET in 1 BOTTLE');
			expect(result).toEqual({
				quantity: 30,
				unit: 'TABLET',
				totalQuantity: 30
			});
		});

		it('should parse "100 TABLET in 1 BOTTLE"', () => {
			const result = parsePackageDescription('100 TABLET in 1 BOTTLE');
			expect(result).toEqual({
				quantity: 100,
				unit: 'TABLET',
				totalQuantity: 100
			});
		});

		it('should parse "60 CAPSULE in 1 BOTTLE"', () => {
			const result = parsePackageDescription('60 CAPSULE in 1 BOTTLE');
			expect(result).toEqual({
				quantity: 60,
				unit: 'CAPSULE',
				totalQuantity: 60
			});
		});

		it('should parse "100 TABLET" (without container)', () => {
			const result = parsePackageDescription('100 TABLET');
			expect(result).toEqual({
				quantity: 100,
				unit: 'TABLET',
				totalQuantity: 100
			});
		});

		it('should parse descriptions with NDC codes', () => {
			const result = parsePackageDescription('30 TABLET in 1 BOTTLE (76420-345-30)');
			expect(result).toEqual({
				quantity: 30,
				unit: 'TABLET',
				totalQuantity: 30
			});
		});
	});

	describe('formats with dosage form descriptors', () => {
		it('should parse "30 TABLET, EXTENDED RELEASE in 1 BOTTLE"', () => {
			const result = parsePackageDescription('30 TABLET, EXTENDED RELEASE in 1 BOTTLE');
			expect(result).toEqual({
				quantity: 30,
				unit: 'TABLET',
				totalQuantity: 30
			});
		});

		it('should parse "100 TABLET, FILM COATED in 1 BOTTLE"', () => {
			const result = parsePackageDescription('100 TABLET, FILM COATED in 1 BOTTLE');
			expect(result).toEqual({
				quantity: 100,
				unit: 'TABLET',
				totalQuantity: 100
			});
		});

		it('should parse "30 TABLET, COATED in 1 BOTTLE"', () => {
			const result = parsePackageDescription('30 TABLET, COATED in 1 BOTTLE');
			expect(result).toEqual({
				quantity: 30,
				unit: 'TABLET',
				totalQuantity: 30
			});
		});
	});

	describe('multi-pack formats', () => {
		it('should parse "3 x 30 TABLET in 1 PACKAGE"', () => {
			const result = parsePackageDescription('3 x 30 TABLET in 1 PACKAGE');
			expect(result).toEqual({
				quantity: 30,
				unit: 'TABLET',
				packageCount: 3,
				totalQuantity: 90
			});
		});

		it('should parse complex multi-pack format', () => {
			const result = parsePackageDescription(
				'1 BLISTER PACK in 1 CARTON (80425-0231-1)  / 21 TABLET in 1 BLISTER PACK'
			);
			expect(result).toEqual({
				quantity: 21,
				unit: 'TABLET',
				totalQuantity: 21
			});
		});

		it('should parse vial multi-pack format', () => {
			const result = parsePackageDescription('25 VIAL in 1 CARTON (80327-013-00)  / 5 mL in 1 VIAL');
			expect(result).toEqual({
				quantity: 5,
				unit: 'ML',
				packageCount: 25,
				totalQuantity: 125
			});
		});
	});

	describe('liquid formats', () => {
		it('should parse "87.1 g in 1 PACKAGE"', () => {
			const result = parsePackageDescription('87.1 g in 1 PACKAGE');
			expect(result).toEqual({
				quantity: 87.1,
				unit: 'G',
				totalQuantity: 87.1
			});
		});

		it('should parse "35.5 mL in 1 BOTTLE"', () => {
			const result = parsePackageDescription('35.5 mL in 1 BOTTLE');
			expect(result).toEqual({
				quantity: 35.5,
				unit: 'ML',
				totalQuantity: 35.5
			});
		});

		it('should parse "5 mL in 1 VIAL, MULTI-DOSE"', () => {
			const result = parsePackageDescription('5 mL in 1 VIAL, MULTI-DOSE');
			expect(result).toEqual({
				quantity: 5,
				unit: 'ML',
				totalQuantity: 5
			});
		});
	});

	describe('formats with container type', () => {
		it('should parse "21 TABLET in 1 BOTTLE, PLASTIC"', () => {
			const result = parsePackageDescription('21 TABLET in 1 BOTTLE, PLASTIC');
			expect(result).toEqual({
				quantity: 21,
				unit: 'TABLET',
				totalQuantity: 21
			});
		});
	});

	describe('edge cases', () => {
		it('should return null for empty string', () => {
			expect(parsePackageDescription('')).toBeNull();
		});

		it('should return null for invalid format', () => {
			expect(parsePackageDescription('invalid format')).toBeNull();
		});

		it('should return null for null input', () => {
			expect(parsePackageDescription(null as unknown as string)).toBeNull();
		});

		it('should handle very large numbers', () => {
			const result = parsePackageDescription('2000 TABLET in 1 BOTTLE');
			expect(result).toEqual({
				quantity: 2000,
				unit: 'TABLET',
				totalQuantity: 2000
			});
		});

		it('should handle spray actuations', () => {
			const result = parsePackageDescription(
				'1 BOTTLE, SPRAY in 1 CARTON (79903-295-72)  / 72 SPRAY, METERED in 1 BOTTLE, SPRAY'
			);
			expect(result).toEqual({
				quantity: 72,
				unit: 'SPRAY',
				totalQuantity: 72
			});
		});
	});
});

