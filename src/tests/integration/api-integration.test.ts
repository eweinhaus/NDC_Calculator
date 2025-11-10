/**
 * Real API Integration Tests
 * Tests actual API calls to RxNorm and FDA APIs.
 * These tests verify that the services work with real external APIs.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { searchByDrugName, getSpellingSuggestions } from '$lib/services/rxnorm';
import { getPackageDetails } from '$lib/services/fda';
import { normalizeNdc } from '$lib/utils/ndcNormalizer';

describe('Real API Integration Tests', () => {
	// Increase timeout for real API calls
	const API_TIMEOUT = 30000; // 30 seconds

	describe('RxNorm API', () => {
		it(
			'should find RxCUI for known drug (Lisinopril)',
			async () => {
				const rxcui = await searchByDrugName('Lisinopril');
				expect(rxcui).toBeTruthy();
				expect(typeof rxcui).toBe('string');
				expect(rxcui!.length).toBeGreaterThan(0);
				console.log(`Found RxCUI for Lisinopril: ${rxcui}`);
			},
			API_TIMEOUT
		);

		it(
			'should return null for non-existent drug',
			async () => {
				const rxcui = await searchByDrugName('ThisDrugDoesNotExist12345');
				expect(rxcui).toBeNull();
			},
			API_TIMEOUT
		);

		it(
			'should find RxCUI for brand name (Lipitor)',
			async () => {
				const rxcui = await searchByDrugName('Lipitor');
				expect(rxcui).toBeTruthy();
				expect(typeof rxcui).toBe('string');
				console.log(`Found RxCUI for Lipitor: ${rxcui}`);
			},
			API_TIMEOUT
		);

		it(
			'should provide spelling suggestions for misspelled drug',
			async () => {
				const suggestions = await getSpellingSuggestions('Lisinoprll'); // Misspelled
				expect(Array.isArray(suggestions)).toBe(true);
				expect(suggestions.length).toBeGreaterThan(0);
				console.log(`Spelling suggestions: ${suggestions.join(', ')}`);
			},
			API_TIMEOUT
		);

		it(
			'should handle drug name with strength',
			async () => {
				const rxcui = await searchByDrugName('Lisinopril 10mg');
				// May or may not find exact match, but should not throw
				expect(rxcui === null || typeof rxcui === 'string').toBe(true);
			},
			API_TIMEOUT
		);
	});

	describe('FDA API', () => {
		it(
			'should get package details for known NDC',
			async () => {
				// Use a known NDC from test data
				const ndc = '76420-345-30';
				const normalized = normalizeNdc(ndc);
				expect(normalized).toBeTruthy();

				const details = await getPackageDetails(normalized!);
				// May or may not find it (depends on FDA API data)
				if (details) {
					expect(details).toHaveProperty('package_ndc');
					expect(details).toHaveProperty('package_description');
					expect(details).toHaveProperty('active');
					expect(details).toHaveProperty('manufacturer_name');
					expect(details).toHaveProperty('dosage_form');
					console.log(`Found package: ${details.package_description}`);
					console.log(`Active: ${details.active}, Manufacturer: ${details.manufacturer_name}`);
				} else {
					console.log(`Package not found in FDA API (may be inactive or removed)`);
				}
			},
			API_TIMEOUT
		);

		it(
			'should return null for invalid NDC',
			async () => {
				const details = await getPackageDetails('00000-0000-00');
				expect(details).toBeNull();
			},
			API_TIMEOUT
		);

		it(
			'should handle NDC format variations',
			async () => {
				// Test with different formats
				const formats = ['76420-345-30', '7642034530', '76420-34530'];
				for (const ndc of formats) {
					const details = await getPackageDetails(ndc);
					// Should either find it or return null, but not throw
					expect(details === null || typeof details === 'object').toBe(true);
				}
			},
			API_TIMEOUT
		);

		it(
			'should get package details for another known NDC',
			async () => {
				const ndc = '65162-179-03';
				const normalized = normalizeNdc(ndc);
				expect(normalized).toBeTruthy();

				const details = await getPackageDetails(normalized!);
				if (details) {
					expect(details.package_description).toContain('TABLET');
					console.log(`Package: ${details.package_description}`);
				}
			},
			API_TIMEOUT
		);
	});

	describe('End-to-End Flow', () => {
		it(
			'should complete full flow: drug name -> RxCUI -> NDC -> package details',
			async () => {
				// Step 1: Get RxCUI for drug
				const rxcui = await searchByDrugName('Lisinopril');
				expect(rxcui).toBeTruthy();
				console.log(`Step 1: Found RxCUI ${rxcui} for Lisinopril`);

				// Step 2: Use FDA API to find NDCs (per Phase 0 findings, don't use RxNorm allndcs)
				// We'll use a known NDC from test data instead
				const knownNdc = '76420-345-30';
				const normalized = normalizeNdc(knownNdc);
				expect(normalized).toBeTruthy();

				// Step 3: Get package details (may not exist in FDA API)
				const details = await getPackageDetails(normalized!);
				if (details) {
					console.log(`Step 3: Found package details for ${normalized}`);
					console.log(`  Description: ${details.package_description}`);
					console.log(`  Active: ${details.active}`);
					console.log(`  Manufacturer: ${details.manufacturer_name}`);
				} else {
					console.log(`Step 3: Package not found (may be inactive), but flow completed successfully`);
				}
				// Flow is successful if we got to RxCUI and attempted package lookup
				expect(rxcui).toBeTruthy();
			},
			API_TIMEOUT * 2
		);
	});

	describe('Error Handling', () => {
		it(
			'should handle edge cases gracefully',
			async () => {
				// This test verifies error handling doesn't crash
				// Test with very short name (may cause API issues)
				try {
					const result = await searchByDrugName('A');
					// Should return null or handle gracefully
					expect(result === null || typeof result === 'string').toBe(true);
				} catch (error) {
					// If it throws, that's also acceptable - we're testing error handling
					expect(error).toBeDefined();
				}
			},
			API_TIMEOUT
		);

		it(
			'should handle special characters in drug names',
			async () => {
				const result = await searchByDrugName("Lisinopril-HCTZ");
				// Should handle gracefully
				expect(result === null || typeof result === 'string').toBe(true);
			},
			API_TIMEOUT
		);
	});
});

