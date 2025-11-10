import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { CalculationResponse, CalculationRequest, ApiError } from '$lib/types/api.js';
import { parse as parseSig } from '$lib/core/sigParser';
import { calculate as calculateQuantity } from '$lib/core/quantityCalculator';
import { selectOptimal } from '$lib/core/ndcSelector';
import { generateWarnings } from '$lib/core/warningGenerator';
import { searchByDrugName, getSpellingSuggestions } from '$lib/services/rxnorm';
import { getPackagesByRxcui, type FdaPackageDetails } from '$lib/services/fda';
import { parsePackageDescription } from '$lib/core/packageParser';
import { logger } from '$lib/utils/logger';
import type { DrugInfo } from '$lib/types/drug.js';
import type { NdcInfo } from '$lib/types/ndc.js';
import type { NdcSelection } from '$lib/types/ndc.js';
import type { Warning } from '$lib/types/warning.js';

/**
 * POST /api/calculate
 * Complete calculation flow: drug lookup → NDC retrieval → SIG parsing → calculation → NDC selection
 */
export const POST: RequestHandler = async ({ request }) => {
	// Force output to stderr (unbuffered)
	process.stderr.write('🚀 [CALCULATE] POST request received at /api/calculate\n');
	console.error('🚀 [CALCULATE] POST request received at /api/calculate');
	try {
		const body: CalculationRequest = await request.json();
		process.stderr.write(`📝 [CALCULATE] Request body: ${JSON.stringify({ drugInput: body.drugInput, sig: body.sig, daysSupply: body.daysSupply })}\n`);
		console.error('📝 [CALCULATE] Request body parsed:', {
			drugInput: body.drugInput,
			sig: body.sig,
			daysSupply: body.daysSupply,
		});

		// Validate request
		if (!body.drugInput || typeof body.drugInput !== 'string') {
			return json<CalculationResponse>({
				success: false,
				error: {
					code: 'INVALID_INPUT',
					message: 'Drug name or NDC is required.',
				},
			});
		}

		if (!body.sig || typeof body.sig !== 'string') {
			return json<CalculationResponse>({
				success: false,
				error: {
					code: 'INVALID_INPUT',
					message: 'SIG (prescription instructions) is required.',
				},
			});
		}

		if (typeof body.daysSupply !== 'number' || body.daysSupply <= 0 || body.daysSupply > 365) {
			return json<CalculationResponse>({
				success: false,
				error: {
					code: 'INVALID_INPUT',
					message: 'Days supply must be between 1 and 365.',
				},
			});
		}

		// Step 1: Normalize drug name to RxCUI
		console.log('🔍 [CALCULATE] Starting drug normalization', { drugInput: body.drugInput });
		logger.debug('Starting drug normalization', { drugInput: body.drugInput });
		const rxcui = await searchByDrugName(body.drugInput.trim());

		console.log('🔍 [CALCULATE] RxCUI lookup result', { 
			drugInput: body.drugInput.trim(),
			rxcui: rxcui || 'NOT FOUND',
		});

		if (!rxcui) {
			console.warn('⚠️ [CALCULATE] Drug not found, getting spelling suggestions');
			// Try to get spelling suggestions
			const suggestions = await getSpellingSuggestions(body.drugInput.trim());
			console.warn('⚠️ [CALCULATE] Spelling suggestions', { suggestions });
			return json<CalculationResponse>({
				success: false,
				error: {
					code: 'DRUG_NOT_FOUND',
					message: 'Drug not found. Please check the spelling or try a different name.',
					details: {
						suggestions: suggestions || [],
					},
				},
			});
		}

		// Step 2: Get NDCs for this RxCUI from FDA API
		console.log('🔍 [CALCULATE] Fetching NDCs from FDA API', { 
			rxcui, 
			drugInput: body.drugInput.trim() 
		});
		logger.info('Fetching NDCs from FDA API', { 
			rxcui, 
			drugInput: body.drugInput.trim() 
		});
		const fdaPackages = await getPackagesByRxcui(rxcui);

		console.log('📦 [CALCULATE] FDA packages retrieved', {
			rxcui,
			totalPackages: fdaPackages?.length || 0,
			activePackages: fdaPackages?.filter((p) => p.active).length || 0,
			inactivePackages: fdaPackages?.filter((p) => !p.active).length || 0,
		});
		logger.info('FDA packages retrieved', {
			rxcui,
			totalPackages: fdaPackages?.length || 0,
			activePackages: fdaPackages?.filter((p) => p.active).length || 0,
			inactivePackages: fdaPackages?.filter((p) => !p.active).length || 0,
		});

		if (!fdaPackages || fdaPackages.length === 0) {
			console.error('❌ [CALCULATE] No FDA packages found', {
				rxcui,
				drugInput: body.drugInput.trim(),
			});
			logger.warn('No FDA packages found', {
				rxcui,
				drugInput: body.drugInput.trim(),
			});
			return json<CalculationResponse>({
				success: false,
				error: {
					code: 'NO_NDCS_FOUND',
					message: 'No active NDCs found for this drug. The drug may be discontinued or unavailable.',
					details: {
						rxcui,
						drugInput: body.drugInput.trim(),
						reason: 'FDA API returned no packages for this RxCUI',
					},
				},
			});
		}

		// Convert FDA package details to NdcInfo format
		const ndcList: NdcInfo[] = [];
		let parseFailures = 0;

		for (const pkg of fdaPackages) {
				// Parse package description to get package size
				const parsed = parsePackageDescription(pkg.package_description);
				if (!parsed) {
				logger.warn(`Could not parse package description: ${pkg.package_description}`, {
					packageNdc: pkg.package_ndc,
					productNdc: pkg.product_ndc,
				});
				parseFailures++;
				continue;
				}

			ndcList.push({
					ndc: pkg.package_ndc,
					packageSize: parsed.quantity,
					packageDescription: pkg.package_description,
					manufacturer: pkg.manufacturer_name,
					dosageForm: pkg.dosage_form,
					active: pkg.active,
			});
		}

		console.log('📊 [CALCULATE] Package parsing complete', {
			rxcui,
			totalFdaPackages: fdaPackages.length,
			successfullyParsed: ndcList.length,
			parseFailures,
		});
		logger.info('Package parsing complete', {
			rxcui,
			totalFdaPackages: fdaPackages.length,
			successfullyParsed: ndcList.length,
			parseFailures,
		});

		if (ndcList.length === 0) {
			console.warn('⚠️ [CALCULATE] No valid NDCs after parsing', {
				rxcui,
				totalFdaPackages: fdaPackages.length,
				parseFailures,
			});
			logger.warn('No valid NDCs after parsing', {
				rxcui,
				totalFdaPackages: fdaPackages.length,
				parseFailures,
			});
			return json<CalculationResponse>({
				success: false,
				error: {
					code: 'NO_NDCS_FOUND',
					message: 'No valid NDCs found after parsing package descriptions.',
				},
			});
		}

		// Filter out inactive NDCs
		const activeNdcs = ndcList.filter((ndc) => ndc.active);
		const inactiveNdcs = ndcList.filter((ndc) => !ndc.active);

		console.log('🔍 [CALCULATE] NDC filtering complete', {
			rxcui,
			totalNdcs: ndcList.length,
			activeNdcs: activeNdcs.length,
			inactiveNdcs: inactiveNdcs.length,
			inactiveNdcList: inactiveNdcs.map((n) => ({ ndc: n.ndc, description: n.packageDescription })),
		});
		logger.info('NDC filtering complete', {
			rxcui,
			totalNdcs: ndcList.length,
			activeNdcs: activeNdcs.length,
			inactiveNdcs: inactiveNdcs.length,
			inactiveNdcList: inactiveNdcs.map((n) => ({ ndc: n.ndc, description: n.packageDescription })),
		});

		if (activeNdcs.length === 0) {
			const debugInfo = {
				rxcui,
				totalNdcs: ndcList.length,
				inactiveNdcs: inactiveNdcs.length,
				inactiveDetails: inactiveNdcs.map((n) => ({
					ndc: n.ndc,
					description: n.packageDescription,
				})),
				totalFdaPackages: fdaPackages.length,
				activeFdaPackages: fdaPackages.filter((p) => p.active).length,
			};
			console.error('❌ [CALCULATE] No active NDCs found after filtering', debugInfo);
			logger.warn('No active NDCs found after filtering', debugInfo);
			return json<CalculationResponse>({
				success: false,
				error: {
					code: 'NO_NDCS_FOUND',
					message: 'No active NDCs found for this drug.',
					details: {
						rxcui,
						totalNdcs: ndcList.length,
						inactiveNdcs: inactiveNdcs.length,
						inactiveNdcList: inactiveNdcs.map((ndc) => ({
							ndc: ndc.ndc,
							description: ndc.packageDescription,
							reason: 'NDC is inactive',
						})),
					},
				},
			});
		}

		// Step 3: Parse SIG (parallel with NDC fetch, but we already have NDCs)
		logger.debug('Parsing SIG', { sig: body.sig });
		const parsedSig = await parseSig(body.sig);

		if (!parsedSig) {
			return json<CalculationResponse>({
				success: false,
				error: {
					code: 'SIG_PARSE_FAILED',
					message:
						'Could not parse the prescription instructions. Please use a format like "Take 1 tablet twice daily".',
				},
			});
		}

		// Step 4: Calculate quantity
		logger.debug('Calculating quantity', { parsedSig, daysSupply: body.daysSupply });
		let quantity;
		try {
			quantity = calculateQuantity(parsedSig, body.daysSupply);
		} catch (error) {
			logger.error('Quantity calculation failed', error as Error);
			return json<CalculationResponse>({
				success: false,
				error: {
					code: 'CALCULATION_ERROR',
					message: 'An error occurred during quantity calculation.',
				},
			});
		}

		// Step 5: Select optimal NDCs
		logger.debug('Selecting optimal NDCs', { targetQuantity: quantity.total, ndcCount: activeNdcs.length });
		const selections = selectOptimal(activeNdcs, quantity.total, 5);

		if (selections.length === 0) {
			return json<CalculationResponse>({
				success: false,
				error: {
					code: 'NO_NDCS_FOUND',
					message: 'No suitable NDCs found for the calculated quantity.',
				},
			});
		}

		// Step 6: Generate warnings and format response
		const recommendedNdc: NdcSelection = selections[0];
		const alternatives: NdcSelection[] = selections.slice(1);

		// Generate warnings for recommended NDC
		const recommendedNdcInfo = activeNdcs.find((n) => n.ndc === recommendedNdc.ndc);
		const warnings: Warning[] = recommendedNdcInfo
			? generateWarnings(recommendedNdc, quantity.total, parsedSig, recommendedNdcInfo)
			: [];

		// Build drug info - extract from first FDA package if available
		const firstPackage = fdaPackages[0];
		const drugInfo: DrugInfo = {
			name: body.drugInput.trim(),
			rxcui: rxcui,
			strength: firstPackage?.strength,
			dosageForm: firstPackage?.dosage_form,
		};

		// Format response
		const response: CalculationResponse = {
			success: true,
			data: {
				drug: drugInfo,
				quantity: quantity,
				recommendedNdc: {
					...recommendedNdc,
					packageDescription: recommendedNdc.packageDescription || recommendedNdcInfo?.packageDescription,
					manufacturer: recommendedNdc.manufacturer || recommendedNdcInfo?.manufacturer,
				},
				alternatives: alternatives.map((alt) => {
					const altInfo = activeNdcs.find((n) => n.ndc === alt.ndc);
					return {
						...alt,
						packageDescription: alt.packageDescription || altInfo?.packageDescription,
						manufacturer: alt.manufacturer || altInfo?.manufacturer,
					};
				}),
				warnings: warnings,
				inactiveNdcs:
					inactiveNdcs.length > 0
						? inactiveNdcs.map((ndc) => ({
								ndc: ndc.ndc,
								reason: 'NDC is inactive',
							}))
						: undefined,
			},
		};

		logger.info('Calculation completed successfully', {
			drug: body.drugInput,
			rxcui,
			quantity: quantity.total,
			selectionsCount: selections.length,
		});

		return json(response, { status: 200 });
	} catch (error) {
		logger.error('Calculate endpoint error', error as Error);

		// Check if it's a known error type
		if (error instanceof Error) {
			if (error.message.includes('timeout') || error.message.includes('TIMEOUT')) {
				return json<CalculationResponse>({
					success: false,
					error: {
						code: 'TIMEOUT_ERROR',
						message: 'The request took too long. Please try again.',
					},
				});
			}

			if (error.message.includes('rate limit') || error.message.includes('429')) {
				return json<CalculationResponse>({
					success: false,
					error: {
						code: 'RATE_LIMIT_ERROR',
						message: 'Too many requests. Please wait a moment before trying again.',
					},
				});
			}
		}

		return json<CalculationResponse>({
			success: false,
			error: {
				code: 'API_ERROR',
				message: 'An unexpected error occurred. Please try again.',
			},
		});
	}
};
