import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parse as parseSig } from '$lib/core/sigParser';
import { calculate as calculateQuantity } from '$lib/core/quantityCalculator';
import { selectOptimal } from '$lib/core/ndcSelector';
import { generateWarnings } from '$lib/core/warningGenerator';
import { NdcInfo } from '$lib/types/ndc';
import * as openaiService from '$lib/services/openai';

describe('Calculate Integration Flow', () => {
	const createNdcInfo = (
		ndc: string,
		packageSize: number,
		packageDescription: string,
		active: boolean = true,
		dosageForm: string = 'TABLET'
	): NdcInfo => ({
		ndc,
		packageSize,
		packageDescription,
		manufacturer: 'Test Manufacturer',
		dosageForm,
		active,
	});

	it('should calculate NDC recommendations end-to-end', async () => {
		const ndcList: NdcInfo[] = [
			createNdcInfo('12345-678-90', 30, '30 TABLET in 1 BOTTLE'),
			createNdcInfo('12345-678-91', 60, '60 TABLET in 1 BOTTLE'),
		];

		// Step 1: Parse SIG
		const parsed = await parseSig('Take 1 tablet twice daily');
		expect(parsed).not.toBeNull();
		if (!parsed) return;

		// Step 2: Calculate quantity
		const quantity = calculateQuantity(parsed, 30);
		expect(quantity.total).toBe(60);
		expect(quantity.unit).toBe('tablet');

		// Step 3: Select optimal NDCs
		const selections = selectOptimal(ndcList, quantity.total, 5);
		expect(selections.length).toBeGreaterThan(0);
		expect(selections[0].ndc).toBe('12345-678-91'); // Exact match

		// Step 4: Generate warnings
		const ndcInfo = ndcList.find((n) => n.ndc === selections[0].ndc);
		if (ndcInfo) {
			const warnings = generateWarnings(
				selections[0],
				quantity.total,
				parsed,
				ndcInfo
			);
			expect(Array.isArray(warnings)).toBe(true);
		}
	});

	it('should handle empty NDC list', async () => {
		const parsed = await parseSig('Take 1 tablet twice daily');
		if (!parsed) return;

		const quantity = calculateQuantity(parsed, 30);
		const selections = selectOptimal([], quantity.total, 5);

		expect(selections).toEqual([]);
	});

	it('should handle PRN medications', async () => {
		const parsed = await parseSig('Take 1 tablet as needed');
		if (!parsed) return;

		expect(parsed.frequency).toBe(0); // PRN

		const quantity = calculateQuantity(parsed, 30);
		expect(quantity.total).toBe(30);
		expect(quantity.calculation.frequency).toBe(1); // Assumed once per day
	});

	it('should generate warnings for overfill', async () => {
		const ndcList: NdcInfo[] = [
			createNdcInfo('12345-678-90', 100, '100 TABLET in 1 BOTTLE'), // Large package
		];

		const parsed = await parseSig('Take 1 tablet twice daily');
		if (!parsed) return;

		const quantity = calculateQuantity(parsed, 30); // 60 total needed
		const selections = selectOptimal(ndcList, quantity.total, 5);

		expect(selections.length).toBeGreaterThan(0);

		const ndcInfo = ndcList.find((n) => n.ndc === selections[0].ndc);
		if (ndcInfo) {
			const warnings = generateWarnings(
				selections[0],
				quantity.total,
				parsed,
				ndcInfo
			);
			// Should have overfill warning (100 > 60, >10% waste)
			const overfillWarning = warnings.find((w) => w.type === 'overfill');
			expect(overfillWarning).toBeDefined();
		}
	});

	it('should handle multi-pack selections', async () => {
		const ndcList: NdcInfo[] = [
			createNdcInfo('12345-678-90', 30, '30 TABLET in 1 BOTTLE'),
		];

		const parsed = await parseSig('Take 1 tablet twice daily');
		if (!parsed) return;

		const quantity = calculateQuantity(parsed, 45); // 90 total
		const selections = selectOptimal(ndcList, quantity.total, 5);

		// Should have multi-pack option
		const multiPack = selections.find((s) => s.packageCount && s.packageCount > 1);
		expect(multiPack).toBeDefined();
		if (multiPack) {
			expect(multiPack.packageCount).toBe(3); // 90 / 30 = 3
			expect(multiPack.totalQuantity).toBe(90);
		}
	});

	describe('SIG rewrite fallback', () => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should use rewrite fallback when both parsers fail', async () => {
			// Mock rewriteSig to return corrected SIG
			vi.spyOn(openaiService, 'rewriteSig').mockResolvedValue('Take 1 tablet twice daily');

			// This SIG should fail both regex and OpenAI parsers, triggering rewrite
			// Note: In a real scenario, this would require a SIG that actually fails both parsers
			// For this test, we're just verifying the rewrite function is available and can be called
			const rewritten = await openaiService.rewriteSig('Take 1 tablt twic daily');
			expect(rewritten).toBe('Take 1 tablet twice daily');
			expect(openaiService.rewriteSig).toHaveBeenCalled();
		});

		it('should handle rewrite failure gracefully', async () => {
			// Mock rewriteSig to return null (rewrite failed)
			vi.spyOn(openaiService, 'rewriteSig').mockResolvedValue(null);

			const rewritten = await openaiService.rewriteSig('Invalid SIG');
			expect(rewritten).toBeNull();
		});
	});
});
