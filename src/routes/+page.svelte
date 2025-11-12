<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { browser } from '$app/environment';
	import type { CalculationResponse, CalculationRequest, ApiError } from '../lib/types/api.js';
	import ResultsDisplay from '../lib/components/results/ResultsDisplay.svelte';
	import ErrorDisplay from '../lib/components/ErrorDisplay.svelte';
	import SkeletonLoader from '../lib/components/SkeletonLoader.svelte';
	import Toast from '../lib/components/Toast.svelte';
	import Autocomplete from '../lib/components/Autocomplete.svelte';
	import { debounce } from '../lib/utils/debounce.js';
	import { showToast } from '../lib/stores/toast.js';
	import { autocompletePreload, loadPreloadData } from '../lib/stores/autocompletePreload.js';

	// Custom slide-up transition from bottom with smooth animation
	function slideUp(node: Element, { duration = 1200, delay = 300 } = {}) {
		return {
			delay,
			duration,
			easing: cubicOut,
			css: (t: number) => {
				const eased = cubicOut(t);
				// Slide up from 100% below with opacity fade-in
				return `transform: translateY(${(1 - eased) * 100}%); opacity: ${Math.min(eased * 1.2, 1)};`;
			}
		};
	}



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
	let shouldSlideForm = false;
	let hadResultsBefore = false; // Track if we had results before starting calculation

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
		// Track if we had results before (form was on left)
		hadResultsBefore = results !== null;
		
		// Clear previous results and errors
		results = null;
		error = null;
		suggestions = [];
		isLoading = true;
		// Temporarily remove slide animation when clearing results
		// It will be re-applied if we get new results and form was centered before
		// This prevents the form from animating off-screen when grid layout changes
		shouldSlideForm = false;

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
				shouldSlideForm = false;
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
					// Keep form centered for NO_NDCS_FOUND error
					if (errorData.error.code === 'NO_NDCS_FOUND') {
						shouldSlideForm = false;
					}
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
				shouldSlideForm = false;
				isLoading = false;
				loadingStage = null;
				return;
			}

			if (!data.success) {
				// Handle error response
				if (data.error) {
					error = data.error;
					// Keep form centered for NO_NDCS_FOUND error
					if (data.error.code === 'NO_NDCS_FOUND') {
						shouldSlideForm = false;
					}
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
				// Only trigger slide animation if form was centered (no previous results)
				// If form was already on left, keep it there without animation
				if (!hadResultsBefore) {
					shouldSlideForm = true;
				}
				// If form was already on left, keep shouldSlideForm as is (no change)
			} else {
				error = {
					code: 'CALCULATION_ERROR',
					message: 'No results returned from calculation.',
				};
				shouldSlideForm = false;
			}
		} catch (err) {
			// Unexpected error
			console.error('Unexpected error in calculate:', err);
			const errorMessage = err instanceof Error ? err.message : 'Unknown error';
			error = {
				code: 'NETWORK_ERROR',
				message: `An unexpected error occurred: ${errorMessage}. Please check your connection and try again.`,
			};
			shouldSlideForm = false;
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
		shouldSlideForm = false;
		// Scroll to top to show the form
		if (browser) {
			window.scrollTo({ top: 0, behavior: 'smooth' });
			// Focus first input
			setTimeout(() => {
				const firstInput = document.getElementById('drugInput');
				if (firstInput) {
					firstInput.focus();
				}
			}, 100);
		}
	}

	function handleCloseError() {
		error = null;
		suggestions = [];
	}

	function handleErrorKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			handleCloseError();
		}
	}

	// Scroll to top when results appear (but not on errors)
	$: if (browser && results && !error) {
		setTimeout(() => {
			window.scrollTo({ top: 0, behavior: 'smooth' });
			// Reset slide animation after layout adjusts
			setTimeout(() => {
				shouldSlideForm = false;
			}, 700);
		}, 100);
	}

	// Lock body scroll when error modal is open
	$: if (browser) {
		if (error && !isLoading) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}
	}

	// Load preload data in background after page mount (non-blocking)
	onMount(() => {
		loadPreloadData();
		
		// Cleanup on unmount
		return () => {
			document.body.style.overflow = '';
		};
	});

	// Access preloaded data reactively (only in browser)
	$: preloadedData = browser ? $autocompletePreload.data : null;
</script>

<svelte:head>
	<title>NDC Packaging & Quantity Calculator</title>
</svelte:head>

<div class="bg-offwhite-warm">
	<div class="w-full px-4 md:px-6 lg:px-8 pt-4 md:pt-6 lg:pt-8">
	<main id="main-content" class="transition-all duration-1200 ease-in-out {results && !error ? '' : 'lg:flex lg:items-center lg:justify-center'}">
		<!-- Two-column layout: Form on left, Results on right -->
		<div class="grid grid-cols-1 lg:grid-cols-[480px_1fr] gap-6 lg:gap-8 animate-slide-layout w-full {(results && !error) || (isLoading && hadResultsBefore) ? '' : 'lg:max-w-lg lg:grid-cols-1'}">
			<!-- Left Column: Calculation Form (Sticky) -->
			<div 
				id="calculation-form" 
				class="lg:sticky lg:top-4 lg:self-start transition-transform duration-1200 ease-in-out {results && !error ? 'lg:translate-x-0' : ''}"
			>
				<div 
					class="bg-white rounded-lg shadow-md border-2 border-red-600 overflow-hidden animate-slide-form {shouldSlideForm ? 'slide-left' : ''}"
				>
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
							<p class="text-sm text-gray-600 mb-1.5">Enter the medication name or NDC code (e.g., 00002-3227-30)</p>
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
								preloadedData={preloadedData}
							/>
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
							<p class="text-sm text-gray-600 mb-1.5">Enter the prescription instructions as written by the prescriber</p>
							<input
								id="sig"
								type="text"
								bind:value={sig}
								on:blur={() => handleBlur('sig')}
								placeholder="e.g., Take 1 tablet by mouth twice daily"
								class="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-primary focus:border-teal-primary focus:bg-offwhite-warm transition-all {shouldShowError('sig') ? 'border-red-500 focus:ring-red-500' : ''}"
								aria-invalid={shouldShowError('sig') ? 'true' : 'false'}
								aria-describedby={shouldShowError('sig') ? 'sig-error' : undefined}
								aria-required="true"
								required
							/>
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
							<p class="text-sm text-gray-600 mb-1.5">Number of days the prescription should last (1-365 days)</p>
							<input
								id="daysSupply"
								type="number"
								bind:value={daysSupply}
								on:blur={() => handleBlur('daysSupply')}
								min="1"
								max="365"
								placeholder="e.g., 30"
								class="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-primary focus:border-teal-primary focus:bg-offwhite-warm transition-all {shouldShowError('daysSupply') ? 'border-red-500 focus:ring-red-500' : ''}"
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

						<!-- Calculate Button -->
						<div class="pt-1">
							<button
								type="submit"
								disabled={!isValid || isLoading}
								class="w-full px-6 py-3 bg-red-600 text-white font-semibold text-base rounded-md hover:bg-red-700 active:bg-red-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 shadow-sm hover:shadow-md min-h-[44px] flex items-center justify-center gap-2"
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
			<div class="min-w-0 flex flex-col overflow-visible {results && !error ? '' : 'hidden lg:block lg:opacity-0 lg:pointer-events-none lg:h-0'}">
		{#if isLoading}
			<div transition:fade>
				<SkeletonLoader type="results" />
			</div>
		{/if}

		{#if results && !isLoading && !error}
			<div transition:slideUp={{ duration: 1200, delay: 300 }} class="flex-1">
				<ResultsDisplay results={results} />
			</div>
		{/if}
			</div>
		</div>
	</main>
	</div>
</div>

<!-- Error Modal Popup -->
{#if error && !isLoading}
	<!-- Backdrop -->
	<div 
		class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
		on:click|self={handleCloseError}
		on:keydown={handleErrorKeydown}
		role="dialog"
		aria-modal="true"
		aria-labelledby="error-title"
		transition:fade={{ duration: 200 }}
	>
		<!-- Modal Content -->
		<div 
			class="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto relative border-2 border-red-600"
			on:click|stopPropagation
			transition:fade={{ duration: 200 }}
		>
			<!-- Close Button -->
			<button
				on:click={handleCloseError}
				class="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-primary transition-colors z-10"
				aria-label="Close error dialog"
			>
				<svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
			<div class="p-6">
				<ErrorDisplay
					{error}
					{suggestions}
					onRetry={handleRetry}
					on:suggestion={handleSuggestion}
				/>
			</div>
		</div>
	</div>
{/if}

<Toast />
