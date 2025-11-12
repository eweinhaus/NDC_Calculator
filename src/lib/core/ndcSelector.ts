/**
 * NDC selector with ranking algorithm.
 * Selects optimal NDCs based on calculated quantity.
 */

import { NdcInfo, NdcSelection } from '../types/ndc';
import { parsePackageDescription, ParsedPackage } from './packageParser';
import { logger } from '../utils/logger';
import { normalizeUnitForMatching, convertLiquidVolume } from '../utils/unitConverter';

/**
 * Parses package size from NDC info using package parser.
 * Returns both the quantity and the parsed package info.
 */
function parsePackageSize(ndcInfo: NdcInfo): { quantity: number; parsed: ParsedPackage } | null {
	// Otherwise, try to parse from packageDescription
	if (!ndcInfo.packageDescription) {
		// Use packageSize if available (may already be parsed)
		if (ndcInfo.packageSize && ndcInfo.packageSize > 0) {
			return {
				quantity: ndcInfo.packageSize,
				parsed: {
					quantity: ndcInfo.packageSize,
					unit: 'UNKNOWN',
					totalQuantity: ndcInfo.packageSize,
				},
			};
		}
		return null;
	}

	const parsed = parsePackageDescription(ndcInfo.packageDescription);
	if (!parsed) {
		// Fallback to packageSize if parsing fails
		if (ndcInfo.packageSize && ndcInfo.packageSize > 0) {
			return {
				quantity: ndcInfo.packageSize,
				parsed: {
					quantity: ndcInfo.packageSize,
					unit: 'UNKNOWN',
					totalQuantity: ndcInfo.packageSize,
				},
			};
		}
		return null;
	}

	// Return quantity per package (not totalQuantity for multi-packs)
	return {
		quantity: parsed.quantity,
		parsed,
	};
}

/**
 * Calculates match score for NDC selection (0-100).
 * Now unit-aware: checks unit compatibility and converts if needed.
 */
function calculateMatchScore(
	selection: NdcSelection,
	targetQuantity: number,
	targetUnit: string,
	parsedPackage?: ParsedPackage
): number {
	let { totalQuantity } = selection;
	const { packageCount } = selection;

	// Check unit compatibility
	if (parsedPackage) {
		const unitMatch = normalizeUnitForMatching(parsedPackage.unit, targetUnit);
		
		// If units can't match, return 0 (filter out)
		if (!unitMatch.canMatch) {
			return 0;
		}

		// If conversion needed, convert the quantity
		if (unitMatch.conversionNeeded) {
			const conversion = convertLiquidVolume(
				totalQuantity,
				parsedPackage.unit,
				targetUnit
			);
			if (conversion) {
				totalQuantity = conversion.converted;
			} else {
				// Conversion failed, can't match
				return 0;
			}
		}
	}

	// Exact match
	if (totalQuantity === targetQuantity) {
		// Single-pack exact match: 100
		// Multi-pack exact match: 95
		return packageCount && packageCount > 1 ? 95 : 100;
	}

	// Calculate difference percentage
	const diff = Math.abs(totalQuantity - targetQuantity);
	const diffPercent = diff / targetQuantity;

	// Near match (within 5%)
	if (diffPercent <= 0.05) {
		// Score: 90-99 (proportional to closeness)
		const closeness = 1 - diffPercent / 0.05;
		const baseScore = packageCount && packageCount > 1 ? 85 : 90;
		return baseScore + Math.round(closeness * 9);
	}

	// Overfill (package > target)
	if (totalQuantity > targetQuantity) {
		const overfillPercent = (totalQuantity - targetQuantity) / targetQuantity;
		// Score: 80-89 (penalized by overfill %)
		// More overfill = lower score
		const penalty = Math.min(overfillPercent, 1) * 10;
		return Math.max(80 - Math.round(penalty), 70);
	}

	// Underfill (package < target)
	const underfillPercent = (targetQuantity - totalQuantity) / targetQuantity;
	// Score: 70-79 (penalized by underfill %)
	// More underfill = lower score
	const penalty = Math.min(underfillPercent, 1) * 10;
	return Math.max(70 - Math.round(penalty), 60);
}

/**
 * Generates single-pack selection for an NDC.
 */
function generateSinglePackSelection(
	ndcInfo: NdcInfo,
	targetQuantity: number,
	targetUnit: string
): NdcSelection | null {
	const packageInfo = parsePackageSize(ndcInfo);
	if (!packageInfo || packageInfo.quantity <= 0) {
		return null;
	}

	const { quantity: packageSize, parsed } = packageInfo;

	// Check unit compatibility before creating selection
	const unitMatch = normalizeUnitForMatching(parsed.unit, targetUnit);
	if (!unitMatch.canMatch) {
		return null; // Filter out incompatible units
	}

	const packageCount = 1;
	const totalQuantity = packageSize;
	const overfill = Math.max(0, totalQuantity - targetQuantity);
	const underfill = Math.max(0, targetQuantity - totalQuantity);

	const selection: NdcSelection = {
		ndc: ndcInfo.ndc,
		packageSize,
		packageCount,
		totalQuantity,
		overfill,
		underfill,
		matchScore: 0, // Will be calculated
		packageDescription: ndcInfo.packageDescription,
		manufacturer: ndcInfo.manufacturer,
	};

	// Calculate match score with unit awareness
	selection.matchScore = calculateMatchScore(selection, targetQuantity, targetUnit, parsed);

	return selection;
}

/**
 * Generates multi-pack selection for an NDC.
 */
function generateMultiPackSelection(
	ndcInfo: NdcInfo,
	targetQuantity: number,
	targetUnit: string,
	maxPackages: number = 10
): NdcSelection | null {
	const packageInfo = parsePackageSize(ndcInfo);
	if (!packageInfo || packageInfo.quantity <= 0) {
		return null;
	}

	const { quantity: packageSize, parsed } = packageInfo;

	// Check unit compatibility before creating selection
	const unitMatch = normalizeUnitForMatching(parsed.unit, targetUnit);
	if (!unitMatch.canMatch) {
		return null; // Filter out incompatible units
	}

	// Convert target quantity if needed for calculation
	let adjustedTargetQuantity = targetQuantity;
	if (unitMatch.conversionNeeded) {
		const conversion = convertLiquidVolume(targetQuantity, targetUnit, parsed.unit);
		if (conversion) {
			adjustedTargetQuantity = conversion.converted;
		} else {
			return null; // Conversion failed
		}
	}

	const packageCount = Math.ceil(adjustedTargetQuantity / packageSize);
	
	// Skip if too many packages needed
	if (packageCount > maxPackages) {
		return null;
	}

	const totalQuantity = packageCount * packageSize;
	const overfill = totalQuantity - adjustedTargetQuantity; // Always >= 0 for multi-pack
	const underfill = 0; // Multi-pack always meets or exceeds target

	const selection: NdcSelection = {
		ndc: ndcInfo.ndc,
		packageSize,
		packageCount,
		totalQuantity,
		overfill,
		underfill,
		matchScore: 0, // Will be calculated
		packageDescription: ndcInfo.packageDescription,
		manufacturer: ndcInfo.manufacturer,
	};

	// Calculate match score with unit awareness (use original targetQuantity for scoring)
	selection.matchScore = calculateMatchScore(selection, targetQuantity, targetUnit, parsed);

	return selection;
}

/**
 * Selects optimal NDCs based on target quantity.
 * @param ndcList - List of NDC information
 * @param targetQuantity - Target quantity to match
 * @param targetUnit - Target unit (e.g., 'tablet', 'mL', 'unit', 'actuation')
 * @param maxResults - Maximum number of results to return (default: 5)
 * @param preferredNdc - Optional NDC to prioritize (e.g., user-provided input NDC)
 * @returns Array of NDC selections ranked by match score
 */
export function selectOptimal(
	ndcList: NdcInfo[],
	targetQuantity: number,
	targetUnit: string,
	maxResults: number = 5,
	preferredNdc?: string
): NdcSelection[] {
	if (!ndcList || ndcList.length === 0) {
		return [];
	}

	if (targetQuantity <= 0) {
		logger.warn('Invalid target quantity for NDC selection', { targetQuantity });
		return [];
	}

	const candidates: NdcSelection[] = [];
	const inactiveNdcs: NdcInfo[] = [];

	// Process each NDC
	for (const ndcInfo of ndcList) {
		// Filter out inactive NDCs (store for warnings)
		if (!ndcInfo.active) {
			inactiveNdcs.push(ndcInfo);
			continue;
		}

		// Generate single-pack selection
		const singlePack = generateSinglePackSelection(ndcInfo, targetQuantity, targetUnit);
		if (singlePack) {
			candidates.push(singlePack);
		}

		// Generate multi-pack selection
		const multiPack = generateMultiPackSelection(ndcInfo, targetQuantity, targetUnit);
		if (multiPack) {
			candidates.push(multiPack);
		}
	}

	// Log inactive NDCs for warnings
	if (inactiveNdcs.length > 0) {
		logger.debug(`Filtered ${inactiveNdcs.length} inactive NDCs`, {
			inactiveNdcs: inactiveNdcs.map((n) => n.ndc),
		});
	}

	// If a preferred NDC is specified, boost its score significantly
	// This ensures user-specified NDCs are strongly prioritized
	if (preferredNdc) {
		// Normalize preferred NDC: remove spaces and dashes for comparison
		const normalizedPreferred = preferredNdc.trim().replace(/\s/g, '').replace(/-/g, '');
		for (const candidate of candidates) {
			// Normalize candidate NDC: remove spaces and dashes for comparison
			const normalizedCandidate = candidate.ndc.trim().replace(/\s/g, '').replace(/-/g, '');
			// Check if this candidate matches the preferred NDC (handles all format variations)
			if (normalizedCandidate === normalizedPreferred) {
				const originalScore = candidate.matchScore;
				// Boost by 20 points to ensure it's preferred over other similar options
				// Remove score cap to allow scores > 100 for preferred NDCs
				candidate.matchScore = candidate.matchScore + 20;
				logger.debug(`Boosted score for preferred NDC: ${candidate.ndc}`, {
					originalScore,
					boostedScore: candidate.matchScore,
					preferredNdc,
					boost: 20
				});
				// Don't break - boost ALL candidates from preferred NDC (single-pack and multi-pack)
			}
		}
	}

	// Rank by match score (descending), with stable sort for preferred NDCs
	// When scores are equal, preferred NDCs (score > 100) will naturally rank first
	candidates.sort((a, b) => {
		const scoreDiff = b.matchScore - a.matchScore;
		// If scores are equal, maintain relative order (stable sort)
		return scoreDiff !== 0 ? scoreDiff : 0;
	});

	// Return top results
	const results = candidates.slice(0, maxResults);

	logger.debug(`Selected ${results.length} optimal NDCs from ${candidates.length} candidates`, {
		targetQuantity,
		topScore: results[0]?.matchScore,
	});

	return results;
}

