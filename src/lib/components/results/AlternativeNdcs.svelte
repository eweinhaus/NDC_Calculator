<script lang="ts">
	import { fly } from 'svelte/transition';
	import type { NdcSelection } from '../../types/ndc.js';
	import { copyToClipboard } from '../../utils/clipboard.js';
	import { showToast } from '../../stores/toast.js';

	export let alternatives: NdcSelection[] = [];

	let isExpanded = false;
	let copyingNdc: string | null = null;

	function toggle() {
		if (alternatives && alternatives.length > 0) {
			isExpanded = !isExpanded;
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

<div class="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl shadow-md border border-gray-200">
	<button
		type="button"
		on:click={toggle}
		class="w-full flex items-center justify-between p-5 text-left hover:bg-gray-100/50 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-xl transition-colors"
		aria-expanded={isExpanded}
		aria-controls="alternatives-content"
	>
		<h3 class="text-xl font-bold text-gray-900 flex items-center gap-2">
			<svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
			</svg>
			Alternative NDCs ({alternatives?.length || 0})
		</h3>
		<svg
			class="w-6 h-6 text-gray-600 transition-transform {isExpanded ? 'rotate-180' : ''}"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
			aria-hidden="true"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
		</svg>
	</button>
	{#if isExpanded && alternatives && alternatives.length > 0}
		<div id="alternatives-content" class="px-5 pb-5" transition:fly={{ y: -10, duration: 200 }}>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
				{#each alternatives as alternative, index (index + '-' + alternative.ndc)}
					<div
						class="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-md cursor-pointer transition-all"
						on:click={() => handleSelect(alternative)}
						role="button"
						tabindex="0"
						on:keydown={(e) => e.key === 'Enter' && handleSelect(alternative)}
					>
						<div class="flex items-start justify-between mb-3">
							<div class="flex items-center gap-2 flex-1">
								<span class="text-sm font-mono font-bold text-gray-900">{alternative.ndc}</span>
								<button
									type="button"
									on:click={(e) => handleCopy(alternative.ndc, e)}
									disabled={copyingNdc === alternative.ndc}
									class="p-1.5 hover:bg-blue-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
						<div class="space-y-2">
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
							<div class="flex items-center gap-3 pt-2 text-xs">
								{#if alternative.overfill > 0}
									<span class="text-yellow-700 font-semibold bg-yellow-50 px-2 py-1 rounded">Overfill: +{alternative.overfill.toFixed(1)}</span>
								{/if}
								{#if alternative.underfill > 0}
									<span class="text-red-700 font-semibold bg-red-50 px-2 py-1 rounded">Underfill: -{alternative.underfill.toFixed(1)}</span>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

