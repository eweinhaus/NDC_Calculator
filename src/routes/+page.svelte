<script lang="ts">
	import { fade } from 'svelte/transition';
	import type { CalculationResponse, CalculationRequest, ApiError } from '../lib/types/api.js';
	import ResultsDisplay from '../lib/components/results/ResultsDisplay.svelte';
	import ErrorDisplay from '../lib/components/ErrorDisplay.svelte';
	import SkeletonLoader from '../lib/components/SkeletonLoader.svelte';
	import Toast from '../lib/components/Toast.svelte';
	import { debounce } from '../lib/utils/debounce.js';
	import { openPdfInNewTab } from '../lib/utils/pdfGenerator.js';
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

	function handleOpenPdfInNewTab() {
		if (results) {
			try {
				openPdfInNewTab(results);
				showToast('PDF opened in new tab', 'success');
			} catch (error) {
				console.error('PDF open error:', error);
				const errorMsg = error instanceof Error ? error.message : 'Unknown error';
				showToast(`Failed to open PDF: ${errorMsg}`, 'error');
			}
		}
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

<div class="container mx-auto max-w-7xl p-4 md:p-6 lg:p-8">
	<header class="mb-8 text-center">
		<div class="inline-flex items-center justify-center mb-4">
			<svg class="w-10 h-10 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
			</svg>
			<h1 class="text-4xl md:text-5xl font-extrabold text-gray-900">
				NDC Calculator
			</h1>
		</div>
		<p class="text-gray-600 text-base md:text-lg max-w-2xl mx-auto">
			Calculate optimal NDC selections and quantities from prescription instructions
		</p>
	</header>

	<main id="main-content">
		{#if !results && !error}
			<div class="max-w-3xl mx-auto">
				<form on:submit|preventDefault={handleSubmit} class="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 md:p-8 space-y-5">
					<div class="form-group">
						<label for="drugInput" class="block mb-2 font-semibold text-gray-700 text-sm md:text-base">
							Drug Name or NDC
							<span class="text-red-500" aria-label="required">*</span>
						</label>
						<input
							id="drugInput"
							type="text"
							bind:value={drugInput}
							on:blur={() => handleBlur('drugInput')}
							placeholder="e.g., Lisinopril or 00002-3227-30"
							class="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors {shouldShowError('drugInput') ? 'border-red-500 focus:ring-red-500' : ''}"
							aria-invalid={shouldShowError('drugInput') ? 'true' : 'false'}
							aria-describedby={shouldShowError('drugInput') ? 'drugInput-error' : undefined}
							aria-required="true"
							required
						/>
						{#if shouldShowError('drugInput')}
							<span id="drugInput-error" class="block text-red-600 text-sm mt-1.5 font-medium" role="alert">
								{errors.drugInput}
							</span>
						{/if}
					</div>

					<div class="form-group">
						<label for="sig" class="block mb-2 font-semibold text-gray-700 text-sm md:text-base">
							SIG (Prescription Instructions)
							<span class="text-red-500" aria-label="required">*</span>
						</label>
						<textarea
							id="sig"
							bind:value={sig}
							on:blur={() => handleBlur('sig')}
							placeholder="e.g., Take 1 tablet by mouth twice daily"
							rows="3"
							class="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none {shouldShowError('sig') ? 'border-red-500 focus:ring-red-500' : ''}"
							aria-invalid={shouldShowError('sig') ? 'true' : 'false'}
							aria-describedby={shouldShowError('sig') ? 'sig-error' : undefined}
							aria-required="true"
							required
						></textarea>
						{#if shouldShowError('sig')}
							<span id="sig-error" class="block text-red-600 text-sm mt-1.5 font-medium" role="alert">
								{errors.sig}
							</span>
						{/if}
					</div>

					<div class="form-group">
						<label for="daysSupply" class="block mb-2 font-semibold text-gray-700 text-sm md:text-base">
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
							class="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors {shouldShowError('daysSupply') ? 'border-red-500 focus:ring-red-500' : ''}"
							aria-invalid={shouldShowError('daysSupply') ? 'true' : 'false'}
							aria-describedby={shouldShowError('daysSupply') ? 'daysSupply-error' : undefined}
							aria-required="true"
							required
						/>
						{#if shouldShowError('daysSupply')}
							<span id="daysSupply-error" class="block text-red-600 text-sm mt-1.5 font-medium" role="alert">
								{errors.daysSupply}
							</span>
						{/if}
					</div>

					<button
						type="submit"
						disabled={!isValid || isLoading}
						class="w-full md:w-auto md:min-w-[140px] px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-md hover:shadow-lg min-h-[48px] text-base"
					>
						{isLoading ? 'Calculating...' : 'Calculate'}
					</button>
				</form>
			</div>
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
			<div class="mt-6" transition:fade>
				<div class="mb-5 flex flex-wrap justify-end gap-3">
					<button
						type="button"
						on:click={handleOpenPdfInNewTab}
						class="px-5 py-2.5 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-all focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 text-sm md:text-base min-h-[44px] flex items-center gap-2 shadow-md hover:shadow-lg"
						title="Open PDF in a new tab"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-5 w-5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
							/>
						</svg>
						View PDF
					</button>
					<button
						type="button"
						on:click={handleCalculateAgain}
						class="px-5 py-2.5 bg-gray-600 text-white font-semibold rounded-xl hover:bg-gray-700 transition-all focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 text-sm md:text-base min-h-[44px] shadow-md hover:shadow-lg"
					>
						Calculate Another
					</button>
				</div>
				<div class="max-w-7xl mx-auto">
					<ResultsDisplay results={results} />
				</div>
			</div>
		{/if}
	</main>
</div>

<Toast />
