/**
 * Retry utility with exponential backoff for handling transient errors.
 */

import { logger } from './logger.js';

export interface RetryOptions {
	maxAttempts: number;
	initialDelayMs: number;
	maxDelayMs: number;
	backoffMultiplier: number;
}

const DEFAULT_OPTIONS: RetryOptions = {
	maxAttempts: 3,
	initialDelayMs: 1000,
	maxDelayMs: 10000,
	backoffMultiplier: 2
};

/**
 * Check if an error should trigger a retry.
 * Retries on: network errors, timeouts, 500-599 status codes, 429 (rate limit)
 * Doesn't retry on: 400-499 (except 429), invalid responses, parsing errors
 */
export function shouldRetry(error: unknown): boolean {
	// Network errors and timeouts
	if (error instanceof TypeError && error.message.includes('fetch')) {
		return true;
	}

	// Timeout errors
	if (error instanceof Error && (error.name === 'TimeoutError' || error.message.includes('timeout'))) {
		return true;
	}

	// Response errors (from fetch)
	if (error && typeof error === 'object' && 'status' in error) {
		const status = (error as { status: number }).status;
		// Retry on 5xx errors and 429 (rate limit)
		if (status >= 500 || status === 429) {
			return true;
		}
		// Don't retry on 4xx errors (except 429)
		if (status >= 400 && status < 500) {
			return false;
		}
	}

	// Unknown errors - don't retry by default
	return false;
}

/**
 * Sleep for specified milliseconds.
 */
function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate delay for retry attempt using exponential backoff.
 */
function calculateDelay(attempt: number, options: RetryOptions): number {
	const delay = options.initialDelayMs * Math.pow(options.backoffMultiplier, attempt);
	return Math.min(delay, options.maxDelayMs);
}

/**
 * Retry a function with exponential backoff.
 * @param fn - Function to retry
 * @param options - Retry options (partial, will be merged with defaults)
 * @returns Promise that resolves with the function result
 */
export async function withRetry<T>(
	fn: () => Promise<T>,
	options?: Partial<RetryOptions>
): Promise<T> {
	const retryOptions: RetryOptions = { ...DEFAULT_OPTIONS, ...options };
	let lastError: unknown;

	for (let attempt = 0; attempt < retryOptions.maxAttempts; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error;

			// Check if we should retry
			if (!shouldRetry(error)) {
				logger.debug('Error is not retryable', error as Error, {
					attempt: attempt + 1,
					maxAttempts: retryOptions.maxAttempts
				});
				throw error;
			}

			// If this is the last attempt, don't retry
			if (attempt === retryOptions.maxAttempts - 1) {
				logger.warn('Max retry attempts reached', error as Error, {
					attempt: attempt + 1,
					maxAttempts: retryOptions.maxAttempts
				});
				throw error;
			}

			// Calculate delay and wait
			const delay = calculateDelay(attempt, retryOptions);
			logger.info(`Retry attempt ${attempt + 2}/${retryOptions.maxAttempts} after ${delay}ms`, undefined, {
				attempt: attempt + 2,
				maxAttempts: retryOptions.maxAttempts,
				delay
			});

			await sleep(delay);
		}
	}

	// This should never be reached, but TypeScript needs it
	throw lastError;
}

