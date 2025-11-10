/**
 * Cache service with TTL support and LRU eviction.
 * Supports in-memory Map (development) and Redis-ready interface (production).
 */

import { logger } from '$lib/utils/logger.js';

/**
 * Cache entry with expiration and access tracking.
 */
interface CacheEntry<T> {
	value: T;
	expiresAt: number;
	lastAccessed: number;
}

/**
 * Cache interface for abstraction (supports Redis in production).
 */
export interface CacheInterface {
	get<T>(key: string): Promise<T | null>;
	set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
	delete(key: string): Promise<void>;
	clear(): Promise<void>;
}

/**
 * In-memory cache implementation using Map.
 */
export class InMemoryCache implements CacheInterface {
	private cache: Map<string, CacheEntry<unknown>>;
	private maxEntries: number;

	constructor(maxEntries: number = 1000) {
		this.cache = new Map();
		this.maxEntries = maxEntries;
	}

	/**
	 * Clean up expired entries.
	 */
	private cleanupExpired(): void {
		const now = Date.now();
		for (const [key, entry] of this.cache.entries()) {
			if (entry.expiresAt < now) {
				this.cache.delete(key);
				logger.debug(`Cache entry expired: ${key}`);
			}
		}
	}

	/**
	 * Evict least recently used entry if at capacity.
	 */
	private evictLRU(): void {
		if (this.cache.size < this.maxEntries) {
			return;
		}

		let oldestKey: string | null = null;
		let oldestAccess = Infinity;

		for (const [key, entry] of this.cache.entries()) {
			if (entry.lastAccessed < oldestAccess) {
				oldestAccess = entry.lastAccessed;
				oldestKey = key;
			}
		}

		if (oldestKey) {
			this.cache.delete(oldestKey);
			logger.debug(`Cache entry evicted (LRU): ${oldestKey}`);
		}
	}

	async get<T>(key: string): Promise<T | null> {
		this.cleanupExpired();

		const entry = this.cache.get(key) as CacheEntry<T> | undefined;
		if (!entry) {
			logger.debug(`Cache miss: ${key}`);
			return null;
		}

		// Check if expired
		if (entry.expiresAt < Date.now()) {
			this.cache.delete(key);
			logger.debug(`Cache entry expired on access: ${key}`);
			return null;
		}

		// Update last accessed time
		entry.lastAccessed = Date.now();
		logger.debug(`Cache hit: ${key}`);
		return entry.value;
	}

	async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
		this.cleanupExpired();
		this.evictLRU();

		const now = Date.now();
		const entry: CacheEntry<T> = {
			value,
			expiresAt: now + ttlSeconds * 1000,
			lastAccessed: now
		};

		this.cache.set(key, entry);
		logger.debug(`Cache set: ${key} (TTL: ${ttlSeconds}s)`);
	}

	async delete(key: string): Promise<void> {
		const deleted = this.cache.delete(key);
		if (deleted) {
			logger.debug(`Cache delete: ${key}`);
		}
	}

	async clear(): Promise<void> {
		const size = this.cache.size;
		this.cache.clear();
		logger.info(`Cache cleared (${size} entries removed)`);
	}
}

/**
 * Redis cache implementation (stub for future use).
 */
class RedisCache implements CacheInterface {
	async get<T>(_key: string): Promise<T | null> {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const _ = _key;
		throw new Error('Redis cache not implemented yet');
	}

	async set<T>(_key: string, _value: T, _ttlSeconds: number): Promise<void> {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const _ = { _key, _value, _ttlSeconds };
		throw new Error('Redis cache not implemented yet');
	}

	async delete(_key: string): Promise<void> {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const _ = _key;
		throw new Error('Redis cache not implemented yet');
	}

	async clear(): Promise<void> {
		throw new Error('Redis cache not implemented yet');
	}
}

/**
 * Create cache instance based on environment.
 */
function createCache(): CacheInterface {
	const useRedis = process.env.REDIS_URL && process.env.NODE_ENV === 'production';
	if (useRedis) {
		logger.info('Using Redis cache');
		return new RedisCache();
	}
	logger.info('Using in-memory cache');
	return new InMemoryCache();
}

/**
 * Singleton cache instance.
 */
export const cache = createCache();

