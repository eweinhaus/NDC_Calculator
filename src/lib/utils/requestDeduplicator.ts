/**
 * Request deduplicator to coalesce identical concurrent requests.
 * Prevents duplicate API calls when multiple components request the same data simultaneously.
 */

import { logger } from './logger.js';

/**
 * Pending request tracking.
 */
interface PendingRequest<T> {
	promise: Promise<T>;
	timestamp: number;
}

/**
 * Request deduplicator class.
 */
class RequestDeduplicator {
	private pendingRequests: Map<string, PendingRequest<unknown>>;
	private maxAge: number; // Maximum age for pending requests (5 minutes)

	constructor(maxAge: number = 5 * 60 * 1000) {
		this.pendingRequests = new Map();
		this.maxAge = maxAge;
	}

	/**
	 * Clean up stale requests.
	 */
	private cleanupStale(): void {
		const now = Date.now();
		for (const [key, request] of this.pendingRequests.entries()) {
			if (now - request.timestamp > this.maxAge) {
				this.pendingRequests.delete(key);
				logger.debug(`Removed stale pending request: ${key}`);
			}
		}
	}

	/**
	 * Deduplicate concurrent requests.
	 * If a request with the same key is already in flight, returns the same promise.
	 * Otherwise, executes the request function and caches the promise.
	 *
	 * @param key - Unique identifier for the request
	 * @param requestFn - Function that returns a promise
	 * @returns Promise that resolves with the request result
	 */
	async deduplicate<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
		this.cleanupStale();

		// Check if request is already in flight
		const existing = this.pendingRequests.get(key) as PendingRequest<T> | undefined;
		if (existing) {
			logger.debug(`Request deduplicated: ${key}`);
			return existing.promise;
		}

		// Create new request
		const promise = requestFn()
			.then((result) => {
				// Remove from pending on success
				this.pendingRequests.delete(key);
				logger.debug(`Request completed: ${key}`);
				return result;
			})
			.catch((error) => {
				// Remove from pending on error (don't cache failed requests)
				this.pendingRequests.delete(key);
				logger.debug(`Request failed: ${key}`);
				throw error;
			});

		// Store pending request
		this.pendingRequests.set(key, {
			promise,
			timestamp: Date.now()
		});

		return promise;
	}

	/**
	 * Clear all pending requests (useful for testing).
	 */
	clear(): void {
		this.pendingRequests.clear();
	}
}

/**
 * Singleton request deduplicator instance.
 */
export const requestDeduplicator = new RequestDeduplicator();

/**
 * Deduplicate concurrent requests (convenience function).
 */
export async function deduplicate<T>(
	key: string,
	requestFn: () => Promise<T>
): Promise<T> {
	return requestDeduplicator.deduplicate(key, requestFn);
}

