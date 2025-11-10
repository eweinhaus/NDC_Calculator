<script lang="ts">
	export let type: 'form' | 'drug-info' | 'quantity' | 'ndc-list' | 'results' = 'results';
</script>

<style>
	@keyframes shimmer {
		0% {
			background-position: -1000px 0;
		}
		100% {
			background-position: 1000px 0;
		}
	}

	.shimmer {
		background: linear-gradient(
			to right,
			#f0f0f0 0%,
			#e0e0e0 20%,
			#f0f0f0 40%,
			#f0f0f0 100%
		);
		background-size: 1000px 100%;
		animation: shimmer 2s infinite linear;
	}

	@media (prefers-reduced-motion: reduce) {
		.shimmer {
			animation: none;
			background: #f0f0f0;
		}
	}
</style>

<div aria-busy="true" aria-label="Loading..." class="w-full">
	{#if type === 'form'}
		<!-- Form skeleton -->
		<div class="space-y-4">
			<div class="space-y-2">
				<div class="h-4 w-24 shimmer rounded"></div>
				<div class="h-10 w-full shimmer rounded"></div>
			</div>
			<div class="space-y-2">
				<div class="h-4 w-24 shimmer rounded"></div>
				<div class="h-20 w-full shimmer rounded"></div>
			</div>
			<div class="space-y-2">
				<div class="h-4 w-24 shimmer rounded"></div>
				<div class="h-10 w-full shimmer rounded"></div>
			</div>
			<div class="h-10 w-full shimmer rounded"></div>
		</div>
	{:else if type === 'drug-info'}
		<!-- Drug info skeleton -->
		<div class="bg-white rounded-lg shadow p-4">
			<div class="h-6 w-48 shimmer rounded mb-3"></div>
			<div class="space-y-2">
				<div class="h-4 w-32 shimmer rounded"></div>
				<div class="h-4 w-40 shimmer rounded"></div>
				<div class="h-4 w-36 shimmer rounded"></div>
			</div>
		</div>
	{:else if type === 'quantity'}
		<!-- Quantity skeleton -->
		<div class="bg-white rounded-lg shadow p-4">
			<div class="h-6 w-40 shimmer rounded mb-3"></div>
			<div class="space-y-2">
				<div class="h-4 w-32 shimmer rounded"></div>
				<div class="h-4 w-32 shimmer rounded"></div>
				<div class="h-4 w-32 shimmer rounded"></div>
				<div class="border-t border-gray-200 pt-2 mt-2">
					<div class="h-4 w-24 shimmer rounded"></div>
					<div class="h-8 w-32 shimmer rounded mt-2"></div>
				</div>
			</div>
		</div>
	{:else if type === 'ndc-list'}
		<!-- NDC list skeleton -->
		<div class="space-y-3">
			{#each Array(3) as _}
				<div class="bg-white rounded-lg shadow p-4 border border-gray-200">
					<div class="h-5 w-32 shimmer rounded mb-2"></div>
					<div class="h-4 w-48 shimmer rounded mb-1"></div>
					<div class="h-4 w-40 shimmer rounded"></div>
				</div>
			{/each}
		</div>
	{:else}
		<!-- Results skeleton (full layout) -->
		<div class="space-y-6">
			<!-- Drug info skeleton -->
			<div class="bg-white rounded-lg shadow p-4">
				<div class="h-6 w-48 shimmer rounded mb-3"></div>
				<div class="space-y-2">
					<div class="h-4 w-32 shimmer rounded"></div>
					<div class="h-4 w-40 shimmer rounded"></div>
				</div>
			</div>
			<!-- Quantity skeleton -->
			<div class="bg-white rounded-lg shadow p-4">
				<div class="h-6 w-40 shimmer rounded mb-3"></div>
				<div class="space-y-2">
					<div class="h-4 w-32 shimmer rounded"></div>
					<div class="h-4 w-32 shimmer rounded"></div>
					<div class="h-8 w-32 shimmer rounded mt-2"></div>
				</div>
			</div>
			<!-- Recommended NDC skeleton -->
			<div class="bg-blue-50 border-2 border-blue-500 rounded-lg shadow p-4">
				<div class="h-6 w-40 shimmer rounded mb-3"></div>
				<div class="space-y-2">
					<div class="h-4 w-48 shimmer rounded"></div>
					<div class="h-4 w-56 shimmer rounded"></div>
					<div class="h-4 w-44 shimmer rounded"></div>
				</div>
			</div>
			<!-- Alternatives skeleton -->
			<div class="bg-white rounded-lg shadow p-4">
				<div class="h-6 w-32 shimmer rounded"></div>
			</div>
		</div>
	{/if}
</div>

