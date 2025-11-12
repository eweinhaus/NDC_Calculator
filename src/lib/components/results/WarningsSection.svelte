<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { onDestroy } from 'svelte';
	import type { Warning } from '../../types/warning.js';

	export let warnings: Warning[];
	export let showButton = false; // Allow parent to control button visibility

	let isOpen = false;
	let hasBeenDismissed = false;
	let previousWarningsKey = '';
	let modalElement: HTMLDivElement;
	let understandButtonElement: HTMLButtonElement;

	// Create a unique key for the current warnings set
	$: warningsKey = warnings && warnings.length > 0 
		? warnings.map(w => `${w.type}-${w.message}`).join('|')
		: '';

	// Reset dismissed state when warnings change (new calculation with different warnings)
	$: if (warningsKey !== previousWarningsKey) {
		hasBeenDismissed = false;
		previousWarningsKey = warningsKey;
	}

	// Open modal when warnings are present (only if not previously dismissed)
	$: if (warnings && warnings.length > 0 && !hasBeenDismissed) {
		isOpen = true;
	}

	// Lock body scroll when modal is open
	$: if (isOpen) {
		document.body.style.overflow = 'hidden';
	} else {
		document.body.style.overflow = '';
	}

	// Cleanup on component destroy
	onDestroy(() => {
		document.body.style.overflow = '';
	});

	// Focus management
	$: if (isOpen && understandButtonElement) {
		// Focus "I Understand" button when modal opens
		setTimeout(() => {
			understandButtonElement?.focus();
		}, 100);
	}

	export function openModal() {
		if (warnings && warnings.length > 0) {
			isOpen = true;
			hasBeenDismissed = false;
		}
	}

	function closeModal() {
		isOpen = false;
		hasBeenDismissed = true;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			closeModal();
		}
	}

	function getSeverityClasses(severity: Warning['severity']) {
		switch (severity) {
			case 'error':
				return 'bg-red-500 border-red-600 text-white';
			case 'warning':
				return 'bg-yellow-50 border-yellow-200 text-yellow-800';
		case 'info':
			return 'bg-teal-soft-bg border-teal-light text-teal-darker';
			default:
				return 'bg-gray-50 border-gray-200 text-gray-800';
		}
	}

	function getIcon(severity: Warning['severity']) {
		switch (severity) {
			case 'error':
				return 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
			case 'warning':
				return 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z';
			case 'info':
				return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
			default:
				return '';
		}
	}
</script>

{#if showButton && warnings && warnings.length > 0}
<!-- Button to open modal -->
<button
	type="button"
	on:click={openModal}
	class="w-full flex items-center justify-between p-3 bg-offwhite-warm rounded-md shadow-sm border-2 border-amber-500 hover:bg-amber-500 hover:text-white hover:shadow-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-all group"
	aria-label="View warnings ({warnings?.length || 0})"
>
	<div class="flex items-center gap-3">
		<div class="p-2 bg-amber-500 rounded-md group-hover:bg-amber-600 transition-colors">
			<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
			</svg>
		</div>
		<div class="text-left">
			<h3 class="text-base font-bold text-gray-900 group-hover:text-white transition-colors">
				Warnings & Notices
			</h3>
			<p class="text-xs text-gray-500 group-hover:text-white/90 mt-0.5 transition-colors">{warnings?.length || 0} warning{warnings?.length !== 1 ? 's' : ''}</p>
		</div>
	</div>
	<svg
		class="w-5 h-5 text-amber-500 group-hover:text-white group-hover:translate-x-1 transition-all"
		fill="none"
		stroke="currentColor"
		viewBox="0 0 24 24"
		aria-hidden="true"
	>
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
	</svg>
</button>
{/if}

{#if warnings && warnings.length > 0 && isOpen}
	<!-- Modal Backdrop -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
		aria-labelledby="warnings-modal-title"
		on:keydown={handleKeydown}
		transition:fade={{ duration: 200 }}
	>
		<!-- Modal Content -->
		<div
			bind:this={modalElement}
			class="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden flex flex-col border-2 border-red-600"
			transition:fly={{ y: 20, duration: 200 }}
			on:click|stopPropagation
		>
			<!-- Modal Header -->
			<div class="flex items-center p-4 border-b-2 border-red-700 bg-red-600">
				<h2
					id="warnings-modal-title"
					class="text-lg font-bold text-white flex items-center gap-2"
				>
					<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
					</svg>
					Warnings & Notices
				</h2>
			</div>

			<!-- Modal Body -->
			<div class="p-4">
				<div
					class="space-y-2 text-center"
					role={warnings.some((w) => w.severity === 'error') ? 'alert' : 'status'}
				>
					{#each warnings as warning (warning.message)}
						<div class="text-sm font-medium text-gray-800">
							{warning.message}
						</div>
					{/each}
				</div>
			</div>

			<!-- Modal Footer -->
			<div class="p-4 border-t-2 border-gray-200 bg-gray-50">
				<button
					bind:this={understandButtonElement}
					on:click={closeModal}
					class="w-full px-4 py-2 bg-red-600 text-white font-semibold text-sm rounded-md hover:bg-red-700 active:bg-red-800 transition-all focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 shadow-sm hover:shadow-md"
				>
					I Understand
				</button>
			</div>
		</div>
	</div>
{/if}

