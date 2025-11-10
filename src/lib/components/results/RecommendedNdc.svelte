<script lang="ts">
	import type { NdcSelection } from '../../types/ndc.js';
	import { copyToClipboard } from '../../utils/clipboard.js';
	import { showToast } from '../../stores/toast.js';

	export let ndc: NdcSelection;

	let isCopying = false;

	async function handleCopy() {
		isCopying = true;
		const success = await copyToClipboard(ndc.ndc);
		if (success) {
			showToast('NDC code copied to clipboard', 'success');
		} else {
			showToast('Failed to copy NDC code', 'error');
		}
		isCopying = false;
	}
</script>

<div
	class="bg-blue-50 border-2 border-blue-500 rounded-lg shadow p-4"
	aria-label="Recommended NDC"
>
	<div class="flex items-start justify-between mb-3">
		<h3 class="text-lg font-semibold text-gray-900">Recommended NDC</h3>
		<span class="px-2 py-1 bg-blue-500 text-white text-xs font-medium rounded">Best Match</span>
	</div>
	<div class="space-y-3">
		<div class="flex items-center justify-between">
			<div>
				<span class="text-sm font-medium text-gray-600">NDC Code:</span>
				<span class="text-sm font-mono text-gray-900 ml-2">{ndc.ndc}</span>
			</div>
			<button
				type="button"
				on:click={handleCopy}
				disabled={isCopying}
				class="p-2 hover:bg-blue-100 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				aria-label="Copy NDC code"
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
		{#if ndc.packageDescription}
			<div>
				<span class="text-sm font-medium text-gray-600">Package:</span>
				<span class="text-sm text-gray-900 ml-2">{ndc.packageDescription}</span>
			</div>
		{/if}
		<div>
			<span class="text-sm font-medium text-gray-600">Package Size:</span>
			<span class="text-sm font-semibold text-gray-900 ml-2">{ndc.packageSize}</span>
		</div>
		{#if ndc.packageCount && ndc.packageCount > 1}
			<div>
				<span class="text-sm font-medium text-gray-600">Packages:</span>
				<span class="text-sm text-gray-900 ml-2">{ndc.packageCount}</span>
			</div>
		{/if}
		<div>
			<span class="text-sm font-medium text-gray-600">Total Quantity:</span>
			<span class="text-sm font-semibold text-gray-900 ml-2">{ndc.totalQuantity}</span>
		</div>
		{#if ndc.manufacturer}
			<div>
				<span class="text-sm font-medium text-gray-600">Manufacturer:</span>
				<span class="text-sm text-gray-900 ml-2">{ndc.manufacturer}</span>
			</div>
		{/if}
		{#if ndc.overfill > 0}
			<div class="pt-2 border-t border-blue-200">
				<span class="text-sm font-medium text-yellow-700">Overfill:</span>
				<span class="text-sm text-yellow-700 ml-2">+{ndc.overfill.toFixed(1)}</span>
			</div>
		{/if}
		{#if ndc.underfill > 0}
			<div class="pt-2 border-t border-blue-200">
				<span class="text-sm font-medium text-red-700">Underfill:</span>
				<span class="text-sm text-red-700 ml-2">-{ndc.underfill.toFixed(1)}</span>
			</div>
		{/if}
	</div>
</div>

