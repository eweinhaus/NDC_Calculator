<script lang="ts">
	import type { QuantityResult } from '../../types/sig.js';

	export let quantity: QuantityResult;
</script>

<div class="bg-white rounded-lg shadow p-4" aria-label="Quantity calculation breakdown">
	<h3 class="text-lg font-semibold mb-3 text-gray-900">Quantity Calculation</h3>
	<div class="space-y-2">
		<div class="flex items-center justify-between">
			<span class="text-sm text-gray-600">Dosage:</span>
			<span class="text-sm font-medium text-gray-900">{quantity.calculation.dosage} {quantity.unit}</span>
		</div>
		<div class="flex items-center justify-between">
			<span class="text-sm text-gray-600">Frequency:</span>
			<span class="text-sm font-medium text-gray-900">{quantity.calculation.frequency} per day</span>
		</div>
		<div class="flex items-center justify-between">
			<span class="text-sm text-gray-600">Days' Supply:</span>
			<span class="text-sm font-medium text-gray-900">{quantity.calculation.daysSupply} days</span>
		</div>
		<div class="border-t border-gray-200 pt-2 mt-2">
			<div class="flex items-center justify-between">
				<span class="text-sm text-gray-600">Formula:</span>
				<span class="text-xs text-gray-500">
					({quantity.calculation.dosage} × {quantity.calculation.frequency}) × {quantity.calculation.daysSupply}
				</span>
			</div>
			<div class="flex items-center justify-between mt-2">
				<span class="text-base font-semibold text-gray-900">Total Quantity:</span>
				<span class="text-2xl font-bold text-blue-600">{quantity.total} {quantity.unit}</span>
			</div>
		</div>
	</div>
</div>

