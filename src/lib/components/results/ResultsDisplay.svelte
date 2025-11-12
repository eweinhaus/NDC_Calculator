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
	let alternativeNdcsComponent: AlternativeNdcs;
	let warningsSectionComponent: WarningsSection;

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

<div class="flex flex-col min-h-0" aria-live="polite" aria-atomic="true">
	<a id="main-content" class="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:p-2 focus:bg-teal-primary focus:text-white">
		Skip to main content
	</a>
	
	<div class="space-y-2 flex-1">
	<!-- Main Content: Recommended NDC (60%) and Supporting Info (40%) -->
	<div class="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-3 items-start">
		<!-- Left Column (60%): Recommended NDC -->
		<section aria-labelledby="recommended-heading" class="flex">
			<h2 id="recommended-heading" class="sr-only">Recommended NDC</h2>
			<RecommendedNdc ndc={results.recommendedNdc} />
		</section>

		<!-- Right Column (40%): Drug Info and Quantity Breakdown (Stacked) -->
		<div class="flex flex-col space-y-3" id="right-column">
			<!-- Drug Info -->
			<section aria-labelledby="drug-info-heading">
				<h2 id="drug-info-heading" class="sr-only">Drug Information</h2>
				<DrugInfoCard drug={results.drug} />
			</section>

			<!-- Quantity Breakdown -->
			<section aria-labelledby="quantity-heading">
				<h2 id="quantity-heading" class="sr-only">Quantity Calculation</h2>
				<QuantityBreakdown quantity={results.quantity} />
			</section>
		</div>
	</div>

	<!-- Warnings Section - Component rendered but button hidden, modal only -->
	{#if results.warnings && results.warnings.length > 0}
		<div class="absolute w-0 h-0 overflow-hidden">
			<WarningsSection bind:this={warningsSectionComponent} warnings={results.warnings} showButton={false} />
		</div>
	{/if}

	<!-- Alternatives Section - Component rendered but button hidden, modal only -->
	{#if results.alternatives && results.alternatives.length > 0}
		<div class="absolute w-0 h-0 overflow-hidden">
			<AlternativeNdcs bind:this={alternativeNdcsComponent} alternatives={results.alternatives} showButton={false} />
		</div>
	{/if}

	<!-- Inactive NDCs Section (Full-width, collapsible) -->
	{#if results.inactiveNdcs && results.inactiveNdcs.length > 0}
		<section aria-labelledby="inactive-heading">
			<h2 id="inactive-heading" class="sr-only">Inactive NDCs</h2>
			<InactiveNdcsList inactiveNdcs={results.inactiveNdcs} />
		</section>
	{/if}
	</div>

	<!-- Action Buttons at Bottom (Aligned with form) -->
	<div class="flex gap-3 pt-6 lg:sticky lg:bottom-4 lg:z-10">
		<!-- Alternative NDCs Button (Left) -->
		{#if results.alternatives && results.alternatives.length > 0}
			<button
				type="button"
				on:click={() => alternativeNdcsComponent?.openModal()}
				class="flex-1 flex items-center justify-between p-3 bg-white rounded-md shadow-sm border-2 border-red-600 hover:bg-red-600 hover:text-white hover:shadow-md focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 transition-all group"
				aria-label="View alternative NDCs ({results.alternatives?.length || 0})"
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
						<p class="text-xs text-gray-500 group-hover:text-white/90 mt-0.5 transition-colors">{results.alternatives?.length || 0} options</p>
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

		<!-- Warnings Button (Right) -->
		{#if results.warnings && results.warnings.length > 0}
			<button
				type="button"
				on:click={() => warningsSectionComponent?.openModal()}
				class="flex-1 flex items-center justify-between p-3 bg-white rounded-md shadow-sm border-2 border-amber-500 hover:bg-amber-500 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-all group"
				aria-label="View warnings ({results.warnings?.length || 0})"
			>
				<div class="flex items-center gap-3">
					<div class="p-2 bg-amber-500 rounded-md group-hover:bg-amber-600 transition-colors">
						<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
						</svg>
					</div>
					<div class="text-left">
						<h3 class="text-base font-bold text-gray-900 group-hover:text-white transition-colors">
							Warnings
						</h3>
						<p class="text-xs text-gray-500 group-hover:text-white/90 mt-0.5 transition-colors">{results.warnings?.length || 0} warning{results.warnings?.length !== 1 ? 's' : ''}</p>
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
	</div>
</div>

