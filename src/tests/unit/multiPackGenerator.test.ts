import { describe, it, expect } from 'vitest';
import { selectOptimal } from '../../lib/core/ndcSelector';
import { NdcInfo } from '../../lib/types/ndc';

describe('Multi-Pack Combination Generator', () => {
	const createNdcInfo = (
		ndc: string,
		packageSize: number,
		packageDescription: string
	): NdcInfo => ({
		ndc,
		packageSize,
		packageDescription,
		manufacturer: 'Test Manufacturer',
		dosageForm: 'TABLET',
		active: true,
	});

	describe('Multi-pack generation', () => {
		it('should generate exact multi-pack match', () => {
			const ndcList: NdcInfo[] = [
				createNdcInfo('12345-678-90', 30, '30 TABLET in 1 BOTTLE'),
			];

			const results = selectOptimal(ndcList, 90, 'tablet');
			const multiPack = results.find((r) => r.packageCount && r.packageCount > 1);
			
			expect(multiPack).toBeDefined();
			if (multiPack) {
				expect(multiPack.packageCount).toBe(3); // 90 / 30 = 3
				expect(multiPack.totalQuantity).toBe(90); // 3 × 30 = 90
				expect(multiPack.overfill).toBe(0); // Exact match
				expect(multiPack.matchScore).toBe(95); // Multi-pack exact match
			}
		});

		it('should limit package count to max 10', () => {
			const ndcList: NdcInfo[] = [
				createNdcInfo('12345-678-90', 1, '1 TABLET in 1 BOTTLE'), // Very small package
			];

			const results = selectOptimal(ndcList, 100, 'tablet'); // Would need 100 packages
			const multiPack = results.find((r) => r.packageCount && r.packageCount > 1);
			
			// Should either not have multi-pack or have limited packages
			if (multiPack) {
				expect(multiPack.packageCount).toBeLessThanOrEqual(10);
			}
		});

		it('should rank multi-pack alongside single-pack options', () => {
			const ndcList: NdcInfo[] = [
				createNdcInfo('12345-678-90', 30, '30 TABLET in 1 BOTTLE'),
				createNdcInfo('12345-678-91', 60, '60 TABLET in 1 BOTTLE'), // Single-pack option
			];

			const results = selectOptimal(ndcList, 60, 'tablet');
			
			// Should have both single-pack (60) and multi-pack (2×30) options
			const singlePack = results.find((r) => r.packageCount === 1 && r.totalQuantity === 60);
			const multiPack = results.find((r) => r.packageCount === 2 && r.totalQuantity === 60);
			
			expect(singlePack).toBeDefined();
			expect(multiPack).toBeDefined();
			
			// Single-pack exact match should rank higher (100) than multi-pack exact match (95)
			if (singlePack && multiPack) {
				expect(singlePack.matchScore).toBeGreaterThan(multiPack.matchScore);
			}
		});

		it('should handle very large quantities with package limits', () => {
			const ndcList: NdcInfo[] = [
				createNdcInfo('12345-678-90', 10, '10 TABLET in 1 BOTTLE'),
			];

			const results = selectOptimal(ndcList, 1000, 'tablet'); // Very large quantity
			const multiPack = results.find((r) => r.packageCount && r.packageCount > 1);
			
			// Should respect package count limit
			if (multiPack) {
				expect(multiPack.packageCount).toBeLessThanOrEqual(10);
			}
		});

		it('should handle very small package sizes', () => {
			const ndcList: NdcInfo[] = [
				createNdcInfo('12345-678-90', 5, '5 TABLET in 1 BOTTLE'),
			];

			const results = selectOptimal(ndcList, 50, 'tablet');
			const multiPack = results.find((r) => r.packageCount && r.packageCount > 1);
			
			expect(multiPack).toBeDefined();
			if (multiPack) {
				expect(multiPack.packageCount).toBe(10); // 50 / 5 = 10 (at limit)
				expect(multiPack.totalQuantity).toBe(50); // 10 × 5 = 50
			}
		});

		it('should calculate overfill for multi-pack correctly', () => {
			const ndcList: NdcInfo[] = [
				createNdcInfo('12345-678-90', 30, '30 TABLET in 1 BOTTLE'),
			];

			const results = selectOptimal(ndcList, 85, 'tablet'); // Would need 3 packages (90 total)
			const multiPack = results.find((r) => r.packageCount && r.packageCount > 1);
			
			expect(multiPack).toBeDefined();
			if (multiPack) {
				expect(multiPack.packageCount).toBe(3); // Math.ceil(85 / 30) = 3
				expect(multiPack.totalQuantity).toBe(90); // 3 × 30 = 90
				expect(multiPack.overfill).toBe(5); // 90 - 85 = 5
				expect(multiPack.underfill).toBe(0); // Multi-pack always meets or exceeds
			}
		});

		it('should always round up package count', () => {
			const ndcList: NdcInfo[] = [
				createNdcInfo('12345-678-90', 30, '30 TABLET in 1 BOTTLE'),
			];

			const results = selectOptimal(ndcList, 61, 'tablet'); // Would need 2.033... packages
			const multiPack = results.find((r) => r.packageCount && r.packageCount > 1);
			
			expect(multiPack).toBeDefined();
			if (multiPack) {
				expect(multiPack.packageCount).toBe(3); // Math.ceil(61 / 30) = 3
				expect(multiPack.totalQuantity).toBe(90); // 3 × 30 = 90
			}
		});
	});
});

