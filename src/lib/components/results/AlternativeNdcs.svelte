<script lang="ts">
	import { fly } from 'svelte/transition';
	import type { NdcSelection } from '../../types/ndc.js';
	import { copyToClipboard } from '../../utils/clipboard.js';
	import { showToast } from '../../stores/toast.js';

	export let alternatives: NdcSelection[];

	let isExpanded = false;
	let copyingNdc: string | null = null;

	function toggle() {
		isExpanded = !isExpanded;
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

<div class="bg-white rounded-lg shadow">
	<button
		type="button"
		on:click={toggle}
		class="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
		aria-expanded={isExpanded}
		aria-controls="alternatives-content"
	>
		<h3 class="text-lg font-semibold text-gray-900">
			Alternative NDCs ({alternatives.length})
		</h3>
		<svg
			class="w-5 h-5 text-gray-500 transition-transform {isExpanded ? 'rotate-180' : ''}"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
			aria-hidden="true"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
		</svg>
	</button>
	{#if isExpanded}
		<div id="alternatives-content" class="px-4 pb-4" transition:fly={{ y: -10, duration: 200 }}>
			<div class="space-y-3 pt-2">
				{#each alternatives as alternative (alternative.ndc)}
					<div
						class="border border-gray-200 rounded-lg p-3 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors"
						on:click={() => handleSelect(alternative)}
						role="button"
						tabindex="0"
						on:keydown={(e) => e.key === 'Enter' && handleSelect(alternative)}
					>
						<div class="flex items-start justify-between mb-2">
							<div class="flex items-center gap-2">
								<span class="text-sm font-mono text-gray-900">{alternative.ndc}</span>
								<button
									type="button"
									on:click={(e) => handleCopy(alternative.ndc, e)}
									disabled={copyingNdc === alternative.ndc}
									class="p-1 hover:bg-blue-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
									aria-label="Copy NDC code {alternative.ndc}"
								>
									<svg
										class="w-3 h-3 text-gray-600"
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
							<span class="text-xs text-gray-500">Score: {alternative.matchScore.toFixed(2)}</span>
						</div>
						<div class="text-sm text-gray-600">
							Package Size: <span class="font-medium text-gray-900">{alternative.packageSize}</span>
							{#if alternative.packageCount && alternative.packageCount > 1}
								<span class="ml-2">
									× {alternative.packageCount} = {alternative.totalQuantity}
								</span>
							{/if}
						</div>
						{#if alternative.packageDescription}
							<div class="text-xs text-gray-500 mt-1">{alternative.packageDescription}</div>
						{/if}
						<div class="flex items-center gap-4 mt-2 text-xs">
							{#if alternative.overfill > 0}
								<span class="text-yellow-700">Overfill: +{alternative.overfill.toFixed(1)}</span>
							{/if}
							{#if alternative.underfill > 0}
								<span class="text-red-700">Underfill: -{alternative.underfill.toFixed(1)}</span>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

