<script lang="ts">
	import type { DrugInfo } from '../../types/drug.js';

	export let drug: DrugInfo;
</script>

<div class="bg-white rounded-lg shadow p-4" aria-label="Drug information">
	<h3 class="text-xl font-semibold mb-3 text-gray-900">{drug.name}</h3>
	<div class="space-y-2">
		{#if drug.rxcui}
			<div class="flex items-start">
				<span class="text-sm font-medium text-gray-600 mr-2">RxCUI:</span>
				<span class="text-sm text-gray-900">{drug.rxcui}</span>
			</div>
		{/if}
		{#if drug.strength}
			<div class="flex items-start">
				<span class="text-sm font-medium text-gray-600 mr-2">Strength:</span>
				<span class="text-sm text-gray-900">{drug.strength}</span>
			</div>
		{/if}
		{#if drug.dosageForm}
			<div class="flex items-start">
				<span class="text-sm font-medium text-gray-600 mr-2">Dosage Form:</span>
				<span class="text-sm text-gray-900">{drug.dosageForm}</span>
			</div>
		{/if}
	</div>
</div>

