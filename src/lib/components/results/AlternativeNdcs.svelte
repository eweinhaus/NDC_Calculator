<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { onDestroy } from 'svelte';
	import type { NdcSelection } from '../../types/ndc.js';
	import { copyToClipboard } from '../../utils/clipboard.js';
	import { showToast } from '../../stores/toast.js';

	export let alternatives: NdcSelection[] = [];
	export let showButton = true; // Allow parent to control button visibility

	let isOpen = false;
	let copyingNdc: string | null = null;
	let modalElement: HTMLDivElement;
	let closeButtonElement: HTMLButtonElement;

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
	$: if (isOpen && closeButtonElement) {
		// Focus close button when modal opens
		setTimeout(() => {
			closeButtonElement?.focus();
		}, 100);
	}

	export function openModal() {
		if (alternatives && alternatives.length > 0) {
			isOpen = true;
		}
	}

	function closeModal() {
		isOpen = false;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			closeModal();
		}
	}

	function handleSelect(ndc: NdcSelection) {
		// Emit event to parent component
		// Parent can handle selection logic
	}

	async function handleCopy(ndc: string, event: MouseEvent) {
		event.stopPropagation();
		copyingNdc = ndc;
		const success = await copyToClipboard(ndc);
		if (success) {
			showToast('NDC code copied to clipboard', 'success');
		} else {
			showToast('Failed to copy NDC code', 'error');
		}
		copyingNdc = null;
	}
</script>

{#if showButton}
<!-- Button to open modal -->
<button
	type="button"
	on:click={openModal}
	class="w-full flex items-center justify-between p-3 bg-offwhite-warm rounded-md shadow-sm border-2 border-red-600 hover:bg-red-600 hover:text-white hover:shadow-md focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 transition-all group"
	aria-label="View alternative NDCs ({alternatives?.length || 0})"
>
	<div class="flex items-center gap-3">
		<div class="p-2 bg-red-600 rounded-md group-hover:bg-red-700 transition-colors">
			<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
			</svg>
		</div>
		<div class="text-left">
			<h3 class="text-base font-bold text-gray-900 group-hover:text-white transition-colors">
				Alternative NDCs
			</h3>
			<p class="text-xs text-gray-500 group-hover:text-white/90 mt-0.5 transition-colors">{alternatives?.length || 0} options available</p>
		</div>
	</div>
	<svg
		class="w-5 h-5 text-red-600 group-hover:text-white group-hover:translate-x-1 transition-all"
		fill="none"
		stroke="currentColor"
		viewBox="0 0 24 24"
		aria-hidden="true"
	>
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
	</svg>
</button>
{/if}

<!-- Modal -->
{#if isOpen && alternatives && alternatives.length > 0}
	<!-- Modal Backdrop -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
		aria-labelledby="alternatives-modal-title"
		on:keydown={handleKeydown}
		on:click={closeModal}
		transition:fade={{ duration: 200 }}
	>
		<!-- Modal Content -->
		<div
			bind:this={modalElement}
			class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border-2 border-red-600"
			transition:fly={{ y: 20, duration: 200 }}
			on:click|stopPropagation
		>
			<!-- Modal Header -->
			<div class="flex items-center justify-between p-4 border-b-2 border-red-700 bg-red-600">
				<h2
					id="alternatives-modal-title"
					class="text-lg font-bold text-white flex items-center gap-2"
				>
					<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
					</svg>
					Alternative NDCs ({alternatives.length})
				</h2>
				<button
					bind:this={closeButtonElement}
					on:click={closeModal}
					class="p-2 hover:bg-white/20 rounded-md focus:outline-none focus:ring-1 focus:ring-white transition-colors"
					aria-label="Close modal"
				>
					<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<!-- Modal Body -->
			<div class="p-4 overflow-y-auto flex-1">
				<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
					{#each alternatives as alternative, index (index + '-' + alternative.ndc)}
						<div
							class="bg-offwhite-warm border-2 border-red-600 rounded-md p-3 hover:border-red-700 hover:shadow-md cursor-pointer transition-all group"
							on:click={() => handleSelect(alternative)}
							role="button"
							tabindex="0"
							on:keydown={(e) => e.key === 'Enter' && handleSelect(alternative)}
						>
							<div class="flex items-start justify-between mb-2">
								<div class="flex items-center gap-2 flex-1">
									<span class="text-sm font-mono font-bold text-gray-900">{alternative.ndc}</span>
									<button
										type="button"
										on:click={(e) => handleCopy(alternative.ndc, e)}
										disabled={copyingNdc === alternative.ndc}
										class="p-1.5 hover:bg-red-600/10 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
										aria-label="Copy NDC code {alternative.ndc}"
									>
										<svg
											class="w-4 h-4 text-gray-600"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
											aria-hidden="true"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
											/>
										</svg>
									</button>
								</div>
								<span class="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded">Score: {alternative.matchScore.toFixed(2)}</span>
							</div>
							<div class="space-y-1.5">
								<div class="text-sm text-gray-700">
									<span class="font-semibold">Package Size:</span> <span class="font-bold text-gray-900">{alternative.packageSize}</span>
									{#if alternative.packageCount && alternative.packageCount > 1}
										<span class="ml-2 text-gray-600">
											× {alternative.packageCount} = <span class="font-bold">{alternative.totalQuantity}</span>
										</span>
									{/if}
								</div>
								{#if alternative.packageDescription}
									<div class="text-xs text-gray-600 bg-gray-50 p-2 rounded">{alternative.packageDescription}</div>
								{/if}
								<div class="flex items-center gap-2 pt-1 text-xs">
									{#if alternative.overfill > 0}
										<span class="text-yellow-700 font-semibold bg-yellow-50 px-2 py-1 rounded">Overfill: +{alternative.overfill.toFixed(1)}</span>
									{/if}
									{#if alternative.underfill > 0}
										<span class="text-white font-semibold bg-red-600 px-2 py-1 rounded">Underfill: -{alternative.underfill.toFixed(1)}</span>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Modal Footer -->
			<div class="p-4 border-t-2 border-red-600/20 bg-red-50">
				<button
					on:click={closeModal}
					class="w-full px-4 py-2 bg-red-600 text-white font-semibold text-sm rounded-md hover:bg-red-700 transition-all focus:outline-none focus:ring-1 focus:ring-red-600 focus:ring-offset-1 shadow-sm hover:shadow"
				>
					Close
				</button>
			</div>
		</div>
	</div>
{/if}

