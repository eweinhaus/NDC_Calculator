<script lang="ts">
	import type { QuantityResult } from '../../types/sig.js';

	export let quantity: QuantityResult;
</script>

<div class="bg-white rounded-xl shadow-md border border-gray-200 p-5" aria-label="Quantity calculation breakdown">
	<h3 class="text-xl font-bold mb-4 text-gray-900 flex items-center gap-2">
		<svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
		</svg>
		Quantity Calculation
	</h3>
	<div class="space-y-2.5">
		<div class="flex items-center justify-between py-1.5 border-b border-gray-200">
			<span class="text-sm font-semibold text-gray-700">Dosage:</span>
			<span class="text-sm font-medium text-gray-900">{quantity.calculation.dosage} {quantity.unit}</span>
		</div>
		<div class="flex items-center justify-between py-1.5 border-b border-gray-200">
			<span class="text-sm font-semibold text-gray-700">Frequency:</span>
			<span class="text-sm font-medium text-gray-900">{quantity.calculation.frequency} per day</span>
		</div>
		<div class="flex items-center justify-between py-1.5 border-b border-gray-200">
			<span class="text-sm font-semibold text-gray-700">Days' Supply:</span>
			<span class="text-sm font-medium text-gray-900">{quantity.calculation.daysSupply} days</span>
		</div>
		<div class="pt-3 mt-3 border-t-2 border-gray-300">
			<div class="flex items-center justify-between mb-2">
				<span class="text-xs font-medium text-gray-600">Formula:</span>
				<span class="text-xs font-mono text-gray-600 bg-gray-50 px-2 py-1 rounded">
					({quantity.calculation.dosage} × {quantity.calculation.frequency}) × {quantity.calculation.daysSupply}
				</span>
			</div>
			<div class="flex items-center justify-between pt-2">
				<span class="text-base font-bold text-gray-900">Total Quantity:</span>
				<span class="text-3xl font-extrabold text-blue-600">{quantity.total} <span class="text-lg">{quantity.unit}</span></span>
			</div>
		</div>
	</div>
</div>

