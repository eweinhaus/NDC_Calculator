import { describe, it, expect } from 'vitest';
import { generateWarnings } from '../../lib/core/warningGenerator';
import { NdcSelection } from '../../lib/types/ndc';
import { ParsedSig } from '../../lib/types/sig';
import { NdcInfo } from '../../lib/types/ndc';

describe('Warning Generator', () => {
	const createNdcInfo = (
		ndc: string,
		active: boolean = true,
		dosageForm: string = 'TABLET'
	): NdcInfo => ({
		ndc,
		packageSize: 30,
		packageDescription: '30 TABLET in 1 BOTTLE',
		manufacturer: 'Test Manufacturer',
		dosageForm,
		active,
	});

	const createSelection = (
		ndc: string,
		totalQuantity: number,
		overfill: number = 0,
		underfill: number = 0,
		packageCount: number = 1
	): NdcSelection => ({
		ndc,
		packageSize: 30,
		packageCount,
		totalQuantity,
		overfill,
		underfill,
		matchScore: 100,
		packageDescription: '30 TABLET in 1 BOTTLE',
		manufacturer: 'Test Manufacturer',
	});

	const createParsedSig = (unit: string = 'tablet'): ParsedSig => ({
		dosage: 1,
		frequency: 2,
		unit,
		confidence: 0.9,
	});

	describe('generateWarnings()', () => {
		it('should generate inactive NDC warning', () => {
			const selection = createSelection('12345-678-90', 30);
			const parsedSig = createParsedSig();
			const ndcInfo = createNdcInfo('12345-678-90', false); // Inactive

			const warnings = generateWarnings(selection, 30, parsedSig, ndcInfo);

			expect(warnings.length).toBeGreaterThan(0);
			const inactiveWarning = warnings.find((w) => w.type === 'inactive_ndc');
			expect(inactiveWarning).toBeDefined();
			expect(inactiveWarning?.severity).toBe('error');
			expect(inactiveWarning?.message).toContain('inactive');
		});

		it('should generate overfill warning when >10%', () => {
			const selection = createSelection('12345-678-90', 60, 30); // 50% overfill
			const parsedSig = createParsedSig();
			const ndcInfo = createNdcInfo('12345-678-90');

			const warnings = generateWarnings(selection, 30, parsedSig, ndcInfo);

			const overfillWarning = warnings.find((w) => w.type === 'overfill');
			expect(overfillWarning).toBeDefined();
			expect(overfillWarning?.severity).toBe('warning');
			expect(overfillWarning?.message).toContain('waste');
		});

		it('should not generate overfill warning when ≤10%', () => {
			const selection = createSelection('12345-678-90', 33, 3); // 10% overfill
			const parsedSig = createParsedSig();
			const ndcInfo = createNdcInfo('12345-678-90');

			const warnings = generateWarnings(selection, 30, parsedSig, ndcInfo);

			const overfillWarning = warnings.find((w) => w.type === 'overfill');
			expect(overfillWarning).toBeUndefined();
		});

		it('should generate underfill warning for single-pack', () => {
			const selection = createSelection('12345-678-90', 20, 0, 10); // Underfill
			const parsedSig = createParsedSig();
			const ndcInfo = createNdcInfo('12345-678-90');

			const warnings = generateWarnings(selection, 30, parsedSig, ndcInfo);

			const underfillWarning = warnings.find((w) => w.type === 'underfill');
			expect(underfillWarning).toBeDefined();
			expect(underfillWarning?.severity).toBe('warning');
			expect(underfillWarning?.message).toContain('insufficient');
		});

		it('should not generate underfill warning for multi-pack', () => {
			const selection = createSelection('12345-678-90', 60, 0, 0, 2); // Multi-pack
			const parsedSig = createParsedSig();
			const ndcInfo = createNdcInfo('12345-678-90');

			const warnings = generateWarnings(selection, 30, parsedSig, ndcInfo);

			const underfillWarning = warnings.find((w => w.type === 'underfill'));
			expect(underfillWarning).toBeUndefined(); // Multi-pack always meets target
		});

		it('should generate dosage form mismatch warning', () => {
			const selection = createSelection('12345-678-90', 30);
			const parsedSig = createParsedSig('tablet');
			const ndcInfo = createNdcInfo('12345-678-90', true, 'CAPSULE'); // Mismatch

			const warnings = generateWarnings(selection, 30, parsedSig, ndcInfo);

			const mismatchWarning = warnings.find((w) => w.type === 'dosage_form_mismatch');
			expect(mismatchWarning).toBeDefined();
			expect(mismatchWarning?.severity).toBe('warning');
			expect(mismatchWarning?.message).toContain('verify');
		});

		it('should not generate dosage form mismatch when forms match', () => {
			const selection = createSelection('12345-678-90', 30);
			const parsedSig = createParsedSig('tablet');
			const ndcInfo = createNdcInfo('12345-678-90', true, 'TABLET'); // Match

			const warnings = generateWarnings(selection, 30, parsedSig, ndcInfo);

			const mismatchWarning = warnings.find((w) => w.type === 'dosage_form_mismatch');
			expect(mismatchWarning).toBeUndefined();
		});

		it('should generate multiple warnings', () => {
			const selection = createSelection('12345-678-90', 60, 30); // Overfill
			const parsedSig = createParsedSig('tablet');
			const ndcInfo = createNdcInfo('12345-678-90', false, 'CAPSULE'); // Inactive + mismatch

			const warnings = generateWarnings(selection, 30, parsedSig, ndcInfo);

			expect(warnings.length).toBeGreaterThanOrEqual(2);
			expect(warnings.some((w) => w.type === 'inactive_ndc')).toBe(true);
			expect(warnings.some((w) => w.type === 'overfill')).toBe(true);
		});

		it('should not generate warnings for good matches', () => {
			const selection = createSelection('12345-678-90', 30); // Exact match
			const parsedSig = createParsedSig('tablet');
			const ndcInfo = createNdcInfo('12345-678-90', true, 'TABLET'); // Active + match

			const warnings = generateWarnings(selection, 30, parsedSig, ndcInfo);

			expect(warnings.length).toBe(0);
		});

		it('should handle liquid units correctly', () => {
			const selection = createSelection('12345-678-90', 100);
			const parsedSig = createParsedSig('mL');
			const ndcInfo = createNdcInfo('12345-678-90', true, 'LIQUID'); // Match

			const warnings = generateWarnings(selection, 100, parsedSig, ndcInfo);

			const mismatchWarning = warnings.find((w) => w.type === 'dosage_form_mismatch');
			expect(mismatchWarning).toBeUndefined();
		});

		it('should handle unit variations', () => {
			const testCases = [
				{ unit: 'tablet', form: 'TABLET', shouldMatch: true },
				{ unit: 'capsule', form: 'CAPSULE', shouldMatch: true },
				{ unit: 'ml', form: 'LIQUID', shouldMatch: true },
				{ unit: 'unit', form: 'INJECTION', shouldMatch: true },
				{ unit: 'tablet', form: 'CAPSULE', shouldMatch: false },
			];

			for (const testCase of testCases) {
				const selection = createSelection('12345-678-90', 30);
				const parsedSig = createParsedSig(testCase.unit);
				const ndcInfo = createNdcInfo('12345-678-90', true, testCase.form);

				const warnings = generateWarnings(selection, 30, parsedSig, ndcInfo);
				const mismatchWarning = warnings.find((w) => w.type === 'dosage_form_mismatch');

				if (testCase.shouldMatch) {
					expect(mismatchWarning).toBeUndefined();
				} else {
					expect(mismatchWarning).toBeDefined();
				}
			}
		});
	});
});

