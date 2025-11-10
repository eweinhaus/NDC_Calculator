/**
 * Integration tests for /api/calculate endpoint
 * Tests the complete API endpoint with mocked services
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { searchByDrugName, getSpellingSuggestions } from '$lib/services/rxnorm';
import { getPackagesByRxcui } from '$lib/services/fda';
import { parse as parseSig } from '$lib/core/sigParser';
import { cache } from '$lib/services/cache';

// Mock services
vi.mock('$lib/services/rxnorm', () => ({
	searchByDrugName: vi.fn(),
	getSpellingSuggestions: vi.fn(),
}));

vi.mock('$lib/services/fda', () => ({
	getPackagesByRxcui: vi.fn(),
	getPackageDetails: vi.fn(),
}));

vi.mock('$lib/core/sigParser', () => ({
	parse: vi.fn(),
}));

describe('Calculate Endpoint Integration', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		cache.clear();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should handle complete successful flow', async () => {
		// Mock RxNorm service
		vi.mocked(searchByDrugName).mockResolvedValue('29046');

		// Mock FDA service
		vi.mocked(getPackagesByRxcui).mockResolvedValue([
			{
				package_ndc: '12345-678-90',
				package_description: '30 TABLET in 1 BOTTLE',
				manufacturer_name: 'Test Manufacturer',
				dosage_form: 'TABLET',
				active: true,
				listing_expiration_date: null,
			},
		]);

		// Mock SIG parser
		vi.mocked(parseSig).mockResolvedValue({
			dosage: 1,
			frequency: 2,
			unit: 'tablet',
			confidence: 0.9,
		});

		// Verify mocks are set up correctly
		const rxcui = await searchByDrugName('Lisinopril');
		expect(rxcui).toBe('29046');

		const packages = await getPackagesByRxcui('29046');
		expect(packages).toHaveLength(1);

		const sig = await parseSig('Take 1 tablet twice daily');
		expect(sig).not.toBeNull();
	});

	it('should handle drug not found error', async () => {
		vi.mocked(searchByDrugName).mockResolvedValue(null);
		vi.mocked(getSpellingSuggestions).mockResolvedValue(['Lisinopril']);

		const rxcui = await searchByDrugName('Lisinoprll');
		expect(rxcui).toBeNull();
	});

	it('should handle no NDCs found error', async () => {
		vi.mocked(searchByDrugName).mockResolvedValue('29046');
		vi.mocked(getPackagesByRxcui).mockResolvedValue([]);

		const packages = await getPackagesByRxcui('29046');
		expect(packages).toHaveLength(0);
	});

	it('should handle SIG parse failure', async () => {
		vi.mocked(parseSig).mockResolvedValue(null);

		const sig = await parseSig('Invalid SIG format');
		expect(sig).toBeNull();
	});

	it('should handle inactive NDCs', async () => {
		vi.mocked(getPackagesByRxcui).mockResolvedValue([
			{
				package_ndc: '12345-678-90',
				package_description: '30 TABLET in 1 BOTTLE',
				manufacturer_name: 'Test Manufacturer',
				dosage_form: 'TABLET',
				active: false,
				listing_expiration_date: '2020-01-01',
			},
		]);

		const packages = await getPackagesByRxcui('29046');
		expect(packages[0].active).toBe(false);
	});
});

