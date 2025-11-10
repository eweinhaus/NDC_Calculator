<script lang="ts">
	import { fade } from 'svelte/transition';
	import type { CalculationResult } from '../../types/api.js';
	import DrugInfoCard from './DrugInfoCard.svelte';
	import QuantityBreakdown from './QuantityBreakdown.svelte';
	import RecommendedNdc from './RecommendedNdc.svelte';
	import AlternativeNdcs from './AlternativeNdcs.svelte';
	import WarningsSection from './WarningsSection.svelte';
	import InactiveNdcsList from './InactiveNdcsList.svelte';
	import { copyToClipboard } from '../../utils/clipboard.js';
	import { showToast } from '../../stores/toast.js';

	export let results: CalculationResult;

	let isCopying = false;

	function formatResultsAsText(): string {
		let text = 'NDC Calculation Results\n';
		text += '='.repeat(30) + '\n\n';
		text += `Drug: ${results.drug.name}\n`;
		if (results.drug.rxcui) text += `RxCUI: ${results.drug.rxcui}\n`;
		if (results.drug.strength) text += `Strength: ${results.drug.strength}\n`;
		if (results.drug.dosageForm) text += `Dosage Form: ${results.drug.dosageForm}\n`;
		text += '\n';
		text += `Quantity: ${results.quantity.total} ${results.quantity.unit}\n`;
		text += `Calculation: (${results.quantity.calculation.dosage} × ${results.quantity.calculation.frequency}) × ${results.quantity.calculation.daysSupply}\n`;
		text += '\n';
		text += `Recommended NDC: ${results.recommendedNdc.ndc}\n`;
		text += `Package Size: ${results.recommendedNdc.packageSize}\n`;
		if (results.recommendedNdc.packageDescription) {
			text += `Package: ${results.recommendedNdc.packageDescription}\n`;
		}
		if (results.recommendedNdc.manufacturer) {
			text += `Manufacturer: ${results.recommendedNdc.manufacturer}\n`;
		}
		if (results.warnings && results.warnings.length > 0) {
			text += '\nWarnings:\n';
			results.warnings.forEach((w) => {
				text += `- ${w.message}\n`;
			});
		}
		return text;
	}

	async function handleCopyAll() {
		isCopying = true;
		const text = formatResultsAsText();
		const success = await copyToClipboard(text);
		if (success) {
			showToast('Results copied to clipboard', 'success');
		} else {
			showToast('Failed to copy results', 'error');
		}
		isCopying = false;
	}
</script>

<div class="space-y-4" aria-live="polite" aria-atomic="true">
	<a id="main-content" class="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:p-2 focus:bg-blue-600 focus:text-white">
		Skip to main content
	</a>
	
	<!-- Two-column layout for main results -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
		<!-- Left Column -->
		<div class="space-y-4">
			<section aria-labelledby="drug-info-heading">
				<h2 id="drug-info-heading" class="sr-only">Drug Information</h2>
				<DrugInfoCard drug={results.drug} />
			</section>

			<section aria-labelledby="quantity-heading">
				<h2 id="quantity-heading" class="sr-only">Quantity Calculation</h2>
				<QuantityBreakdown quantity={results.quantity} />
			</section>
		</div>

	<!-- Right Column -->
	<div class="flex flex-col">
		<section aria-labelledby="recommended-heading" class="flex-1">
			<h2 id="recommended-heading" class="sr-only">Recommended NDC</h2>
			<RecommendedNdc ndc={results.recommendedNdc} />
		</section>
	</div>
	</div>

	<!-- Full-width sections below -->
	{#if results.alternatives && results.alternatives.length > 0}
		<section aria-labelledby="alternatives-heading">
			<h2 id="alternatives-heading" class="sr-only">Alternative NDCs</h2>
			{#key results.drug.name}
				<AlternativeNdcs alternatives={results.alternatives} />
			{/key}
		</section>
	{/if}

	{#if results.warnings && results.warnings.length > 0}
		<section aria-labelledby="warnings-heading">
			<h2 id="warnings-heading" class="sr-only">Warnings and Notices</h2>
			<WarningsSection warnings={results.warnings} />
		</section>
	{/if}

	{#if results.inactiveNdcs && results.inactiveNdcs.length > 0}
		<section aria-labelledby="inactive-heading">
			<h2 id="inactive-heading" class="sr-only">Inactive NDCs</h2>
			<InactiveNdcsList inactiveNdcs={results.inactiveNdcs} />
		</section>
	{/if}
</div>

