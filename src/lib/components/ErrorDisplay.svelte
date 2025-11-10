<script lang="ts">
	import { onMount } from 'svelte';
	import { createEventDispatcher } from 'svelte';
	import type { ApiError } from '../types/api.js';
	import { getErrorMessage } from '../utils/errorMessages.js';
	
	const dispatch = createEventDispatcher<{ suggestion: string }>();

	export let error: ApiError;
	export let suggestions: string[] = [];
	export let onRetry: (() => void) | undefined = undefined;
	export let retryCountdown: number | null = null;

	let errorElement: HTMLElement;
	let countdownInterval: ReturnType<typeof setInterval> | null = null;
	let elapsedSeconds = 0;

	$: userFriendlyMessage = getErrorMessage(error.code);
	$: showCountdown = retryCountdown !== null && retryCountdown > 0;

	onMount(() => {
		// Focus error message for accessibility
		if (errorElement) {
			errorElement.focus();
		}

		// Start countdown if retry countdown is set
		if (retryCountdown !== null && retryCountdown > 0) {
			countdownInterval = setInterval(() => {
				elapsedSeconds++;
				if (elapsedSeconds >= retryCountdown!) {
					elapsedSeconds = 0;
					if (countdownInterval) {
						clearInterval(countdownInterval);
						countdownInterval = null;
					}
				}
			}, 1000);
		}

		return () => {
			if (countdownInterval) {
				clearInterval(countdownInterval);
			}
		};
	});

	function handleSuggestion(suggestion: string) {
		// Emit event to parent component
		// Parent will handle pre-filling input
		dispatch('suggestion', suggestion);
	}

	function handleRetry() {
		if (onRetry && (!showCountdown || elapsedSeconds >= retryCountdown!)) {
			onRetry();
		}
	}

	$: remainingSeconds = showCountdown ? Math.max(0, retryCountdown! - elapsedSeconds) : 0;
	$: canRetry = !showCountdown || elapsedSeconds >= retryCountdown!;
</script>

<div
	bind:this={errorElement}
	class="bg-red-50 border border-red-200 rounded-lg p-4"
	role="alert"
	aria-live="assertive"
	tabindex="-1"
>
	<div class="flex items-start">
		<svg
			class="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
			aria-hidden="true"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
			/>
		</svg>
		<div class="flex-1">
			<h3 class="text-lg font-semibold text-red-900 mb-2">Error</h3>
			<p class="text-sm text-red-800 mb-3">{userFriendlyMessage}</p>

			{#if error.code === 'DRUG_NOT_FOUND' && suggestions && suggestions.length > 0}
				<div class="mb-4">
					<p class="text-sm font-medium text-red-900 mb-2">Did you mean:</p>
					<div class="flex flex-wrap gap-2">
						{#each suggestions as suggestion (suggestion)}
							<button
								type="button"
								on:click={() => handleSuggestion(suggestion)}
								class="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 text-sm rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
							>
								{suggestion}
							</button>
						{/each}
					</div>
				</div>
			{/if}

			{#if error.code === 'SIG_PARSE_FAILED'}
				<div class="mb-4 p-3 bg-gray-100 rounded border border-gray-300">
					<p class="text-sm font-medium text-gray-900 mb-1">Example format:</p>
					<p class="text-sm text-gray-700 font-mono">Take 1 tablet twice daily</p>
				</div>
			{/if}

			{#if onRetry}
				<button
					type="button"
					on:click={handleRetry}
					disabled={!canRetry}
					class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
				>
					{#if showCountdown && remainingSeconds > 0}
						Retry in {remainingSeconds} second{remainingSeconds !== 1 ? 's' : ''}...
					{:else}
						Retry
					{/if}
				</button>
			{/if}
		</div>
	</div>
</div>

