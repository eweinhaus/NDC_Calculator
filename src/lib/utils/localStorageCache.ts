/**
 * Client-side localStorage cache utility with TTL support.
 * Handles serialization, expiration, and quota errors gracefully.
 */

/**
 * Cache entry structure with expiration timestamp.
 */
interface CacheEntry<T> {
	value: T;
	expiresAt: number;
}

/**
 * Check if localStorage is available.
 */
function isLocalStorageAvailable(): boolean {
	// Check if we're in a browser environment first
	if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
		return false;
	}
	try {
		const test = '__localStorage_test__';
		localStorage.setItem(test, test);
		localStorage.removeItem(test);
		return true;
	} catch {
		return false;
	}
}

/**
 * Get cached value if not expired.
 * @param key - Cache key
 * @returns Cached value or null if expired/missing
 */
export function get<T>(key: string): T | null {
	if (!isLocalStorageAvailable()) {
		return null;
	}

	try {
		const item = localStorage.getItem(key);
		if (!item) {
			return null;
		}

		const entry = JSON.parse(item) as CacheEntry<T>;
		const now = Date.now();

		// Check if expired
		if (entry.expiresAt < now) {
			localStorage.removeItem(key);
			return null;
		}

		return entry.value;
	} catch (error) {
		// Invalid JSON or corrupted data - remove it
		console.warn(`Failed to get cache entry for key "${key}":`, error);
		try {
			localStorage.removeItem(key);
		} catch {
			// Ignore removal errors
		}
		return null;
	}
}

/**
 * Set cached value with TTL.
 * @param key - Cache key
 * @param value - Value to cache (must be JSON-serializable)
 * @param ttlHours - Time to live in hours
 */
export function set<T>(key: string, value: T, ttlHours: number): void {
	if (!isLocalStorageAvailable()) {
		return;
	}

	try {
		const now = Date.now();
		const expiresAt = now + ttlHours * 60 * 60 * 1000; // Convert hours to milliseconds

		const entry: CacheEntry<T> = {
			value,
			expiresAt
		};

		localStorage.setItem(key, JSON.stringify(entry));
	} catch (error) {
		// Handle quota exceeded or other errors
		if (error instanceof Error && error.name === 'QuotaExceededError') {
			console.warn('localStorage quota exceeded, clearing old entries');
			// Try to clear expired entries
			clearExpired();
			// Retry once
			try {
				localStorage.setItem(key, JSON.stringify({ value, expiresAt: Date.now() + ttlHours * 60 * 60 * 1000 }));
			} catch {
				// Give up if still fails
				console.warn('Failed to cache value after clearing expired entries');
			}
		} else {
			console.warn(`Failed to set cache entry for key "${key}":`, error);
		}
	}
}

/**
 * Remove cached value.
 * @param key - Cache key
 */
export function remove(key: string): void {
	if (!isLocalStorageAvailable()) {
		return;
	}

	try {
		localStorage.removeItem(key);
	} catch (error) {
		console.warn(`Failed to remove cache entry for key "${key}":`, error);
	}
}

/**
 * Clear all expired entries from localStorage.
 */
function clearExpired(): void {
	if (!isLocalStorageAvailable()) {
		return;
	}

	try {
		const now = Date.now();
		const keysToRemove: string[] = [];

		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (!key) continue;

			try {
				const item = localStorage.getItem(key);
				if (!item) continue;

				const entry = JSON.parse(item) as CacheEntry<unknown>;
				if (entry.expiresAt < now) {
					keysToRemove.push(key);
				}
			} catch {
				// Invalid entry - remove it
				keysToRemove.push(key);
			}
		}

		keysToRemove.forEach((key) => {
			try {
				localStorage.removeItem(key);
			} catch {
				// Ignore removal errors
			}
		});
	} catch (error) {
		console.warn('Failed to clear expired cache entries:', error);
	}
}

/**
 * Clear all cache entries (use with caution).
 */
export function clear(): void {
	if (!isLocalStorageAvailable()) {
		return;
	}

	try {
		localStorage.clear();
	} catch (error) {
		console.warn('Failed to clear cache:', error);
	}
}

