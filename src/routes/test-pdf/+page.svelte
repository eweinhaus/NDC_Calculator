<script lang="ts">
	import { downloadResultsAsPdf, openPdfInNewTab } from '$lib/utils/pdfGenerator.js';
	import { showToast } from '$lib/stores/toast.js';
	import Toast from '$lib/components/Toast.svelte';
	import type { CalculationResult } from '$lib/types/api.js';

	// Mock data for testing PDF generation
	const mockResults: CalculationResult = {
		drug: {
			name: 'Lisinopril',
			rxcui: '314076',
			strength: '10 mg/1',
			dosageForm: 'TABLET'
		},
		quantity: {
			total: 60,
			unit: 'tablets',
			calculation: {
				dosage: 1,
				frequency: 2,
				daysSupply: 30
			}
		},
		recommendedNdc: {
			ndc: '42708-094-30',
			packageSize: '30 tablets',
			packageDescription: 'Bottle of 30 tablets',
			totalQuantity: 60,
			packageCount: 2,
			manufacturer: 'QPharma, Inc.',
			overfill: 0,
			underfill: 0
		},
		alternatives: [
			{
				ndc: '76420-345-30',
				packageSize: '30 tablets',
				packageDescription: 'Bottle of 30 tablets',
				totalQuantity: 60,
				packageCount: 2,
				manufacturer: 'Asclemed USA, Inc.',
				overfill: 0,
				underfill: 0
			}
		],
		warnings: [
			{
				severity: 'info',
				message: 'This is a test warning message'
			}
		],
		inactiveNdcs: []
	};

	let downloadLog: string[] = [];
	let testComplete = false;

	function handleDownloadPdf() {
		downloadLog = [];
		testComplete = false;
		
		try {
			console.log('[Test PDF] Starting PDF download...');
			downloadLog.push('✓ PDF download function called');
			
			downloadResultsAsPdf(mockResults);
			downloadLog.push('✓ downloadResultsAsPdf() completed without errors');
			downloadLog.push('✓ Check your Downloads folder for: NDC_Calculation_Lisinopril_2025-11-10.pdf');
			downloadLog.push('✓ Check browser console for detailed logs');
			
			showToast('PDF download initiated', 'success');
			testComplete = true;
		} catch (error) {
			console.error('[Test PDF] Error:', error);
			const errorMsg = error instanceof Error ? error.message : 'Unknown error';
			downloadLog.push('✗ Error: ' + errorMsg);
			showToast('Failed to download PDF. Check console for details.', 'error');
			testComplete = true;
		}
	}
	
	function checkDownloadsFolder() {
		alert('Please check your Downloads folder for a file named:\nNDC_Calculation_Lisinopril_2025-11-10.pdf\n\nIf the file exists:\n1. Check the file size (should be around 5-6 KB)\n2. Try opening it with a PDF viewer\n3. Check the file extension is .pdf\n\nIf you see a file without extension or with wrong extension, your browser may be blocking the download.');
	}
	
	function handleOpenInNewTab() {
		try {
			console.log('[Test PDF] Opening PDF in new tab...');
			openPdfInNewTab(mockResults);
			showToast('PDF opened in new tab', 'success');
		} catch (error) {
			console.error('[Test PDF] Error opening in new tab:', error);
			const errorMsg = error instanceof Error ? error.message : 'Unknown error';
			showToast('Failed to open PDF: ' + errorMsg, 'error');
		}
	}
</script>

<div class="container mx-auto p-8 max-w-4xl">
	<h1 class="text-3xl font-bold mb-6">PDF Download Test Page</h1>
	
	<div class="bg-blue-100 border border-blue-400 text-blue-800 px-4 py-3 rounded mb-6">
		<p><strong>Test Instructions:</strong></p>
		<ol class="list-decimal list-inside mt-2 space-y-1">
			<li>Click the "Download Test PDF" button below</li>
			<li>Check if a file download is triggered</li>
			<li>Check your Downloads folder for the file</li>
			<li>Try to open the file - it should be a valid PDF</li>
			<li>Check the browser console for any errors</li>
		</ol>
	</div>

	<div class="mb-6 flex flex-wrap gap-3">
		<button
			on:click={handleDownloadPdf}
			class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg flex items-center gap-2"
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
					d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
				/>
			</svg>
			Download PDF
		</button>
		
		<button
			on:click={handleOpenInNewTab}
			class="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg flex items-center gap-2"
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
			Open in New Tab
		</button>
		
		<button
			on:click={checkDownloadsFolder}
			class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg"
		>
			Check Downloads Folder
		</button>
	</div>

	{#if testComplete && downloadLog.length > 0}
		<div class="bg-white border-2 border-blue-500 rounded-lg p-4 mb-6">
			<h3 class="font-bold text-lg mb-2">Download Status:</h3>
			<ul class="space-y-1">
				{#each downloadLog as log}
					<li class="text-sm {log.startsWith('✗') ? 'text-red-600' : 'text-green-600'}">{log}</li>
				{/each}
			</ul>
		</div>
	{/if}

	<div class="bg-gray-100 p-4 rounded">
		<h2 class="font-bold mb-2">Mock Data Being Used:</h2>
		<pre class="text-xs overflow-auto">{JSON.stringify(mockResults, null, 2)}</pre>
	</div>
</div>

<Toast />

<style>
	.container {
		font-family: system-ui, -apple-system, sans-serif;
	}
</style>

