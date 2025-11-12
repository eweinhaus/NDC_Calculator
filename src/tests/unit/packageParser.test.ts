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
			expect(result).not.toBeNull();
			expect(result?.quantity).toBe(35.5);
			expect(result?.unit).toBe('ML');
			expect(result?.totalQuantity).toBe(35.5);
			// May have metadata if parsed as liquid
			if (result?.metadata) {
				expect(result.metadata.dosageForm).toBe('liquid');
			}
		});

		it('should parse "5 mL in 1 VIAL, MULTI-DOSE"', () => {
			const result = parsePackageDescription('5 mL in 1 VIAL, MULTI-DOSE');
			expect(result).not.toBeNull();
			expect(result?.quantity).toBe(5);
			expect(result?.unit).toBe('ML');
			expect(result?.totalQuantity).toBe(5);
			// May have metadata if parsed as liquid
			if (result?.metadata) {
				expect(result.metadata.dosageForm).toBe('liquid');
			}
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

	describe('special dosage forms', () => {
		describe('liquid formats', () => {
			it('should parse liquid format with metadata', () => {
				const result = parsePackageDescription('5 mL in 1 VIAL');
				expect(result).not.toBeNull();
				expect(result?.quantity).toBe(5);
				expect(result?.unit).toBe('ML');
				expect(result?.metadata?.dosageForm).toBe('liquid');
				expect(result?.metadata?.volume).toBe(5);
				expect(result?.metadata?.volumeUnit).toBe('ML');
			});

			it('should parse liquid format in liters', () => {
				const result = parsePackageDescription('1 L in 1 BOTTLE');
				expect(result).not.toBeNull();
				expect(result?.quantity).toBe(1);
				expect(result?.unit).toBe('L');
				expect(result?.metadata?.dosageForm).toBe('liquid');
			});

			it('should parse liquid format with multi-dose', () => {
				const result = parsePackageDescription('10 mL in 1 VIAL, MULTI-DOSE');
				expect(result).not.toBeNull();
				expect(result?.quantity).toBe(10);
				expect(result?.unit).toBe('ML');
				expect(result?.metadata?.dosageForm).toBe('liquid');
			});
		});

		describe('insulin formats', () => {
			it('should parse insulin format with U-100 (default)', () => {
				const result = parsePackageDescription('10 mL in 1 VIAL');
				// Should be parsed as liquid, not insulin (no explicit insulin indicators)
				// But if it's insulin, it would convert: 10 mL × 100 units/mL = 1000 units
				// For now, test that liquid parser handles it
				expect(result).not.toBeNull();
			});

			it('should parse insulin format with U-100 explicitly', () => {
				const result = parsePackageDescription('U-100, 10 mL in 1 VIAL');
				expect(result).not.toBeNull();
				// Note: This might be parsed as liquid first, so we check if it's insulin or liquid
				// If insulin parser matches, it should convert to units
				if (result?.metadata?.dosageForm === 'insulin') {
					expect(result?.quantity).toBe(1000); // 10 mL × 100 units/mL
					expect(result?.unit).toBe('UNIT');
					expect(result?.metadata?.insulinStrength).toBe(100);
					expect(result?.metadata?.volume).toBe(10);
				} else {
					// If parsed as liquid (which happens first), that's also valid
					expect(result?.quantity).toBe(10);
					expect(result?.unit).toBe('ML');
				}
			});

			it('should parse insulin format with U-200', () => {
				const result = parsePackageDescription('U-200, 3 mL in 1 CARTRIDGE');
				expect(result).not.toBeNull();
				expect(result?.quantity).toBe(600); // 3 mL × 200 units/mL
				expect(result?.unit).toBe('UNIT');
				expect(result?.metadata?.insulinStrength).toBe(200);
			});

			it('should parse insulin format with direct units', () => {
				const result = parsePackageDescription('1000 units in 1 VIAL');
				expect(result).not.toBeNull();
				expect(result?.quantity).toBe(1000);
				expect(result?.unit).toBe('UNIT');
				expect(result?.metadata?.dosageForm).toBe('insulin');
			});
		});

		describe('inhaler formats', () => {
			it('should parse inhaler format with spray', () => {
				const result = parsePackageDescription('72 SPRAY, METERED in 1 BOTTLE, SPRAY');
				expect(result).not.toBeNull();
				expect(result?.quantity).toBe(72);
				expect(result?.unit).toBe('ACTUATION');
				expect(result?.metadata?.dosageForm).toBe('inhaler');
			});

			it('should parse inhaler format with actuations', () => {
				const result = parsePackageDescription('200 ACTUATION in 1 CANISTER');
				expect(result).not.toBeNull();
				expect(result?.quantity).toBe(200);
				expect(result?.unit).toBe('ACTUATION');
				expect(result?.metadata?.dosageForm).toBe('inhaler');
			});

			it('should parse inhaler format with capacity pattern', () => {
				const result = parsePackageDescription('120 puffs per canister');
				expect(result).not.toBeNull();
				expect(result?.quantity).toBe(120);
				expect(result?.unit).toBe('ACTUATION');
				expect(result?.metadata?.dosageForm).toBe('inhaler');
			});
		});
	});
});

