/**
 * Svelte store for preloaded autocomplete data.
 * Handles loading from cache and API, with reactive state management.
 */

import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import * as localStorageCache from '$lib/utils/localStorageCache.js';

/**
 * Preload data structure.
 */
export interface PreloadData {
	drugs: string[];
	ndcs: string[];
}

/**
 * Store state.
 */
interface PreloadState {
	data: PreloadData | null;
	loaded: boolean;
	loading: boolean;
	error: string | null;
}

/**
 * Cache key for preload data.
 */
const CACHE_KEY = 'autocomplete:preload:v1';

/**
 * TTL for cache (24 hours).
 */
const CACHE_TTL_HOURS = 24;

/**
 * Create writable store with initial state.
 */
function createPreloadStore() {
	const { subscribe, set, update } = writable<PreloadState>({
		data: null,
		loaded: false,
		loading: false,
		error: null
	});

	return {
		subscribe,
		/**
		 * Load preload data from cache or API.
		 */
		async load() {
			// Only run in browser
			if (!browser) {
				return;
			}

			// Check if already loaded or loading
			let currentState: PreloadState;
			update((state) => {
				currentState = state;
				return state;
			});

			if (currentState.loaded || currentState.loading) {
				return;
			}

			// Set loading state
			update((state) => ({
				...state,
				loading: true,
				error: null
			}));

			try {
				// Try to load from cache first
				const cached = localStorageCache.get<PreloadData>(CACHE_KEY);
				if (cached) {
					update((state) => ({
						...state,
						data: cached,
						loaded: true,
						loading: false,
						error: null
					}));
					return;
				}

				// Fetch from API
				const response = await fetch('/api/autocomplete/preload');
				if (!response.ok) {
					throw new Error(`HTTP ${response.status}: ${response.statusText}`);
				}

				const data = await response.json() as PreloadData;

				// Validate data structure
				if (!data || !Array.isArray(data.drugs) || !Array.isArray(data.ndcs)) {
					throw new Error('Invalid preload data structure');
				}

				// Cache the data
				localStorageCache.set(CACHE_KEY, data, CACHE_TTL_HOURS);

				// Update store
				update((state) => ({
					...state,
					data,
					loaded: true,
					loading: false,
					error: null
				}));
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Unknown error';
				console.warn('Failed to load preload data:', errorMessage);

				// Update store with error (but don't block - fallback to API)
				update((state) => ({
					...state,
					loaded: true, // Mark as loaded even on error (to prevent retry loops)
					loading: false,
					error: errorMessage,
					data: { drugs: [], ndcs: [] } // Empty data as fallback
				}));
			}
		}
	};
}

/**
 * Export store instance.
 */
export const autocompletePreload = createPreloadStore();

/**
 * Convenience function to load preload data.
 */
export function loadPreloadData(): void {
	autocompletePreload.load();
}

