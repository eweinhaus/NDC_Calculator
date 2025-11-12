<script lang="ts">
	import { fade } from 'svelte/transition';
	import type { CalculationResponse, CalculationRequest, ApiError } from '../lib/types/api.js';
	import ResultsDisplay from '../lib/components/results/ResultsDisplay.svelte';
	import ErrorDisplay from '../lib/components/ErrorDisplay.svelte';
	import SkeletonLoader from '../lib/components/SkeletonLoader.svelte';
	import Toast from '../lib/components/Toast.svelte';
	import Autocomplete from '../lib/components/Autocomplete.svelte';
	import { debounce } from '../lib/utils/debounce.js';
	import { showToast } from '../lib/stores/toast.js';

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
			let response: Response;
			try {
				response = await fetch('/api/calculate', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(requestBody),
				});
			} catch (fetchError) {
				// Network error - server not reachable
				console.error('Fetch error:', fetchError);
				error = {
					code: 'NETWORK_ERROR',
					message: 'Could not connect to the server. Please make sure the development server is running.',
				};
				isLoading = false;
				loadingStage = null;
				return;
			}

			// Check if response is ok before parsing JSON
			if (!response.ok) {
				// Try to parse error response
				let errorData: CalculationResponse | null = null;
				try {
					const text = await response.text();
					if (text) {
						errorData = JSON.parse(text) as CalculationResponse;
					}
				} catch (parseError) {
					// Response is not valid JSON
					console.error('Error parsing response:', parseError);
				}

				if (errorData?.error) {
					error = errorData.error;
					// Extract suggestions if available
					if (errorData.error.details && typeof errorData.error.details === 'object') {
						const details = errorData.error.details as Record<string, unknown>;
						if (Array.isArray(details.suggestions)) {
							suggestions = details.suggestions as string[];
						}
					}
				} else {
					error = {
						code: 'API_ERROR',
						message: `Server error (${response.status}): ${response.statusText || 'Unknown error'}`,
					};
				}
				isLoading = false;
				loadingStage = null;
				return;
			}

			// Parse JSON response
			let data: CalculationResponse;
			try {
				const text = await response.text();
				if (!text) {
					throw new Error('Empty response from server');
				}
				data = JSON.parse(text) as CalculationResponse;
			} catch (parseError) {
				console.error('Error parsing JSON response:', parseError);
				error = {
					code: 'API_ERROR',
					message: 'Invalid response from server. Please try again.',
				};
				isLoading = false;
				loadingStage = null;
				return;
			}

			if (!data.success) {
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
			// Unexpected error
			console.error('Unexpected error in calculate:', err);
			const errorMessage = err instanceof Error ? err.message : 'Unknown error';
			error = {
				code: 'NETWORK_ERROR',
				message: `An unexpected error occurred: ${errorMessage}. Please check your connection and try again.`,
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
		// If SIG parse failed, reset to fresh home page instead of retrying
		if (error?.code === 'SIG_PARSE_FAILED') {
			handleCalculateAgain();
			return;
		}
		// For other errors, retry the calculation
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
		suggestions = [];
		drugInput = '';
		sig = '';
		daysSupply = '';
		touched = {};
		errors = {};
		// Scroll to top to show the form
		window.scrollTo({ top: 0, behavior: 'smooth' });
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

<div class="min-h-screen bg-teal-soft-bg pb-8">
	<div class="w-full px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-8">
	<header class="mb-6 text-center">
		<div class="mb-4 relative flex justify-center">
			<div class="flex items-center gap-3">
				<svg class="w-10 h-10 text-teal-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
				</svg>
				<h1 class="text-4xl md:text-5xl font-extrabold text-gray-900">
					NDC Calculator
				</h1>
				<!-- Invisible spacer to balance the icon on the left -->
				<div class="w-10 h-10" aria-hidden="true"></div>
			</div>
		</div>
		<p class="text-gray-600 text-base md:text-lg max-w-2xl mx-auto">
			Calculate optimal NDC selections and quantities from prescription instructions
		</p>
	</header>

	<main id="main-content">
		<!-- Two-column layout: Form on left, Results on right -->
		<div class="grid grid-cols-1 lg:grid-cols-[480px_1fr] gap-6 lg:gap-8">
			<!-- Left Column: Calculation Form (Sticky) -->
			<div id="calculation-form" class="lg:sticky lg:top-4 lg:self-start">
				<div class="bg-white rounded-2xl shadow-xl border-2 border-gray-100 overflow-hidden">
					<!-- Form Content - Always Visible -->
					<form on:submit|preventDefault={handleSubmit} class="p-6 space-y-5">
						<!-- Drug Name Field -->
						<div class="form-group">
							<label for="drugInput" class="flex items-center gap-2 mb-2 font-semibold text-gray-800 text-base">
								<svg class="w-5 h-5 text-teal-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
								</svg>
								Drug Name or NDC
								<span class="text-red-500" aria-label="required">*</span>
							</label>
							<Autocomplete
								id="drugInput"
								bind:value={drugInput}
								label=""
								placeholder="e.g., Lisinopril or 00002-3227-30"
								required={true}
								error={shouldShowError('drugInput') ? errors.drugInput : null}
								on:input={(event) => {
									drugInput = event.detail;
								}}
								on:blur={() => handleBlur('drugInput')}
								minLength={3}
								maxSuggestions={20}
							/>
							<p class="text-sm text-gray-500 mt-1.5">Enter the medication name or NDC code (e.g., 00002-3227-30)</p>
							{#if shouldShowError('drugInput')}
								<span class="block text-red-600 text-sm mt-1.5 font-medium" role="alert">
									{errors.drugInput}
								</span>
							{/if}
						</div>

						<!-- SIG Field -->
						<div class="form-group">
							<label for="sig" class="flex items-center gap-2 mb-2 font-semibold text-gray-800 text-base">
								<svg class="w-5 h-5 text-teal-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
								</svg>
								SIG (Prescription Instructions)
								<span class="text-red-500" aria-label="required">*</span>
							</label>
							<input
								id="sig"
								type="text"
								bind:value={sig}
								on:blur={() => handleBlur('sig')}
								placeholder="e.g., Take 1 tablet by mouth twice daily"
								class="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-primary focus:border-teal-primary focus:bg-teal-soft-bg/30 transition-all {shouldShowError('sig') ? 'border-red-500 focus:ring-red-500' : ''}"
								aria-invalid={shouldShowError('sig') ? 'true' : 'false'}
								aria-describedby={shouldShowError('sig') ? 'sig-error' : undefined}
								aria-required="true"
								required
							/>
							<p class="text-sm text-gray-500 mt-1.5">Enter the prescription instructions as written by the prescriber</p>
							{#if shouldShowError('sig')}
								<span id="sig-error" class="block text-red-600 text-sm mt-1.5 font-medium" role="alert">
									{errors.sig}
								</span>
							{/if}
						</div>

						<!-- Days Supply Field -->
						<div class="form-group">
							<label for="daysSupply" class="flex items-center gap-2 mb-2 font-semibold text-gray-800 text-base">
								<svg class="w-5 h-5 text-teal-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
								</svg>
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
								class="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-primary focus:border-teal-primary focus:bg-teal-soft-bg/30 transition-all {shouldShowError('daysSupply') ? 'border-red-500 focus:ring-red-500' : ''}"
								aria-invalid={shouldShowError('daysSupply') ? 'true' : 'false'}
								aria-describedby={shouldShowError('daysSupply') ? 'daysSupply-error' : undefined}
								aria-required="true"
								required
							/>
							<p class="text-sm text-gray-500 mt-1.5">Number of days the prescription should last (1-365 days)</p>
							{#if shouldShowError('daysSupply')}
								<span id="daysSupply-error" class="block text-red-600 text-sm mt-1.5 font-medium" role="alert">
									{errors.daysSupply}
								</span>
							{/if}
						</div>

						<!-- Calculate Button -->
						<div class="pt-1">
							<button
								type="submit"
								disabled={!isValid || isLoading}
								class="w-full px-6 py-3 bg-teal-primary text-white font-semibold text-base rounded-xl hover:bg-teal-dark disabled:bg-gray-400 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-teal-primary focus:ring-offset-2 shadow-lg hover:shadow-xl min-h-[44px] flex items-center justify-center gap-2"
							>
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
								</svg>
								{isLoading ? 'Calculating...' : 'Calculate'}
							</button>
						</div>
					</form>
				</div>
			</div>

			<!-- Right Column: Results Area -->
			<div class="min-w-0 flex flex-col">
		{#if isLoading}
			<div transition:fade>
				<SkeletonLoader type="results" />
			</div>
		{/if}

		{#if error && !isLoading}
			<div class="max-w-2xl" transition:fade>
				<ErrorDisplay
					{error}
					{suggestions}
					onRetry={handleRetry}
					on:suggestion={handleSuggestion}
				/>
			</div>
		{/if}

		{#if results && !isLoading}
			<div transition:fade class="flex-1">
				<ResultsDisplay results={results} />
			</div>
		{/if}
			</div>
		</div>
	</main>
	</div>
</div>

<Toast />
