import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { CalculationResponse, CalculationRequest, ApiError } from '$lib/types/api.js';
import { parse as parseSig } from '$lib/core/sigParser';
import { calculate as calculateQuantity } from '$lib/core/quantityCalculator';
import { selectOptimal } from '$lib/core/ndcSelector';
import { generateWarnings } from '$lib/core/warningGenerator';
import { searchByDrugName, getSpellingSuggestions, getRxcuiByNdc } from '$lib/services/rxnorm';
import { getPackagesByRxcui, getPackageDetails, getAllPackages, type FdaPackageDetails } from '$lib/services/fda';
import { parsePackageDescription } from '$lib/core/packageParser';
import { logger } from '$lib/utils/logger';
import { detectInputType } from '$lib/utils/inputDetector.js';
import type { DrugInfo } from '$lib/types/drug.js';
import type { NdcInfo } from '$lib/types/ndc.js';
import type { NdcSelection } from '$lib/types/ndc.js';
import type { Warning } from '$lib/types/warning.js';

/**
 * POST /api/calculate
 * Complete calculation flow: drug lookup → NDC retrieval → SIG parsing → calculation → NDC selection
 */
export const POST: RequestHandler = async ({ request }) => {
	// Force output to stderr (unbuffered) - these logs appear in server terminal
	process.stderr.write('🚀 [CALCULATE] POST request received at /api/calculate\n');
	process.stderr.write('═══════════════════════════════════════════════════════════\n');
	console.error('🚀 [CALCULATE] POST request received at /api/calculate');
	console.error('═══════════════════════════════════════════════════════════');
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

		// Step 1: Detect input type and normalize to RxCUI
		const trimmedInput = body.drugInput.trim();
		const inputType = detectInputType(trimmedInput);
		
		console.log('🔍 [CALCULATE] Input type detection', { 
			drugInput: trimmedInput,
			inputType 
		});
		logger.debug('Input type detection', { drugInput: trimmedInput, inputType });

		let rxcui: string | null = null;
		let drugName: string | null = null;
		let packageDetails: FdaPackageDetails | null = null; // Declare outside if block for later use
		let isProductNdc = false;
		let isPackageNdc = false;

		if (inputType === 'ndc') {
			// NOTE: The drug-name workflow begins by normalizing against RxNorm to obtain an RxCUI.
			// Historically the NDC workflow bypassed that step and relied solely on FDA package metadata.
			// To keep behaviour aligned (and improve resilience), we now fall back to an explicit
			// RxNorm NDC→RxCUI lookup whenever the FDA path cannot provide the identifier.
			// Input is an NDC code - detect if it's a product NDC (XXXXX-XXXX) or package NDC (XXXXX-XXXX-XX)
			const ndcParts = trimmedInput.split('-');
			isProductNdc = ndcParts.length === 2; // Product NDC: XXXXX-XXXX
			isPackageNdc = ndcParts.length === 3; // Package NDC: XXXXX-XXXX-XX
			
			console.error('🔍 [CALCULATE] Detected NDC code', { 
				ndc: trimmedInput,
				inputType,
				isProductNdc,
				isPackageNdc,
				parts: ndcParts.length
			});
			logger.debug('Detected NDC code', { ndc: trimmedInput, isProductNdc, isPackageNdc });
			
			if (isProductNdc) {
				// Product NDC: Get all packages for this product
				console.error('📦 [CALCULATE] Product NDC detected, fetching all packages', { productNdc: trimmedInput });
				logger.info('Product NDC detected, fetching all packages', { productNdc: trimmedInput });
				try {
					const allPackages = await getAllPackages(trimmedInput);
					if (allPackages && allPackages.length > 0) {
						// Use first package to get metadata
						packageDetails = allPackages[0];
						console.error('✅ [CALCULATE] Got packages for product NDC', {
							productNdc: trimmedInput,
							packageCount: allPackages.length,
							firstPackageNdc: packageDetails.package_ndc
						});
					}
				} catch (error) {
					console.error('❌ [CALCULATE] Error fetching packages for product NDC:', {
						productNdc: trimmedInput,
						error: error instanceof Error ? error.message : String(error)
					});
					logger.error('Error fetching packages for product NDC', error as Error, { productNdc: trimmedInput });
				}
			} else if (isPackageNdc) {
				// Package NDC: Get specific package details
				console.error('📦 [CALCULATE] Package NDC detected, fetching package details', { packageNdc: trimmedInput });
				logger.debug('Package NDC detected, fetching package details', { packageNdc: trimmedInput });
				try {
					console.error('📞 [CALCULATE] Calling getPackageDetails() for NDC:', trimmedInput);
					packageDetails = await getPackageDetails(trimmedInput);
					console.error('📥 [CALCULATE] getPackageDetails() returned:', {
						found: !!packageDetails,
						packageNdc: packageDetails?.package_ndc,
						productNdc: packageDetails?.product_ndc,
						hasRxcui: packageDetails?.rxcui?.length ? true : false,
						rxcui: packageDetails?.rxcui
					});
				} catch (error) {
					console.error('❌ [CALCULATE] Error fetching package details for NDC:', {
						ndc: trimmedInput,
						error: error instanceof Error ? error.message : String(error),
						stack: error instanceof Error ? error.stack : undefined
					});
					logger.error('Error fetching package details for NDC', error as Error, { ndc: trimmedInput });
				}
			} else {
				console.error('⚠️ [CALCULATE] Invalid NDC format', { ndc: trimmedInput, parts: ndcParts.length });
				logger.warn('Invalid NDC format', { ndc: trimmedInput, parts: ndcParts.length });
			}

			if (packageDetails) {
				logger.info(
					'FDA package lookup succeeded for NDC',
					undefined,
					{
						ndc: trimmedInput,
						productNdc: packageDetails.product_ndc,
						hasRxcui: packageDetails.rxcui?.length ? true : false
					}
				);
			} else {
				logger.warn('FDA package lookup returned no result for NDC', undefined, { ndc: trimmedInput });
			}

			// For NDC inputs, prioritize RxNorm NDC→RxCUI lookup (more specific)
			// FDA's RxCUI array may contain multiple RxCUIs for different strengths/formulations
			console.log('🔍 [CALCULATE] Attempting RxNorm NDC→RxCUI lookup first', { ndc: trimmedInput });
			logger.info('Attempting RxNorm NDC→RxCUI lookup', undefined, { ndc: trimmedInput });
			rxcui = await getRxcuiByNdc(trimmedInput);
			
			if (rxcui) {
				console.log('✅ [CALCULATE] RxNorm returned RxCUI for NDC', {
					ndc: trimmedInput,
					rxcui
				});
				drugName = packageDetails?.generic_name || trimmedInput;
			} else {
				console.warn('⚠️ [CALCULATE] RxNorm NDC lookup failed, trying FDA RxCUI array', {
					ndc: trimmedInput,
					hasFdaRxcui: !!packageDetails?.rxcui?.length
				});
				
				// Fallback to FDA's RxCUI array (may be less specific)
				if (packageDetails?.rxcui && packageDetails.rxcui.length > 0) {
					rxcui = packageDetails.rxcui[0];
					drugName = trimmedInput;
					console.log('✅ [CALCULATE] Using FDA RxCUI from package details', {
						ndc: trimmedInput,
						rxcui,
						packageNdc: packageDetails.package_ndc,
						totalRxcuis: packageDetails.rxcui.length
					});
					logger.info('Using FDA RxCUI from package details', undefined, {
						ndc: trimmedInput,
						rxcui,
						totalRxcuis: packageDetails.rxcui.length
					});
				} else if (packageDetails?.generic_name) {
					// If FDA doesn't have RxCUI, try looking up by generic name
					console.error('⚠️ [CALCULATE] No RxCUI in FDA package, trying generic name lookup', {
						genericName: packageDetails.generic_name
					});
					logger.info('Fallback: RxNorm drug name lookup using FDA generic name', undefined, {
						genericName: packageDetails.generic_name
					});
					rxcui = await searchByDrugName(packageDetails.generic_name);
					if (rxcui) {
						console.log('✅ [CALCULATE] Found RxCUI via generic name lookup', {
							genericName: packageDetails.generic_name,
							rxcui
						});
						drugName = packageDetails.generic_name;
					}
				}
			}

			if (!rxcui) {
				// If we have package details but no RxCUI, we can still proceed using the product NDC
				if (packageDetails && packageDetails.product_ndc) {
					console.error('⚠️ [CALCULATE] No RxCUI found, but we have package details. Will use product NDC to fetch all packages', {
						ndc: trimmedInput,
						productNdc: packageDetails.product_ndc
					});
					logger.info('No RxCUI found, but proceeding with product NDC', undefined, {
						ndc: trimmedInput,
						productNdc: packageDetails.product_ndc
					});
					// Set a flag to use product NDC instead of RxCUI
					// We'll handle this in the next step
				} else {
					console.error('❌ [CALCULATE] Unable to resolve RxCUI for NDC after FDA and RxNorm fallback, and no package details', {
						ndc: trimmedInput
					});
					logger.warn('NDC not linked to any RxCUI and no package details', undefined, { ndc: trimmedInput });
					return json<CalculationResponse>({
						success: false,
						error: {
							code: 'DRUG_NOT_FOUND',
							message:
								'NDC code not found in FDA or RxNorm data sources. Please verify the code or try a different NDC.'
						}
					});
				}
			}
		} else {
			// Input is a drug name - lookup RxCUI
			console.log('🔍 [CALCULATE] Detected drug name, starting drug normalization', { drugInput: trimmedInput });
			logger.debug('Starting drug normalization', { drugInput: trimmedInput });
			rxcui = await searchByDrugName(trimmedInput);
			drugName = trimmedInput;

			console.log('🔍 [CALCULATE] RxCUI lookup result', { 
				drugInput: trimmedInput,
				rxcui: rxcui || 'NOT FOUND',
			});

			if (!rxcui) {
				console.warn('⚠️ [CALCULATE] Drug not found, getting spelling suggestions');
				// Try to get spelling suggestions
				const suggestions = await getSpellingSuggestions(trimmedInput);
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
		}

		// Step 2: Get NDCs from FDA API
		// If we have an RxCUI, use it. Otherwise, if we have package details with product NDC, use that.
		let fdaPackages: FdaPackageDetails[] = [];
		
		if (rxcui) {
			console.log('🔍 [CALCULATE] Fetching NDCs from FDA API by RxCUI', { 
				rxcui, 
				drugInput: body.drugInput.trim() 
			});
			logger.info('Fetching NDCs from FDA API by RxCUI', { 
				rxcui, 
				drugInput: body.drugInput.trim() 
			});
			fdaPackages = await getPackagesByRxcui(rxcui);
		} else if (inputType === 'ndc') {
			// No RxCUI, but we have an NDC input - determine product NDC
			const productNdc = isProductNdc ? trimmedInput : (packageDetails?.product_ndc || null);
			
			if (productNdc) {
				// Fetch all packages for this product NDC
				console.error('🔍 [CALCULATE] Fetching NDCs from FDA API by product NDC (no RxCUI available)', {
					productNdc,
					drugInput: body.drugInput.trim(),
					wasProductNdc: isProductNdc
				});
				logger.info('Fetching NDCs from FDA API by product NDC', {
					productNdc,
					drugInput: body.drugInput.trim()
				});
				fdaPackages = await getAllPackages(productNdc);
				
				// If we got packages, we can extract drug name from the first package
				if (fdaPackages.length > 0 && !drugName) {
					// Try to get drug name from package metadata or use NDC as fallback
					drugName = trimmedInput;
				}
			} else if (isPackageNdc && packageDetails) {
				// We have a package NDC but no product NDC - use the single package we found
				fdaPackages = [packageDetails];
			}
		}

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
					message: inputType === 'drug' 
						? `"${body.drugInput.trim()}" is recognized but has no NDCs available in the FDA database. This drug may be very new, discontinued, or not available in the US market.`
						: 'No active NDCs found for this drug. The drug may be discontinued or unavailable.',
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
		// If input was an NDC, prioritize that NDC in the selection
		const preferredNdc = inputType === 'ndc' ? trimmedInput : undefined;
		logger.debug('Selecting optimal NDCs', { 
			targetQuantity: quantity.total, 
			ndcCount: activeNdcs.length,
			preferredNdc 
		});
		const selections = selectOptimal(activeNdcs, quantity.total, quantity.unit, 5, preferredNdc);

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

		// Build drug info - get drug name from RxNorm if we have RxCUI
		// If input was NDC, we need to get the drug name from RxNorm or FDA package
		let finalDrugName = drugName;
		if (inputType === 'ndc' && rxcui) {
			// Try to get drug name from RxNorm using RxCUI
			try {
				const rxnormResponse = await fetch(
					`https://rxnav.nlm.nih.gov/REST/rxcui/${rxcui}/properties.json`
				);
				if (rxnormResponse.ok) {
					const rxnormData = await rxnormResponse.json();
					if (rxnormData.properties?.name) {
						finalDrugName = rxnormData.properties.name;
						console.log('✅ [CALCULATE] Got drug name from RxNorm', { 
							rxcui, 
							drugName: finalDrugName 
						});
					}
				}
			} catch (error) {
				logger.debug('Could not get drug name from RxNorm, using NDC as fallback', { rxcui, error });
			}
		} else if (inputType === 'ndc' && !rxcui && packageDetails) {
			// No RxCUI, but we have package details - try to extract drug name from FDA data
			// The package details might have generic_name or brand_name in the original FDA response
			// For now, use the NDC as the name, but we could enhance this later
			finalDrugName = packageDetails.package_ndc || body.drugInput.trim();
			console.error('⚠️ [CALCULATE] No RxCUI, using NDC as drug name', {
				finalDrugName
			});
		}

		const firstPackage = fdaPackages[0] || packageDetails;
		const drugInfo: DrugInfo = {
			name: finalDrugName || body.drugInput.trim(),
			rxcui: rxcui || undefined, // Allow undefined RxCUI
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
