import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withRetry, shouldRetry } from '$lib/utils/retry';

describe('retry', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	describe('withRetry', () => {
		it('should return result on first attempt if successful', async () => {
			const fn = vi.fn().mockResolvedValue('success');
			const result = await withRetry(fn);
			expect(result).toBe('success');
			expect(fn).toHaveBeenCalledTimes(1);
		});

		it('should retry on transient errors', async () => {
			// Use TypeError with 'fetch' to match shouldRetry logic
			const fn = vi
				.fn()
				.mockRejectedValueOnce(new TypeError('fetch failed'))
				.mockResolvedValueOnce('success');

			const promise = withRetry(fn, { initialDelayMs: 100, maxAttempts: 3 });
			await vi.advanceTimersByTimeAsync(100);
			const result = await promise;

			expect(result).toBe('success');
			expect(fn).toHaveBeenCalledTimes(2);
		});

		it('should respect max attempts', async () => {
			// Use real timers for this test to avoid fake timer issues
			vi.useRealTimers();
			
			// Use TypeError with 'fetch' to match shouldRetry logic
			const error = new TypeError('fetch failed');
			const fn = vi.fn().mockRejectedValue(error);

			// Wait for promise to reject - use expect().rejects to properly handle async rejection
			await expect(withRetry(fn, { initialDelayMs: 10, maxAttempts: 3 })).rejects.toThrow();
			
			expect(fn).toHaveBeenCalledTimes(3);
			
			// Restore fake timers for other tests
			vi.useFakeTimers();
		});

		it('should use exponential backoff', async () => {
			// Use TypeError with 'fetch' to match shouldRetry logic
			const fn = vi
				.fn()
				.mockRejectedValueOnce(new TypeError('fetch failed'))
				.mockRejectedValueOnce(new TypeError('fetch failed'))
				.mockResolvedValueOnce('success');

			const promise = withRetry(fn, {
				initialDelayMs: 100,
				maxAttempts: 3,
				backoffMultiplier: 2
			});

			// First retry after 100ms
			await vi.advanceTimersByTimeAsync(100);
			expect(fn).toHaveBeenCalledTimes(2);

			// Second retry after 200ms (100 * 2^1)
			await vi.advanceTimersByTimeAsync(200);
			expect(fn).toHaveBeenCalledTimes(3);

			const result = await promise;
			expect(result).toBe('success');
		});

		it('should not retry on non-retryable errors', async () => {
			const error = { status: 404 };
			const fn = vi.fn().mockRejectedValue(error);

			await expect(withRetry(fn)).rejects.toEqual(error);
			expect(fn).toHaveBeenCalledTimes(1);
		});

		it('should retry on 500 errors', async () => {
			const fn = vi
				.fn()
				.mockRejectedValueOnce({ status: 500 })
				.mockResolvedValueOnce('success');

			const promise = withRetry(fn, { initialDelayMs: 100, maxAttempts: 3 });
			await vi.advanceTimersByTimeAsync(100);
			const result = await promise;

			expect(result).toBe('success');
			expect(fn).toHaveBeenCalledTimes(2);
		});

		it('should retry on 429 rate limit errors', async () => {
			const fn = vi
				.fn()
				.mockRejectedValueOnce({ status: 429 })
				.mockResolvedValueOnce('success');

			const promise = withRetry(fn, { initialDelayMs: 100, maxAttempts: 3 });
			await vi.advanceTimersByTimeAsync(100);
			const result = await promise;

			expect(result).toBe('success');
			expect(fn).toHaveBeenCalledTimes(2);
		});

		it('should respect max delay', async () => {
			// Use TypeError with 'fetch' to match shouldRetry logic
			const fn = vi
				.fn()
				.mockRejectedValueOnce(new TypeError('fetch failed'))
				.mockResolvedValueOnce('success');

			const promise = withRetry(fn, {
				initialDelayMs: 1000,
				maxDelayMs: 2000,
				maxAttempts: 3,
				backoffMultiplier: 10 // Would be 10000ms without max
			});

			await vi.advanceTimersByTimeAsync(2000); // Should cap at maxDelayMs
			const result = await promise;

			expect(result).toBe('success');
		});
	});

	describe('shouldRetry', () => {
		it('should retry on network errors', () => {
			const error = new TypeError('fetch failed');
			expect(shouldRetry(error)).toBe(true);
		});

		it('should retry on timeout errors', () => {
			const error = new Error('Request timeout');
			expect(shouldRetry(error)).toBe(true);
		});

		it('should retry on 500 errors', () => {
			expect(shouldRetry({ status: 500 })).toBe(true);
			expect(shouldRetry({ status: 503 })).toBe(true);
		});

		it('should retry on 429 rate limit errors', () => {
			expect(shouldRetry({ status: 429 })).toBe(true);
		});

		it('should not retry on 400 errors', () => {
			expect(shouldRetry({ status: 400 })).toBe(false);
			expect(shouldRetry({ status: 404 })).toBe(false);
		});

		it('should not retry on unknown errors', () => {
			expect(shouldRetry(new Error('Unknown error'))).toBe(false);
			expect(shouldRetry('string error')).toBe(false);
		});
	});
});

