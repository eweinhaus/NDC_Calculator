<script lang="ts">
	import { slide } from 'svelte/transition';
	import { toast } from '../stores/toast.js';

	$: currentToast = $toast;
</script>

{#if currentToast}
	<div
		class="fixed bottom-4 right-4 z-50 max-w-sm w-full"
		role="status"
		aria-live="polite"
		transition:slide={{ axis: 'y', duration: 300 }}
	>
		<div
			class="rounded-md shadow-lg p-4 {currentToast.type === 'success'
				? 'bg-emerald-50 border-2 border-emerald-300 text-emerald-900'
				: 'bg-red-500 border-2 border-red-600 text-white'}"
		>
			<div class="flex items-start">
				<svg
					class="w-5 h-5 mr-2 flex-shrink-0 mt-0.5"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					aria-hidden="true"
				>
					{#if currentToast.type === 'success'}
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					{:else}
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					{/if}
				</svg>
				<p class="text-sm font-medium flex-1">{currentToast.message}</p>
			</div>
		</div>
	</div>
{/if}

