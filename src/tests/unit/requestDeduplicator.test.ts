import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deduplicate, requestDeduplicator } from '$lib/utils/requestDeduplicator';

describe('requestDeduplicator', () => {
	beforeEach(() => {
		requestDeduplicator.clear();
	});

	describe('deduplicate', () => {
		it('should execute request function if not in flight', async () => {
			const requestFn = vi.fn().mockResolvedValue('result');
			const result = await deduplicate('key1', requestFn);
			expect(result).toBe('result');
			expect(requestFn).toHaveBeenCalledTimes(1);
		});

		it('should return same promise for concurrent identical requests', async () => {
			let resolveFn: (value: string) => void;
			const requestFn = vi.fn().mockImplementation(
				() =>
					new Promise<string>((resolve) => {
						resolveFn = resolve;
					})
			);

			// Start two concurrent requests
			const promise1 = deduplicate('key1', requestFn);
			const promise2 = deduplicate('key1', requestFn);

			// Should only call requestFn once
			expect(requestFn).toHaveBeenCalledTimes(1);

			// Resolve the request
			resolveFn!('result');

			// Both promises should resolve to the same result
			const [result1, result2] = await Promise.all([promise1, promise2]);
			expect(result1).toBe('result');
			expect(result2).toBe('result');
		});

		it('should handle different keys separately', async () => {
			const requestFn1 = vi.fn().mockResolvedValue('result1');
			const requestFn2 = vi.fn().mockResolvedValue('result2');

			const [result1, result2] = await Promise.all([
				deduplicate('key1', requestFn1),
				deduplicate('key2', requestFn2)
			]);

			expect(result1).toBe('result1');
			expect(result2).toBe('result2');
			expect(requestFn1).toHaveBeenCalledTimes(1);
			expect(requestFn2).toHaveBeenCalledTimes(1);
		});

		it('should propagate errors to all waiting promises', async () => {
			const error = new Error('Request failed');
			const requestFn = vi.fn().mockRejectedValue(error);

			// Start two concurrent requests
			const promise1 = deduplicate('key1', requestFn);
			const promise2 = deduplicate('key1', requestFn);

			// Both should reject with the same error
			await expect(promise1).rejects.toThrow('Request failed');
			await expect(promise2).rejects.toThrow('Request failed');
			expect(requestFn).toHaveBeenCalledTimes(1);
		});

		it('should allow retry after failed request', async () => {
			const error = new Error('Request failed');
			const requestFn1 = vi.fn().mockRejectedValueOnce(error);
			const requestFn2 = vi.fn().mockResolvedValue('success');

			// First request fails
			await expect(deduplicate('key1', requestFn1)).rejects.toThrow('Request failed');

			// Second request should execute (not deduplicated)
			const result = await deduplicate('key1', requestFn2);
			expect(result).toBe('success');
			expect(requestFn1).toHaveBeenCalledTimes(1);
			expect(requestFn2).toHaveBeenCalledTimes(1);
		});

		it('should handle multiple concurrent requests for same key', async () => {
			let resolveFn: (value: string) => void;
			const requestFn = vi.fn().mockImplementation(
				() =>
					new Promise<string>((resolve) => {
						resolveFn = resolve;
					})
			);

			// Start 5 concurrent requests
			const promises = Array.from({ length: 5 }, () => deduplicate('key1', requestFn));

			// Should only call requestFn once
			expect(requestFn).toHaveBeenCalledTimes(1);

			// Resolve the request
			resolveFn!('result');

			// All promises should resolve to the same result
			const results = await Promise.all(promises);
			results.forEach((result) => {
				expect(result).toBe('result');
			});
		});

		it('should clean up after request completes', async () => {
			const requestFn = vi.fn().mockResolvedValue('result');

			await deduplicate('key1', requestFn);
			expect(requestFn).toHaveBeenCalledTimes(1);

			// Second call should execute again (not deduplicated)
			await deduplicate('key1', requestFn);
			expect(requestFn).toHaveBeenCalledTimes(2);
		});

		it('should clean up after request fails', async () => {
			const error = new Error('Request failed');
			const requestFn = vi.fn().mockRejectedValue(error);

			await expect(deduplicate('key1', requestFn)).rejects.toThrow('Request failed');

			// Second call should execute again (not deduplicated)
			const requestFn2 = vi.fn().mockResolvedValue('success');
			const result = await deduplicate('key1', requestFn2);
			expect(result).toBe('success');
			expect(requestFn2).toHaveBeenCalledTimes(1);
		});
	});
});

