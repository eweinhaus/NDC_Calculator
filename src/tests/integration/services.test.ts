/**
 * Integration tests for API services.
 * Tests service interactions, caching, retry logic, and request deduplication.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { searchByDrugName, getAllNdcs, getSpellingSuggestions } from '$lib/services/rxnorm';
import { getPackageDetails, getAllPackages } from '$lib/services/fda';
import { parseSig } from '$lib/services/openai';
import { cache } from '$lib/services/cache';

// Mock fetch globally
const originalFetch = global.fetch;

describe('API Services Integration', () => {
	beforeEach(() => {
		vi.stubGlobal('fetch', vi.fn());
		// Clear cache before each test
		cache.clear();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		global.fetch = originalFetch;
	});

	describe('RxNorm Service', () => {
		it('should search for drug name and return RxCUI', async () => {
			const mockResponse = {
				idGroup: {
					rxnormId: ['29046']
				}
			};

			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse
			});

			const rxcui = await searchByDrugName('Lisinopril');
			expect(rxcui).toBe('29046');
			expect(global.fetch).toHaveBeenCalledTimes(1);
		});

		it('should cache drug name lookup', async () => {
			const mockResponse = {
				idGroup: {
					rxnormId: ['29046']
				}
			};

			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
				ok: true,
				json: async () => mockResponse
			});

			// First call
			const rxcui1 = await searchByDrugName('Lisinopril');
			expect(rxcui1).toBe('29046');
			expect(global.fetch).toHaveBeenCalledTimes(1);

			// Second call should use cache
			const rxcui2 = await searchByDrugName('Lisinopril');
			expect(rxcui2).toBe('29046');
			expect(global.fetch).toHaveBeenCalledTimes(1); // Still 1, cache hit
		});

		it('should return null for drug not found', async () => {
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				ok: true,
				json: async () => ({})
			});

			const rxcui = await searchByDrugName('NonexistentDrug');
			expect(rxcui).toBeNull();
		});

		it('should get spelling suggestions', async () => {
			const mockResponse = {
				suggestionGroup: {
					suggestionList: {
						suggestion: ['lisinopril']
					}
				}
			};

			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse
			});

			const suggestions = await getSpellingSuggestions('Lisnopril');
			expect(suggestions).toEqual(['lisinopril']);
		});

		it('should handle getAllNdcs (may return empty)', async () => {
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				ok: true,
				json: async () => ({}) // RxNorm often returns empty
			});

			const ndcs = await getAllNdcs('29046');
			expect(Array.isArray(ndcs)).toBe(true);
		});
	});

	describe('FDA Service', () => {
		it('should get package details for NDC', async () => {
			const mockResponse = {
				results: [
					{
						product_ndc: '76420-345',
						labeler_name: 'Test Manufacturer',
						dosage_form: 'TABLET',
						listing_expiration_date: '20261231',
						packaging: [
							{
								package_ndc: '76420-345-00',
								description: '1000 TABLET in 1 BOTTLE (76420-345-00)'
							}
						],
						openfda: {
							rxcui: ['29046']
						}
					}
				]
			};

			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse
			});

			const packageDetails = await getPackageDetails('76420-345-00');
			expect(packageDetails).not.toBeNull();
			expect(packageDetails?.package_ndc).toBe('76420-345-00');
			expect(packageDetails?.active).toBe(true);
		});

		it('should cache package details', async () => {
			const mockResponse = {
				results: [
					{
						product_ndc: '76420-345',
						labeler_name: 'Test Manufacturer',
						dosage_form: 'TABLET',
						listing_expiration_date: '20261231',
						packaging: [
							{
								package_ndc: '76420-345-00',
								description: '1000 TABLET in 1 BOTTLE'
							}
						]
					}
				]
			};

			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
				ok: true,
				json: async () => mockResponse
			});

			// First call
			const pkg1 = await getPackageDetails('76420-345-00');
			expect(pkg1).not.toBeNull();
			expect(global.fetch).toHaveBeenCalledTimes(1);

			// Second call should use cache
			const pkg2 = await getPackageDetails('76420-345-00');
			expect(pkg2).not.toBeNull();
			expect(global.fetch).toHaveBeenCalledTimes(1); // Still 1, cache hit
		});

		it('should return null for NDC not found', async () => {
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				ok: true,
				json: async () => ({ results: [] })
			});

			const packageDetails = await getPackageDetails('00000-0000-00');
			expect(packageDetails).toBeNull();
		});

		it('should get all packages for product NDC', async () => {
			const mockResponse = {
				results: [
					{
						product_ndc: '76420-345',
						labeler_name: 'Test Manufacturer',
						dosage_form: 'TABLET',
						listing_expiration_date: '20261231',
						packaging: [
							{
								package_ndc: '76420-345-00',
								description: '1000 TABLET in 1 BOTTLE'
							},
							{
								package_ndc: '76420-345-01',
								description: '500 TABLET in 1 BOTTLE'
							}
						]
					}
				]
			};

			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse
			});

			const packages = await getAllPackages('76420-345');
			expect(packages.length).toBe(2);
		});
	});

	describe('OpenAI Service', () => {
		beforeEach(() => {
			process.env.OPENAI_API_KEY = 'test-key';
		});

		afterEach(() => {
			delete process.env.OPENAI_API_KEY;
		});

		it('should parse SIG using OpenAI', async () => {
			const mockResponse = {
				choices: [
					{
						message: {
							content: JSON.stringify({
								dosage: 1,
								frequency: 2,
								unit: 'tablet',
								confidence: 0.95
							})
						}
					}
				]
			};

			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse
			});

			const parsed = await parseSig('Take 1 tablet twice daily');
			expect(parsed.dosage).toBe(1);
			expect(parsed.frequency).toBe(2);
			expect(parsed.unit).toBe('tablet');
			expect(parsed.confidence).toBe(0.95);
		});

		it('should cache SIG parsing results', async () => {
			const mockResponse = {
				choices: [
					{
						message: {
							content: JSON.stringify({
								dosage: 1,
								frequency: 2,
								unit: 'tablet',
								confidence: 0.95
							})
						}
					}
				]
			};

			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
				ok: true,
				json: async () => mockResponse
			});

			// First call
			const parsed1 = await parseSig('Take 1 tablet twice daily');
			expect(parsed1).not.toBeNull();
			expect(global.fetch).toHaveBeenCalledTimes(1);

			// Second call should use cache
			const parsed2 = await parseSig('Take 1 tablet twice daily');
			expect(parsed2).not.toBeNull();
			expect(global.fetch).toHaveBeenCalledTimes(1); // Still 1, cache hit
		});

		it('should handle markdown code blocks in response', async () => {
			const mockResponse = {
				choices: [
					{
						message: {
							content: '```json\n' + JSON.stringify({
								dosage: 1,
								frequency: 2,
								unit: 'tablet',
								confidence: 0.95
							}) + '\n```'
						}
					}
				]
			};

			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse
			});

			const parsed = await parseSig('Take 1 tablet twice daily');
			expect(parsed.dosage).toBe(1);
			expect(parsed.frequency).toBe(2);
		});

		it('should throw error if API key not set', async () => {
			delete process.env.OPENAI_API_KEY;

			await expect(parseSig('Take 1 tablet twice daily')).rejects.toThrow('OPENAI_API_KEY');
		});
	});

	describe('Request Deduplication', () => {
		it('should deduplicate concurrent requests', async () => {
			const mockResponse = {
				idGroup: {
					rxnormId: ['29046']
				}
			};

			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse
			});

			// Start two concurrent requests
			const [rxcui1, rxcui2] = await Promise.all([
				searchByDrugName('Lisinopril'),
				searchByDrugName('Lisinopril')
			]);

			expect(rxcui1).toBe('29046');
			expect(rxcui2).toBe('29046');
			// Should only call API once (deduplicated)
			expect(global.fetch).toHaveBeenCalledTimes(1);
		});
	});

	describe('Error Handling', () => {
		it('should handle network errors with retry', async () => {
			// First two calls fail, third succeeds
			(global.fetch as ReturnType<typeof vi.fn>)
				.mockRejectedValueOnce(new TypeError('fetch failed'))
				.mockRejectedValueOnce(new TypeError('fetch failed'))
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						idGroup: {
							rxnormId: ['29046']
						}
					})
				});

			// Use fake timers for retry delays
			vi.useFakeTimers();
			const promise = searchByDrugName('Lisinopril');

			// Advance timers to allow retries
			await vi.advanceTimersByTimeAsync(3000);

			const rxcui = await promise;
			expect(rxcui).toBe('29046');
			expect(global.fetch).toHaveBeenCalledTimes(3); // Retried twice

			vi.useRealTimers();
		});

		it('should not retry on 404 errors', async () => {
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				ok: false,
				status: 404
			});

			// Should not throw, but return null or empty
			await expect(searchByDrugName('Nonexistent')).resolves.toBeNull();
			expect(global.fetch).toHaveBeenCalledTimes(1); // No retry
		});
	});
});

