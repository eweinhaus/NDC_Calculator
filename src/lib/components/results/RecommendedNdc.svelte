<script lang="ts">
	import { onMount } from 'svelte';
	import type { NdcSelection } from '../../types/ndc.js';
	import { copyToClipboard } from '../../utils/clipboard.js';
	import { showToast } from '../../stores/toast.js';

	export let ndc: NdcSelection;

	let isCopying = false;
	let containerElement: HTMLDivElement;
	let rightColumnElement: HTMLElement | null = null;

	onMount(() => {
		// Find the right column to match its height
		rightColumnElement = document.getElementById('right-column');
		
		// Initial height update with a small delay to ensure DOM is ready
		setTimeout(() => {
			updateHeight();
		}, 10);
		
		// Update height on window resize
		const resizeObserver = new ResizeObserver(() => {
			updateHeight();
		});
		
		if (rightColumnElement) {
			resizeObserver.observe(rightColumnElement);
		}
		
		return () => {
			resizeObserver.disconnect();
		};
	});

	// Reactive update when ndc changes
	$: if (containerElement) {
		setTimeout(() => {
			updateHeight();
		}, 10);
	}

	function updateHeight() {
		if (containerElement) {
			rightColumnElement = document.getElementById('right-column');
			if (rightColumnElement) {
				const rightHeight = rightColumnElement.offsetHeight;
				containerElement.style.minHeight = `${rightHeight}px`;
			}
		}
	}

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
	bind:this={containerElement}
	class="bg-teal-primary rounded-2xl shadow-2xl mb-2 w-full flex flex-col {ndc.overfill > 0 ? 'p-3' : 'p-4'}"
	aria-label="Recommended NDC"
>
	<div class="flex items-start justify-between {ndc.overfill > 0 ? 'mb-2' : 'mb-3'}">
		<h3 class="text-lg md:text-xl font-bold text-white flex items-center gap-2">
			<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
			</svg>
			Recommended NDC
		</h3>
		<span class="px-2 py-0.5 bg-white text-teal-primary text-xs font-bold rounded-full shadow-lg">Best Match</span>
	</div>
	
	<!-- NDC Code - Hero Display -->
	<div class="bg-white/10 backdrop-blur-sm rounded-xl border-2 border-white/20 {ndc.overfill > 0 ? 'p-2 mb-2' : 'p-3 mb-3'}">
		<span class="text-xs font-semibold text-white/90 uppercase tracking-wide block {ndc.overfill > 0 ? 'mb-1.5' : 'mb-2'}">NDC Code</span>
		<div class="flex items-center justify-between gap-3 flex-wrap">
			<div class="flex-1 min-w-0">
				<span class="text-3xl md:text-4xl font-mono font-extrabold text-white break-all">{ndc.ndc}</span>
			</div>
			<div class="flex items-center gap-2">
				<button
					type="button"
					on:click={handleCopy}
					disabled={isCopying}
					class="p-2 bg-white/20 hover:bg-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
					aria-label="Copy NDC code"
				>
					<svg
						class="w-5 h-5 text-white"
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
		</div>
	</div>

	<!-- Total Quantity, Package Size, and Packages - Shared Row -->
	{#if ndc.packageCount && ndc.packageCount > 1}
		<div class="grid grid-cols-3 gap-3 {ndc.overfill > 0 ? 'mb-2' : 'mb-3'}">
			<div class="bg-white rounded-xl shadow-lg border-2 border-white/50 {ndc.overfill > 0 ? 'p-2' : 'p-3'}">
				<span class="text-xs font-semibold text-gray-600 uppercase tracking-wide block {ndc.overfill > 0 ? 'mb-1' : 'mb-1.5'}">Total Quantity</span>
				<span class="text-xl md:text-2xl font-extrabold text-teal-primary">{ndc.totalQuantity}</span>
			</div>
			<div class="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 {ndc.overfill > 0 ? 'p-2' : 'p-3'}">
				<span class="text-xs font-semibold text-white/90 uppercase tracking-wide block {ndc.overfill > 0 ? 'mb-1' : 'mb-1.5'}">Package Size</span>
				<span class="text-xl md:text-2xl font-bold text-white">{ndc.packageSize}</span>
			</div>
			<div class="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 {ndc.overfill > 0 ? 'p-2' : 'p-3'}">
				<span class="text-xs font-semibold text-white/90 uppercase tracking-wide block {ndc.overfill > 0 ? 'mb-1' : 'mb-1.5'}">Packages</span>
				<span class="text-xl md:text-2xl font-bold text-white">{ndc.packageCount}</span>
			</div>
		</div>
	{:else}
		<div class="grid grid-cols-2 gap-3 {ndc.overfill > 0 ? 'mb-2' : 'mb-3'}">
			<div class="bg-white rounded-xl shadow-lg border-2 border-white/50 {ndc.overfill > 0 ? 'p-2' : 'p-3'}">
				<span class="text-xs font-semibold text-gray-600 uppercase tracking-wide block {ndc.overfill > 0 ? 'mb-1' : 'mb-1.5'}">Total Quantity</span>
				<span class="text-xl md:text-2xl font-extrabold text-teal-primary">{ndc.totalQuantity}</span>
			</div>
			<div class="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 {ndc.overfill > 0 ? 'p-2' : 'p-3'}">
				<span class="text-xs font-semibold text-white/90 uppercase tracking-wide block {ndc.overfill > 0 ? 'mb-1' : 'mb-1.5'}">Package Size</span>
				<span class="text-xl md:text-2xl font-bold text-white">{ndc.packageSize}</span>
			</div>
		</div>
	{/if}

	<!-- Package and Manufacturer - Shared Row -->
	{#if ndc.packageDescription || ndc.manufacturer}
		<div class="grid grid-cols-2 gap-3 {ndc.overfill > 0 ? 'mb-2' : 'mb-3'}">
			{#if ndc.packageDescription}
				<div class="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 {ndc.overfill > 0 ? 'p-2' : 'p-3'}">
					<span class="text-xs font-semibold text-white/90 uppercase tracking-wide block {ndc.overfill > 0 ? 'mb-1' : 'mb-1.5'}">Package</span>
					<div class="text-xs text-white font-medium">{ndc.packageDescription}</div>
				</div>
			{/if}
			{#if ndc.manufacturer}
				<div class="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 {ndc.overfill > 0 ? 'p-2' : 'p-3'}">
					<span class="text-xs font-semibold text-white/90 uppercase tracking-wide block {ndc.overfill > 0 ? 'mb-1' : 'mb-1.5'}">Manufacturer</span>
					<span class="text-xs font-medium text-white">{ndc.manufacturer}</span>
				</div>
			{/if}
		</div>
	{/if}

	{#if ndc.overfill > 0 || ndc.underfill > 0}
		<div class="pt-3 border-t-2 border-white/20 space-y-2">
			{#if ndc.overfill > 0}
				<div class="flex items-center justify-between bg-yellow-50 rounded-lg p-2.5 border-2 border-yellow-300 shadow-md">
					<span class="text-xs font-semibold text-yellow-800">Overfill</span>
					<span class="text-sm font-bold text-yellow-800">+{ndc.overfill.toFixed(1)}</span>
				</div>
			{/if}
			{#if ndc.underfill > 0}
				<div class="flex items-center justify-between bg-red-50 rounded-lg p-2.5 border-2 border-red-300 shadow-md">
					<span class="text-xs font-semibold text-red-800">Underfill</span>
					<span class="text-sm font-bold text-red-800">-{ndc.underfill.toFixed(1)}</span>
				</div>
			{/if}
		</div>
	{/if}
</div>

