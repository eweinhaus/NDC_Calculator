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
	class="bg-blue-50 border-2 border-blue-400 rounded-xl shadow-lg p-5"
	aria-label="Recommended NDC"
>
	<div class="flex items-start justify-between mb-4">
		<h3 class="text-xl font-bold text-gray-900 flex items-center gap-2">
			<svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
			</svg>
			Recommended NDC
		</h3>
		<span class="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full shadow-sm">Best Match</span>
	</div>
	<div class="space-y-3">
		<div class="flex items-center justify-between bg-white rounded-lg p-3 border border-blue-200">
			<div class="flex-1">
				<span class="text-xs font-semibold text-gray-600 uppercase tracking-wide">NDC Code</span>
				<div class="mt-1">
					<span class="text-base font-mono font-bold text-gray-900">{ndc.ndc}</span>
				</div>
			</div>
			<button
				type="button"
				on:click={handleCopy}
				disabled={isCopying}
				class="p-2.5 hover:bg-blue-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				aria-label="Copy NDC code"
			>
				<svg
					class="w-5 h-5 text-blue-600"
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
			<div class="bg-white rounded-lg p-3 border border-blue-200">
				<span class="text-xs font-semibold text-gray-600 uppercase tracking-wide">Package</span>
				<div class="mt-1 text-sm text-gray-900">{ndc.packageDescription}</div>
			</div>
		{/if}
		<div class="grid grid-cols-2 gap-3">
			<div class="bg-white rounded-lg p-3 border border-blue-200">
				<span class="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1">Package Size</span>
				<span class="text-lg font-bold text-gray-900">{ndc.packageSize}</span>
			</div>
			{#if ndc.packageCount && ndc.packageCount > 1}
				<div class="bg-white rounded-lg p-3 border border-blue-200">
					<span class="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1">Packages</span>
					<span class="text-lg font-bold text-gray-900">{ndc.packageCount}</span>
				</div>
			{/if}
		</div>
		<div class="bg-blue-100 rounded-lg p-4 border-2 border-blue-300">
			<span class="text-xs font-semibold text-gray-700 uppercase tracking-wide block mb-1">Total Quantity</span>
			<span class="text-2xl font-extrabold text-blue-700">{ndc.totalQuantity}</span>
		</div>
		{#if ndc.manufacturer}
			<div class="bg-white rounded-lg p-3 border border-blue-200">
				<span class="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1">Manufacturer</span>
				<span class="text-sm font-medium text-gray-900">{ndc.manufacturer}</span>
			</div>
		{/if}
		{#if ndc.overfill > 0 || ndc.underfill > 0}
			<div class="pt-3 border-t-2 border-blue-200 space-y-2">
				{#if ndc.overfill > 0}
					<div class="flex items-center justify-between bg-yellow-50 rounded-lg p-2 border border-yellow-200">
						<span class="text-xs font-semibold text-yellow-700">Overfill</span>
						<span class="text-sm font-bold text-yellow-700">+{ndc.overfill.toFixed(1)}</span>
					</div>
				{/if}
				{#if ndc.underfill > 0}
					<div class="flex items-center justify-between bg-red-50 rounded-lg p-2 border border-red-200">
						<span class="text-xs font-semibold text-red-700">Underfill</span>
						<span class="text-sm font-bold text-red-700">-{ndc.underfill.toFixed(1)}</span>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>

