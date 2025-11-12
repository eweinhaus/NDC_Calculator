<script lang="ts">
	import type { DrugInfo } from '../../types/drug.js';

	export let drug: DrugInfo;
</script>

<div class="bg-white rounded-xl shadow-md border border-gray-200 p-2.5" aria-label="Drug information">
	<h3 class="text-base font-bold mb-1.5 text-gray-900 flex items-center gap-2">
		<svg class="w-5 h-5 text-teal-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
		</svg>
		{drug.name}
	</h3>
	<div class="space-y-1.5">
		{#if drug.rxcui}
			<div class="flex items-center justify-between py-0.5 border-b border-gray-200">
				<span class="text-xs font-semibold text-gray-700">RxCUI:</span>
				<span class="text-xs font-mono text-gray-900 bg-gray-50 px-1.5 py-0.5 rounded">{drug.rxcui}</span>
			</div>
		{/if}
		{#if drug.strength}
			<div class="flex items-center justify-between py-1 border-b border-gray-200">
				<span class="text-xs font-semibold text-gray-700">Strength:</span>
				<span class="text-xs font-medium text-gray-900">{drug.strength}</span>
			</div>
		{/if}
		{#if drug.dosageForm}
			<div class="flex items-center justify-between py-1">
				<span class="text-xs font-semibold text-gray-700">Dosage Form:</span>
				<span class="text-xs font-medium text-gray-900">{drug.dosageForm}</span>
			</div>
		{/if}
	</div>
</div>

