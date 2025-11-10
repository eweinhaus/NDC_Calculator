<script lang="ts">
	import type { Warning } from '../../types/warning.js';

	export let warnings: Warning[];

	function getSeverityClasses(severity: Warning['severity']) {
		switch (severity) {
			case 'error':
				return 'bg-red-50 border-red-200 text-red-800';
			case 'warning':
				return 'bg-yellow-50 border-yellow-200 text-yellow-800';
			case 'info':
				return 'bg-blue-50 border-blue-200 text-blue-800';
			default:
				return 'bg-gray-50 border-gray-200 text-gray-800';
		}
	}

	function getIcon(severity: Warning['severity']) {
		switch (severity) {
			case 'error':
				return 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
			case 'warning':
				return 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z';
			case 'info':
				return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
			default:
				return '';
		}
	}
</script>

{#if warnings && warnings.length > 0}
	<div class="space-y-3" role={warnings.some((w) => w.severity === 'error') ? 'alert' : 'status'}>
		<h3 class="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
			<svg class="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
			</svg>
			Warnings & Notices
		</h3>
		<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
			{#each warnings as warning (warning.message)}
				<div
					class="border-2 rounded-xl p-4 shadow-sm {getSeverityClasses(warning.severity)}"
					role={warning.severity === 'error' ? 'alert' : 'status'}
				>
					<div class="flex items-start gap-3">
						<svg
							class="w-6 h-6 flex-shrink-0 mt-0.5"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d={getIcon(warning.severity)}
							/>
						</svg>
						<div class="flex-1">
							<div class="font-bold text-sm mb-1.5 uppercase tracking-wide">{warning.type.replace(/_/g, ' ')}</div>
							<div class="text-sm font-medium">{warning.message}</div>
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>
{/if}

