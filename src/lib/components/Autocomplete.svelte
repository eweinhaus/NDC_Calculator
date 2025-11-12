<script lang="ts">
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import { browser } from '$app/environment';
	import { fade } from 'svelte/transition';
	import { debounce } from '../utils/debounce.js';

	export let value: string = '';
	export let placeholder: string = '';
	export let id: string = '';
	export let label: string = '';
	export let required: boolean = false;
	export let error: string | null = null;
	export let minLength: number = 3; // Minimum characters before showing suggestions (RxNorm API works better with 3+ chars)
	export let maxSuggestions: number = 20;

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

	// Debounced function to fetch suggestions (only on client)
	const debouncedFetchSuggestions = browser
		? debounce(async (query: string) => {
				if (query.length < minLength) {
					suggestions = [];
					isOpen = false;
					isLoading = false;
					return;
				}

				isLoading = true;
				try {
					const response = await fetch(`/api/autocomplete?q=${encodeURIComponent(query)}`);
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
		if (value.length >= minLength && suggestions.length > 0) {
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
		value = suggestion;
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
	$: if (value.length < minLength) {
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
			aria-label="Drug name suggestions"
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

