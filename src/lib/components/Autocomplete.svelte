<script lang="ts">
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import { browser } from '$app/environment';
	import { fade } from 'svelte/transition';
	import { debounce } from '../utils/debounce.js';
	import { detectInputType } from '../utils/inputDetector.js';
	import type { PreloadData } from '../stores/autocompletePreload.js';

	export let value: string = '';
	export let placeholder: string = '';
	export let id: string = '';
	export let label: string = '';
	export let required: boolean = false;
	export let error: string | null = null;
	export let minLength: number = 3; // Default minimum, will be adjusted based on input type
	export let maxSuggestions: number = 20;
	export let preloadedData: PreloadData | null = null;

	// Events
	const dispatch = createEventDispatcher<{
		input: string;
		blur: void;
	}>();

	let suggestions: string[] = [];
	let isLoading = false;
	let selectedIndex = -1;
	let isOpen = false;
	let inputElement: HTMLInputElement | null = null;
	let dropdownElement: HTMLUListElement | null = null;

	// Detect input type and determine appropriate endpoint and minLength
	$: inputType = detectInputType(value);
	$: effectiveMinLength = inputType === 'ndc' ? 2 : minLength;
	$: autocompleteEndpoint = inputType === 'ndc' ? '/api/autocomplete/ndc' : '/api/autocomplete';
	$: ariaLabel = inputType === 'ndc' ? 'NDC code suggestions' : 'Drug name suggestions';

	/**
	 * Filter preloaded data for instant client-side suggestions.
	 * @param query - Search query
	 * @param type - Input type ('drug' or 'ndc')
	 * @returns Filtered suggestions from preloaded data
	 */
	function filterPreloadedData(query: string, type: 'drug' | 'ndc'): string[] {
		if (!preloadedData) {
			return [];
		}

		const source = type === 'drug' ? preloadedData.drugs : preloadedData.ndcs;
		const queryLower = query.toLowerCase().trim();

		if (queryLower.length === 0) {
			return [];
		}

		// Case-insensitive prefix matching
		const matches = source
			.filter((item) => {
				const itemLower = item.toLowerCase();
				// For NDC codes, also check if query matches the normalized format
				if (type === 'ndc') {
					// Remove dashes for comparison
					const itemNormalized = itemLower.replace(/-/g, '');
					const queryNormalized = queryLower.replace(/-/g, '');
					return itemLower.startsWith(queryLower) || itemNormalized.startsWith(queryNormalized);
				}
				return itemLower.startsWith(queryLower);
			})
			.slice(0, maxSuggestions);

		return matches;
	}

	// Debounced function to fetch suggestions (only on client)
	const debouncedFetchSuggestions = browser
		? debounce(async (query: string) => {
				const currentInputType = detectInputType(query);
				const currentMinLength = currentInputType === 'ndc' ? 2 : minLength;
				
				if (query.length < currentMinLength) {
					suggestions = [];
					isOpen = false;
					isLoading = false;
					return;
				}

				// Don't fetch if input type is unknown
				if (currentInputType === 'unknown') {
					suggestions = [];
					isOpen = false;
					isLoading = false;
					return;
				}

				// Step 1: Try filtering preloaded data first (instant, no API call)
				if (preloadedData && (currentInputType === 'drug' || currentInputType === 'ndc')) {
					const preloadedMatches = filterPreloadedData(
						query,
						currentInputType === 'ndc' ? 'ndc' : 'drug'
					);

					if (preloadedMatches.length > 0) {
						// Found matches in preloaded data - show immediately
						suggestions = preloadedMatches;
						isOpen = suggestions.length > 0;
						selectedIndex = -1;
						isLoading = false;
						return; // No API call needed
					}
				}

				// Step 2: No matches in preloaded data - fallback to API
				isLoading = true;
				try {
					const endpoint = currentInputType === 'ndc' ? '/api/autocomplete/ndc' : '/api/autocomplete';
					const response = await fetch(`${endpoint}?q=${encodeURIComponent(query)}`);
					if (!response.ok) {
						throw new Error(`HTTP ${response.status}`);
					}
					const data = await response.json();
					const results = data.suggestions || [];
					suggestions = results.slice(0, maxSuggestions);
					isOpen = suggestions.length > 0;
					selectedIndex = -1;
				} catch (err) {
					console.error('Error fetching autocomplete suggestions:', err);
					suggestions = [];
					isOpen = false;
				} finally {
					isLoading = false;
				}
			}, 300) // 300ms debounce
		: () => {}; // No-op on server

	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		value = target.value;
		
		// Dispatch input event
		dispatch('input', value);

		// Fetch suggestions
		debouncedFetchSuggestions(value);
	}

	function handleFocus() {
		// Show suggestions if we have value and suggestions
		if (value.length >= effectiveMinLength && suggestions.length > 0) {
			isOpen = true;
		}
	}

	function handleBlur() {
		// Delay closing to allow click events on suggestions
		setTimeout(() => {
			isOpen = false;
			selectedIndex = -1;
			dispatch('blur');
		}, 200);
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (!isOpen || suggestions.length === 0) {
			// Allow normal input if dropdown is closed
			if (event.key === 'Escape') {
				isOpen = false;
				selectedIndex = -1;
			}
			return;
		}

		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				selectedIndex = Math.min(selectedIndex + 1, suggestions.length - 1);
				scrollToSelected();
				break;
			case 'ArrowUp':
				event.preventDefault();
				selectedIndex = Math.max(selectedIndex - 1, -1);
				scrollToSelected();
				break;
			case 'Enter':
				event.preventDefault();
				if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
					selectSuggestion(suggestions[selectedIndex]);
				}
				break;
			case 'Escape':
				event.preventDefault();
				isOpen = false;
				selectedIndex = -1;
				inputElement?.focus();
				break;
		}
	}

	function selectSuggestion(suggestion: string) {
		// If suggestion is in format "NDC - Drug Name", extract just the NDC part
		// Format: "00002-3227-30 - Lisinopril" -> "00002-3227-30"
		const ndcMatch = suggestion.match(/^([\d-]+)\s*-\s*/);
		if (ndcMatch && inputType === 'ndc') {
			value = ndcMatch[1].trim();
		} else {
			value = suggestion;
		}
		
		suggestions = [];
		isOpen = false;
		selectedIndex = -1;
		
		// Dispatch input event
		dispatch('input', value);

		// Focus back on input
		inputElement?.focus();
	}

	function scrollToSelected() {
		if (dropdownElement && selectedIndex >= 0) {
			const selectedElement = dropdownElement.children[selectedIndex] as HTMLElement;
			if (selectedElement) {
				selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
			}
		}
	}

	// Close dropdown when clicking outside (only on client)
	function handleClickOutside(event: MouseEvent) {
		if (
			inputElement &&
			dropdownElement &&
			!inputElement.contains(event.target as Node) &&
			!dropdownElement.contains(event.target as Node)
		) {
			isOpen = false;
			selectedIndex = -1;
		}
	}

	onMount(() => {
		if (browser) {
			document.addEventListener('click', handleClickOutside);
		}
	});

	onDestroy(() => {
		if (browser) {
			document.removeEventListener('click', handleClickOutside);
		}
	});

	// Close dropdown when value changes externally
	$: if (value.length < effectiveMinLength) {
		isOpen = false;
		suggestions = [];
	}
</script>

<div class="relative">
	{#if label}
		<label for={id} class="block mb-2 font-semibold text-gray-700 text-sm md:text-base">
			{label}
			{#if required}
				<span class="text-red-500" aria-label="required">*</span>
			{/if}
		</label>
	{/if}
	
	<div class="relative">
		<input
			bind:this={inputElement}
			{id}
			type="text"
			bind:value
			{placeholder}
			{required}
			role="combobox"
			on:input={handleInput}
			on:focus={handleFocus}
			on:blur={handleBlur}
			on:keydown={handleKeyDown}
			class="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-primary focus:border-teal-primary transition-colors {error ? 'border-red-500 focus:ring-red-500' : ''}"
			aria-invalid={error ? 'true' : 'false'}
			aria-describedby={error ? `${id}-error` : undefined}
			aria-autocomplete="list"
			aria-expanded={isOpen}
			aria-controls={isOpen ? `${id}-suggestions` : undefined}
			aria-activedescendant={selectedIndex >= 0 ? `${id}-suggestion-${selectedIndex}` : undefined}
			aria-label={ariaLabel}
		/>
		
		{#if isLoading}
			<div class="absolute right-3 top-1/2 -translate-y-1/2" aria-label="Loading suggestions">
				<svg class="animate-spin h-5 w-5 text-teal-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
					<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
				</svg>
			</div>
		{/if}
	</div>

	{#if error}
		<span id="{id}-error" class="block text-red-600 text-sm mt-1.5 font-medium" role="alert">
			{error}
		</span>
	{/if}

	{#if isOpen && suggestions.length > 0}
		<ul
			bind:this={dropdownElement}
			id="{id}-suggestions"
			role="listbox"
			class="absolute z-50 w-full mt-1 bg-white border-2 border-gray-300 rounded-xl shadow-lg max-h-60 overflow-auto"
			aria-label={ariaLabel}
		>
			{#each suggestions as suggestion, index}
				<li
					id="{id}-suggestion-{index}"
					role="option"
					tabindex="-1"
					aria-selected={selectedIndex === index}
					class="px-4 py-2 cursor-pointer transition-colors {selectedIndex === index ? 'bg-teal-soft-bg text-teal-dark' : 'hover:bg-gray-100 text-gray-900'}"
					on:click={() => selectSuggestion(suggestion)}
					on:keydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							selectSuggestion(suggestion);
						}
					}}
					on:mouseenter={() => selectedIndex = index}
				>
					{suggestion}
				</li>
			{/each}
		</ul>
	{/if}
</div>

