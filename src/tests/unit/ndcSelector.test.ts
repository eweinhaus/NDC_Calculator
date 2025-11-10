import { describe, it, expect } from 'vitest';
import { selectOptimal } from '../../lib/core/ndcSelector';
import { NdcInfo } from '../../lib/types/ndc';

describe('NDC Selector', () => {
	const createNdcInfo = (
		ndc: string,
		packageSize: number,
		packageDescription: string,
		active: boolean = true
	): NdcInfo => ({
		ndc,
		packageSize,
		packageDescription,
		manufacturer: 'Test Manufacturer',
		dosageForm: 'TABLET',
		active,
	});

	describe('selectOptimal()', () => {
		it('should select exact match NDC', () => {
			const ndcList: NdcInfo[] = [
				createNdcInfo('12345-678-90', 30, '30 TABLET in 1 BOTTLE'),
				createNdcInfo('12345-678-91', 60, '60 TABLET in 1 BOTTLE'),
				createNdcInfo('12345-678-92', 90, '90 TABLET in 1 BOTTLE'),
			];

			const results = selectOptimal(ndcList, 30);
			expect(results.length).toBeGreaterThan(0);
			expect(results[0].ndc).toBe('12345-678-90');
			expect(results[0].matchScore).toBe(100); // Exact match
			expect(results[0].totalQuantity).toBe(30);
		});

		it('should rank NDCs by match score', () => {
			const ndcList: NdcInfo[] = [
				createNdcInfo('12345-678-90', 60, '60 TABLET in 1 BOTTLE'), // Overfill
				createNdcInfo('12345-678-91', 30, '30 TABLET in 1 BOTTLE'), // Exact match
				createNdcInfo('12345-678-92', 20, '20 TABLET in 1 BOTTLE'), // Underfill
			];

			const results = selectOptimal(ndcList, 30);
			expect(results[0].ndc).toBe('12345-678-91'); // Exact match should rank first
			expect(results[0].matchScore).toBe(100);
		});

		it('should generate multi-pack selections', () => {
			const ndcList: NdcInfo[] = [
				createNdcInfo('12345-678-90', 30, '30 TABLET in 1 BOTTLE'),
			];

			const results = selectOptimal(ndcList, 90);
			// Should have both single-pack and multi-pack options
			const multiPack = results.find((r) => r.packageCount && r.packageCount > 1);
			expect(multiPack).toBeDefined();
			if (multiPack) {
				expect(multiPack.packageCount).toBe(3); // 90 / 30 = 3
				expect(multiPack.totalQuantity).toBe(90); // 3 × 30 = 90
				expect(multiPack.overfill).toBe(0); // Exact match
			}
		});

		it('should filter out inactive NDCs', () => {
			const ndcList: NdcInfo[] = [
				createNdcInfo('12345-678-90', 30, '30 TABLET in 1 BOTTLE', true),
				createNdcInfo('12345-678-91', 30, '30 TABLET in 1 BOTTLE', false), // Inactive
				createNdcInfo('12345-678-92', 30, '30 TABLET in 1 BOTTLE', true),
			];

			const results = selectOptimal(ndcList, 30);
			// Should not include inactive NDC
			expect(results.every((r) => r.ndc !== '12345-678-91')).toBe(true);
		});

		it('should handle overfill correctly', () => {
			const ndcList: NdcInfo[] = [
				createNdcInfo('12345-678-90', 60, '60 TABLET in 1 BOTTLE'), // 100% overfill
			];

			const results = selectOptimal(ndcList, 30);
			expect(results.length).toBeGreaterThan(0);
			expect(results[0].overfill).toBe(30); // 60 - 30 = 30
			expect(results[0].matchScore).toBeLessThan(100); // Should be penalized
		});

		it('should handle underfill correctly', () => {
			const ndcList: NdcInfo[] = [
				createNdcInfo('12345-678-90', 20, '20 TABLET in 1 BOTTLE'), // Underfill
			];

			const results = selectOptimal(ndcList, 30);
			expect(results.length).toBeGreaterThan(0);
			
			// Multi-pack will rank higher (no underfill), but single-pack should have underfill
			const singlePack = results.find((r) => r.packageCount === 1);
			if (singlePack) {
				expect(singlePack.underfill).toBe(10); // 30 - 20 = 10
				expect(singlePack.matchScore).toBeLessThan(100); // Should be penalized
			}
			
			// Multi-pack should have no underfill
			const multiPack = results.find((r) => r.packageCount && r.packageCount > 1);
			if (multiPack) {
				expect(multiPack.underfill).toBe(0); // Multi-pack always meets or exceeds
			}
		});

		it('should return top N results', () => {
			const ndcList: NdcInfo[] = [
				createNdcInfo('12345-678-90', 30, '30 TABLET in 1 BOTTLE'),
				createNdcInfo('12345-678-91', 31, '31 TABLET in 1 BOTTLE'),
				createNdcInfo('12345-678-92', 32, '32 TABLET in 1 BOTTLE'),
				createNdcInfo('12345-678-93', 33, '33 TABLET in 1 BOTTLE'),
				createNdcInfo('12345-678-94', 34, '34 TABLET in 1 BOTTLE'),
				createNdcInfo('12345-678-95', 35, '35 TABLET in 1 BOTTLE'),
			];

			const results = selectOptimal(ndcList, 30, 3);
			expect(results.length).toBe(3);
		});

		it('should handle empty NDC list', () => {
			const results = selectOptimal([], 30);
			expect(results).toEqual([]);
		});

		it('should handle invalid target quantity', () => {
			const ndcList: NdcInfo[] = [
				createNdcInfo('12345-678-90', 30, '30 TABLET in 1 BOTTLE'),
			];

			const results = selectOptimal(ndcList, 0);
			expect(results).toEqual([]);

			const results2 = selectOptimal(ndcList, -1);
			expect(results2).toEqual([]);
		});

		it('should limit multi-pack to max packages', () => {
			const ndcList: NdcInfo[] = [
				createNdcInfo('12345-678-90', 1, '1 TABLET in 1 BOTTLE'), // Very small package
			];

			const results = selectOptimal(ndcList, 100); // Would need 100 packages
			// Multi-pack should be limited (max 10 packages)
			const multiPack = results.find((r) => r.packageCount && r.packageCount > 1);
			// Should either not have multi-pack or have limited packages
			if (multiPack) {
				expect(multiPack.packageCount).toBeLessThanOrEqual(10);
			}
		});

		it('should prioritize exact matches over near matches', () => {
			const ndcList: NdcInfo[] = [
				createNdcInfo('12345-678-90', 31, '31 TABLET in 1 BOTTLE'), // Near match
				createNdcInfo('12345-678-91', 30, '30 TABLET in 1 BOTTLE'), // Exact match
				createNdcInfo('12345-678-92', 32, '32 TABLET in 1 BOTTLE'), // Near match
			];

			const results = selectOptimal(ndcList, 30);
			expect(results[0].ndc).toBe('12345-678-91'); // Exact match should rank first
			expect(results[0].matchScore).toBe(100);
		});

		it('should handle NDCs with packageSize already set', () => {
			const ndcList: NdcInfo[] = [
				{
					ndc: '12345-678-90',
					packageSize: 30, // Already set
					packageDescription: '30 TABLET in 1 BOTTLE',
					manufacturer: 'Test',
					dosageForm: 'TABLET',
					active: true,
				},
			];

			const results = selectOptimal(ndcList, 30);
			expect(results.length).toBeGreaterThan(0);
			expect(results[0].packageSize).toBe(30);
		});

		it('should handle NDCs without packageSize (parse from description)', () => {
			const ndcList: NdcInfo[] = [
				{
					ndc: '12345-678-90',
					packageSize: 0, // Not set
					packageDescription: '30 TABLET in 1 BOTTLE',
					manufacturer: 'Test',
					dosageForm: 'TABLET',
					active: true,
				},
			];

			const results = selectOptimal(ndcList, 30);
			expect(results.length).toBeGreaterThan(0);
			expect(results[0].packageSize).toBe(30); // Parsed from description
		});
	});
});

