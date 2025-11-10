<script lang="ts">
	import { fly } from 'svelte/transition';

	export let inactiveNdcs: Array<{ ndc: string; reason?: string }> | undefined;

	let isExpanded = false;

	function toggle() {
		isExpanded = !isExpanded;
	}
</script>

{#if inactiveNdcs && inactiveNdcs.length > 0}
	<div class="bg-yellow-50 border border-yellow-200 rounded-lg">
		<button
			type="button"
			on:click={toggle}
			class="w-full flex items-center justify-between p-4 text-left hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-yellow-500 rounded-lg"
			aria-expanded={isExpanded}
			aria-controls="inactive-ndcs-content"
			aria-label="Inactive NDCs"
		>
			<h3 class="text-lg font-semibold text-yellow-900">
				Inactive NDCs Found ({inactiveNdcs.length})
			</h3>
			<svg
				class="w-5 h-5 text-yellow-700 transition-transform {isExpanded ? 'rotate-180' : ''}"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
				aria-hidden="true"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</button>
		{#if isExpanded}
			<div id="inactive-ndcs-content" class="px-4 pb-4" transition:fly={{ y: -10, duration: 200 }}>
				<div class="space-y-2 pt-2">
					{#each inactiveNdcs as item (item.ndc)}
						<div class="bg-white rounded p-2 border border-yellow-200">
							<div class="text-sm font-mono text-gray-900">{item.ndc}</div>
							{#if item.reason}
								<div class="text-xs text-gray-600 mt-1">{item.reason}</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
{/if}

