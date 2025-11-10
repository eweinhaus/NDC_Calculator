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
	try {
		const body: CalculationRequest = await request.json();

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
		logger.debug('Starting drug normalization', { drugInput: body.drugInput });
		const rxcui = await searchByDrugName(body.drugInput.trim());

		if (!rxcui) {
			// Try to get spelling suggestions
			const suggestions = await getSpellingSuggestions(body.drugInput.trim());
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
		logger.debug('Fetching NDCs from FDA API', { rxcui });
		const fdaPackages = await getPackagesByRxcui(rxcui);

		if (!fdaPackages || fdaPackages.length === 0) {
			return json<CalculationResponse>({
				success: false,
				error: {
					code: 'NO_NDCS_FOUND',
					message: 'No active NDCs found for this drug. The drug may be discontinued or unavailable.',
				},
			});
		}

		// Convert FDA package details to NdcInfo format
		const ndcList: NdcInfo[] = fdaPackages
			.map((pkg): NdcInfo | null => {
				// Parse package description to get package size
				const parsed = parsePackageDescription(pkg.package_description);
				if (!parsed) {
					logger.warn(`Could not parse package description: ${pkg.package_description}`);
					return null;
				}

				return {
					ndc: pkg.package_ndc,
					packageSize: parsed.quantity,
					packageDescription: pkg.package_description,
					manufacturer: pkg.manufacturer_name,
					dosageForm: pkg.dosage_form,
					active: pkg.active,
				};
			})
			.filter((ndc): ndc is NdcInfo => ndc !== null);

		if (ndcList.length === 0) {
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

		if (activeNdcs.length === 0) {
			return json<CalculationResponse>({
				success: false,
				error: {
					code: 'NO_NDCS_FOUND',
					message: 'No active NDCs found for this drug.',
					details: {
						inactiveNdcs: inactiveNdcs.map((ndc) => ({
							ndc: ndc.ndc,
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
