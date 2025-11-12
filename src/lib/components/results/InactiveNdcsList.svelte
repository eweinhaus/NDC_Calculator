<script lang="ts">
	import { fly } from 'svelte/transition';

	export let inactiveNdcs: Array<{ ndc: string; reason?: string }> | undefined;

	let isExpanded = false;

	function toggle() {
		isExpanded = !isExpanded;
	}
</script>

{#if inactiveNdcs && inactiveNdcs.length > 0}
	<div class="bg-amber-50 border border-amber-300 rounded-md shadow-sm">
		<button
			type="button"
			on:click={toggle}
			class="w-full flex items-center justify-between p-2.5 text-left hover:bg-amber-100/50 focus:outline-none focus:ring-1 focus:ring-amber-500 rounded-md transition-colors"
			aria-expanded={isExpanded}
			aria-controls="inactive-ndcs-content"
			aria-label="Inactive NDCs"
		>
			<h3 class="text-base font-bold text-amber-900 flex items-center gap-2">
				<svg class="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
				</svg>
				Inactive NDCs Found ({inactiveNdcs.length})
			</h3>
			<svg
				class="w-5 h-5 text-amber-700 transition-transform {isExpanded ? 'rotate-180' : ''}"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
				aria-hidden="true"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</button>
		{#if isExpanded}
			<div id="inactive-ndcs-content" class="px-2.5 pb-2.5" transition:fly={{ y: -10, duration: 200 }}>
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 pt-1.5">
					{#each inactiveNdcs as item (item.ndc)}
						<div class="bg-offwhite-warm rounded-md p-2 border-2 border-amber-200 shadow-sm">
							<div class="text-xs font-mono font-bold text-gray-900">{item.ndc}</div>
							{#if item.reason}
								<div class="text-xs text-gray-600 mt-1 font-medium">{item.reason}</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
{/if}

