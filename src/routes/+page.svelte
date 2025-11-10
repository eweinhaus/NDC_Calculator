<script lang="ts">
	import { fade } from 'svelte/transition';
	import type { CalculationResponse, CalculationRequest, ApiError } from '../lib/types/api.js';
	import ResultsDisplay from '../lib/components/results/ResultsDisplay.svelte';
	import ErrorDisplay from '../lib/components/ErrorDisplay.svelte';
	import SkeletonLoader from '../lib/components/SkeletonLoader.svelte';
	import Toast from '../lib/components/Toast.svelte';
	import { debounce } from '../lib/utils/debounce.js';

	// Form state
	let drugInput = '';
	let sig = '';
	let daysSupply: number | '' = '';
	let errors: Record<string, string> = {};
	let touched: Record<string, boolean> = {};

	// API state
	let isLoading = false;
	let results: CalculationResponse['data'] | null = null;
	let error: ApiError | null = null;
	let suggestions: string[] = [];
	let loadingStage: 'drug' | 'ndc' | 'sig' | 'calculation' | null = null;

	// Validation - reactive to form inputs
	$: {
		const newErrors: Record<string, string> = {};

		if (!drugInput.trim()) {
			newErrors.drugInput = 'Drug name or NDC is required';
		}

		if (!sig.trim()) {
			newErrors.sig = 'SIG is required';
		}

		const days = Number(daysSupply);
		if (!daysSupply || isNaN(days) || days < 1 || days > 365) {
			newErrors.daysSupply = 'Days supply must be between 1 and 365';
		}

		errors = newErrors;
	}

	$: isValid = Object.keys(errors).length === 0;

	// Only show errors for touched fields
	function shouldShowError(field: string): boolean {
		return touched[field] === true && !!errors[field];
	}

	function handleBlur(field: string) {
		touched[field] = true;
	}

	async function calculate() {
		// Clear previous results and errors
		results = null;
		error = null;
		suggestions = [];
		isLoading = true;

		try {
			const requestBody: CalculationRequest = {
				drugInput: drugInput.trim(),
				sig: sig.trim(),
				daysSupply: Number(daysSupply),
			};

			loadingStage = 'drug';
			const response = await fetch('/api/calculate', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(requestBody),
			});

			const data: CalculationResponse = await response.json();

			if (!response.ok || !data.success) {
				// Handle error response
				if (data.error) {
					error = data.error;
					// Extract suggestions if available
					if (data.error.details && typeof data.error.details === 'object') {
						const details = data.error.details as Record<string, unknown>;
						if (Array.isArray(details.suggestions)) {
							suggestions = details.suggestions as string[];
						}
					}
				} else {
					error = {
						code: 'API_ERROR',
						message: 'An error occurred while processing your request.',
					};
				}
				isLoading = false;
				loadingStage = null;
				return;
			}

			// Success - display results
			if (data.data) {
				results = data.data;
			} else {
				error = {
					code: 'CALCULATION_ERROR',
					message: 'No results returned from calculation.',
				};
			}
		} catch (err) {
			// Network or other error
			error = {
				code: 'NETWORK_ERROR',
				message: 'Network error. Please check your connection and try again.',
			};
		} finally {
			isLoading = false;
			loadingStage = null;
		}
	}

	async function handleSubmit() {
		// Mark all fields as touched on submit attempt
		touched = { drugInput: true, sig: true, daysSupply: true };

		if (!isValid) return;

		await calculate();
	}

	function handleRetry() {
		calculate();
	}

	function handleSuggestion(event: { detail: string }) {
		drugInput = event.detail;
		// Auto-submit after suggestion is selected
		setTimeout(() => {
			calculate();
		}, 100);
	}

	function handleCalculateAgain() {
		results = null;
		error = null;
		drugInput = '';
		sig = '';
		daysSupply = '';
		touched = {};
		errors = {};
		// Focus first input
		setTimeout(() => {
			const firstInput = document.getElementById('drugInput');
			if (firstInput) {
				firstInput.focus();
			}
		}, 100);
	}

	// Scroll to top when results appear
	$: if (results) {
		setTimeout(() => {
			window.scrollTo({ top: 0, behavior: 'smooth' });
		}, 100);
	}
</script>

<svelte:head>
	<title>NDC Packaging & Quantity Calculator</title>
</svelte:head>

<div class="container mx-auto max-w-6xl p-4 md:p-6 lg:p-8">
	<header class="mb-8">
		<h1 class="text-3xl font-bold text-center mb-2">NDC Packaging & Quantity Calculator</h1>
		<p class="text-center text-gray-600 text-sm md:text-base">
			Calculate optimal NDC selections and quantities from prescription instructions
		</p>
	</header>

	<main id="main-content">
		{#if !results && !error}
			<form on:submit|preventDefault={handleSubmit} class="space-y-4 md:space-y-6 max-w-2xl mx-auto">
				<div class="form-group">
					<label for="drugInput" class="block mb-2 font-medium text-sm md:text-base">
						Drug Name or NDC
						<span class="text-red-500" aria-label="required">*</span>
					</label>
					<input
						id="drugInput"
						type="text"
						bind:value={drugInput}
						on:blur={() => handleBlur('drugInput')}
						placeholder="e.g., Lisinopril or 00002-3227-30"
						class="w-full px-3 py-2 md:py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 {shouldShowError('drugInput') ? 'border-red-500' : ''}"
						aria-invalid={shouldShowError('drugInput') ? 'true' : 'false'}
						aria-describedby={shouldShowError('drugInput') ? 'drugInput-error' : undefined}
						aria-required="true"
						required
					/>
					{#if shouldShowError('drugInput')}
						<span id="drugInput-error" class="block text-red-500 text-sm mt-1" role="alert">
							{errors.drugInput}
						</span>
					{/if}
				</div>

				<div class="form-group">
					<label for="sig" class="block mb-2 font-medium text-sm md:text-base">
						SIG (Prescription Instructions)
						<span class="text-red-500" aria-label="required">*</span>
					</label>
					<textarea
						id="sig"
						bind:value={sig}
						on:blur={() => handleBlur('sig')}
						placeholder="e.g., Take 1 tablet by mouth twice daily"
						rows="3"
						class="w-full px-3 py-2 md:py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 {shouldShowError('sig') ? 'border-red-500' : ''}"
						aria-invalid={shouldShowError('sig') ? 'true' : 'false'}
						aria-describedby={shouldShowError('sig') ? 'sig-error' : undefined}
						aria-required="true"
						required
					></textarea>
					{#if shouldShowError('sig')}
						<span id="sig-error" class="block text-red-500 text-sm mt-1" role="alert">
							{errors.sig}
						</span>
					{/if}
				</div>

				<div class="form-group">
					<label for="daysSupply" class="block mb-2 font-medium text-sm md:text-base">
						Days' Supply
						<span class="text-red-500" aria-label="required">*</span>
					</label>
					<input
						id="daysSupply"
						type="number"
						bind:value={daysSupply}
						on:blur={() => handleBlur('daysSupply')}
						min="1"
						max="365"
						placeholder="e.g., 30"
						class="w-full px-3 py-2 md:py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 {shouldShowError('daysSupply') ? 'border-red-500' : ''}"
						aria-invalid={shouldShowError('daysSupply') ? 'true' : 'false'}
						aria-describedby={shouldShowError('daysSupply') ? 'daysSupply-error' : undefined}
						aria-required="true"
						required
					/>
					{#if shouldShowError('daysSupply')}
						<span id="daysSupply-error" class="block text-red-500 text-sm mt-1" role="alert">
							{errors.daysSupply}
						</span>
					{/if}
				</div>

				<button
					type="submit"
					disabled={!isValid || isLoading}
					class="w-full md:w-auto md:min-w-[120px] px-4 py-2 md:py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] text-sm md:text-base"
				>
					{isLoading ? 'Calculating...' : 'Calculate'}
				</button>
			</form>
		{/if}

		{#if isLoading}
			<div class="mt-8" transition:fade>
				<SkeletonLoader type="results" />
			</div>
		{/if}

		{#if error && !isLoading}
			<div class="mt-8 max-w-2xl mx-auto" transition:fade>
				<ErrorDisplay
					{error}
					{suggestions}
					onRetry={handleRetry}
					on:suggestion={handleSuggestion}
				/>
			</div>
		{/if}

		{#if results && !isLoading}
			<div class="mt-8" transition:fade>
				<div class="mb-4 flex justify-end">
					<button
						type="button"
						on:click={handleCalculateAgain}
						class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm md:text-base min-h-[44px]"
					>
						Calculate Again
					</button>
				</div>
				<ResultsDisplay results={results} />
			</div>
		{/if}
	</main>
</div>

<Toast />
