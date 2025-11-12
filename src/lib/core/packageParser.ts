/**
 * Package Description Parser
 * Parses FDA package descriptions to extract quantity information
 */

/**
 * Metadata for special dosage forms
 */
export interface PackageMetadata {
	dosageForm?: 'liquid' | 'insulin' | 'inhaler';
	insulinStrength?: number;  // U-100 = 100, U-200 = 200
	volume?: number;           // Volume in mL/L
	volumeUnit?: string;       // 'mL' or 'L'
	concentration?: string;    // e.g., "5mg/mL"
}

/**
 * Parsed package description
 */
export interface ParsedPackage {
	quantity: number;
	unit: string;
	packageCount?: number;
	totalQuantity: number;
	// Special dosage form metadata (optional for backward compatibility)
	metadata?: PackageMetadata;
}

const NUMBER_PATTERN = '(?:\\d+(?:\\.\\d+)?|\\.\\d+)';

/**
 * Parses package description to extract quantity information
 * @param description - Package description from FDA API
 * @returns Parsed package info or null if parsing fails
 * @example
 * parsePackageDescription('30 TABLET in 1 BOTTLE')
 * // Returns { quantity: 30, unit: 'TABLET', totalQuantity: 30 }
 * 
 * parsePackageDescription('3 x 30 TABLET in 1 PACKAGE')
 * // Returns { quantity: 30, unit: 'TABLET', packageCount: 3, totalQuantity: 90 }
 */
export function parsePackageDescription(description: string): ParsedPackage | null {
	if (!description || typeof description !== 'string') {
		return null;
	}

	const trimmed = description.trim();
	if (!trimmed) {
		return null;
	}

	// Handle multi-pack format: "1 BLISTER PACK in 1 CARTON ... / 21 TABLET in 1 BLISTER PACK"
	// Extract the part after the "/" which contains the actual quantity
	if (trimmed.includes(' / ')) {
		const parts = trimmed.split(' / ');
		if (parts.length >= 2) {
			// Parse the second part (after /) which has the actual quantity
			const innerPart = parts[1].trim();
			const innerResult = parseSimpleFormat(innerPart);
			if (innerResult) {
				// Try to extract package count from first part
				const outerPart = parts[0].trim();
				const packageCountMatch = outerPart.match(/(\d+)\s+(?:BLISTER PACK|CARTON|VIAL|BOTTLE)/i);
				if (packageCountMatch) {
					const packageCount = parseInt(packageCountMatch[1], 10);
					// Only add packageCount if it's > 1 (actual multi-pack)
					if (packageCount > 1) {
						return {
							quantity: innerResult.quantity,
							unit: innerResult.unit,
							packageCount,
							totalQuantity: innerResult.quantity * packageCount
						};
					}
				}
				return innerResult;
			}
		}
	}

	// Try special format parsers first (liquids, insulin, inhalers)
	const liquidResult = parseLiquidFormat(trimmed);
	if (liquidResult) {
		return liquidResult;
	}

	const insulinResult = parseInsulinFormat(trimmed);
	if (insulinResult) {
		return insulinResult;
	}

	const inhalerResult = parseInhalerFormat(trimmed);
	if (inhalerResult) {
		return inhalerResult;
	}

	// Handle simple formats
	return parseSimpleFormat(trimmed);
}

/**
 * Parses simple package description formats
 */
function parseSimpleFormat(description: string): ParsedPackage | null {
	// Remove NDC codes in parentheses at the end: "30 TABLET in 1 BOTTLE (76420-345-30)"
	const cleaned = description.replace(/\s*\([^)]+\)\s*$/, '').trim();

	// Check for multi-pack format FIRST: "3 x 30 TABLET"
	const multiPackMatch = cleaned.match(new RegExp(`(\\d+)\\s+x\\s+(${NUMBER_PATTERN})\\s+([A-Z]+(?:\\s+[A-Z]+)*?)`, 'i'));
	if (multiPackMatch) {
		const packageCount = parseInt(multiPackMatch[1], 10);
		const perPackageQuantity = parseFloat(multiPackMatch[2]);
		const unitRaw = multiPackMatch[3].trim();
		// Handle liquid units specially - return 'mL' instead of 'ML' for consistency
		const unitLower = unitRaw.toLowerCase();
		const unit = (unitLower === 'ml' || unitLower === 'milliliter' || unitLower === 'milliliters') 
			? 'mL' 
			: (unitLower === 'l' || unitLower === 'liter' || unitLower === 'liters')
			? 'L'
			: unitRaw.toUpperCase();
		return {
			quantity: perPackageQuantity,
			unit,
			packageCount,
			totalQuantity: perPackageQuantity * packageCount
		};
	}

	// Pattern 1: "X UNIT in 1 CONTAINER" or "X UNIT"
	// Examples: "30 TABLET in 1 BOTTLE", "100 TABLET", "87.1 g in 1 PACKAGE"
	const pattern1 = new RegExp(`^(${NUMBER_PATTERN})\\s+([A-Z]+(?:\\s+[A-Z]+)*?)(?:\\s+in\\s+\\d+\\s+[A-Z]+(?:\\s+[A-Z,]+)*)?$`, 'i');
	const match1 = cleaned.match(pattern1);
	if (match1) {
		const quantity = parseFloat(match1[1]);
		const unitRaw = match1[2].trim();
		// Handle liquid units specially - return 'mL' instead of 'ML' for consistency
		const unitLower = unitRaw.toLowerCase();
		const unit = (unitLower === 'ml' || unitLower === 'milliliter' || unitLower === 'milliliters') 
			? 'mL' 
			: (unitLower === 'l' || unitLower === 'liter' || unitLower === 'liters')
			? 'L'
			: unitRaw.toUpperCase();

		return {
			quantity,
			unit,
			totalQuantity: quantity
		};
	}

	// Pattern 2: Handle formats with extra descriptors like "30 TABLET, EXTENDED RELEASE in 1 BOTTLE"
	// Extract quantity and unit, ignoring descriptors
	const pattern2 = new RegExp(`^(${NUMBER_PATTERN})\\s+([A-Z]+)(?:\\s*,\\s*[A-Z\\s]+)?(?:\\s+in\\s+\\d+\\s+[A-Z]+(?:\\s+[A-Z,]+)*)?$`, 'i');
	const match2 = cleaned.match(pattern2);
	if (match2) {
		const quantity = parseFloat(match2[1]);
		const unitRaw = match2[2].trim();
		// Handle liquid units specially - return 'mL' instead of 'ML' for consistency
		const unitLower = unitRaw.toLowerCase();
		const unit = (unitLower === 'ml' || unitLower === 'milliliter' || unitLower === 'milliliters') 
			? 'mL' 
			: (unitLower === 'l' || unitLower === 'liter' || unitLower === 'liters')
			? 'L'
			: unitRaw.toUpperCase();
		return {
			quantity,
			unit,
			totalQuantity: quantity
		};
	}

	// Pattern 3: Handle "X UNIT, DESCRIPTOR in 1 CONTAINER"
	// More flexible pattern that handles commas and various descriptors
	const pattern3 = new RegExp(`^(${NUMBER_PATTERN})\\s+([A-Z]+)`, 'i');
	const match3 = cleaned.match(pattern3);
	if (match3) {
		const quantity = parseFloat(match3[1]);
		const unitRaw = match3[2].trim();
		// Handle liquid units specially - return 'mL' instead of 'ML' for consistency
		const unitLower = unitRaw.toLowerCase();
		const unit = (unitLower === 'ml' || unitLower === 'milliliter' || unitLower === 'milliliters') 
			? 'mL' 
			: (unitLower === 'l' || unitLower === 'liter' || unitLower === 'liters')
			? 'L'
			: unitRaw.toUpperCase();
		return {
			quantity,
			unit,
			totalQuantity: quantity
		};
	}

	return null;
}

/**
 * Parses liquid package formats
 * Examples: "5 mL in 1 VIAL", "100 mL in 1 BOTTLE", "10 mL in 1 VIAL, MULTI-DOSE"
 */
function parseLiquidFormat(description: string): ParsedPackage | null {
	// Pattern: "X mL/L in 1 CONTAINER"
	const pattern = new RegExp(`(${NUMBER_PATTERN})\\s*(ml|l|milliliters?|liters?)\\s+in\\s+\\d+\\s+(?:vial|bottle|container|package)`, 'i');
	const match = description.match(pattern);
	if (match) {
		const quantity = parseFloat(match[1]);
		const unitRaw = match[2].toLowerCase();
		const unit = unitRaw === 'l' || unitRaw.startsWith('liter') ? 'L' : 'mL'; // Use 'mL' (mixed case) for consistency with SIG parser
		
		return {
			quantity,
			unit,
			totalQuantity: quantity,
			metadata: {
				dosageForm: 'liquid',
				volume: quantity,
				volumeUnit: unit,
			},
		};
	}
	return null;
}

/**
 * Parses insulin package formats
 * Examples: "10 mL in 1 VIAL" (U-100 = 1000 units), "3 mL in 1 CARTRIDGE" (U-100 = 300 units)
 * Handles U-100, U-200, etc.
 */
function parseInsulinFormat(description: string): ParsedPackage | null {
	// Check for insulin strength (U-100, U-200, etc.)
	const insulinMatch = description.match(/\bu-?(\d+)\b/i);
	const strength = insulinMatch ? parseInt(insulinMatch[1], 10) : 100; // Default U-100

		// Pattern: "X mL in 1 VIAL/CARTRIDGE" or "U-100, X mL in 1 VIAL"
	// Match volume even if there's text before it (like "U-100,")
		const volumeMatch = description.match(new RegExp(`(${NUMBER_PATTERN})\\s*(ml|l|milliliters?|liters?)\\s+in\\s+\\d+\\s+(?:vial|cartridge)`, 'i'));
		if (volumeMatch) {
			const volume = parseFloat(volumeMatch[1]);
			const volumeUnit = volumeMatch[2].toLowerCase() === 'l' ? 'L' : 'mL';
		
		// Convert to units: volume (mL) × strength (units/mL)
		// If volume is in L, convert to mL first
		const volumeInMl = volumeUnit === 'L' ? volume * 1000 : volume;
		const totalUnits = volumeInMl * strength;

		return {
			quantity: totalUnits,
			unit: 'UNIT',
			totalQuantity: totalUnits,
			metadata: {
				dosageForm: 'insulin',
				insulinStrength: strength,
				volume: volumeInMl,
				volumeUnit: 'mL',
			},
		};
	}

	// Fallback: try to extract units directly
	const unitsMatch = description.match(/(\d+)\s+units?\s+in\s+\d+\s+(?:vial|cartridge)/i);
	if (unitsMatch) {
		return {
			quantity: parseInt(unitsMatch[1], 10),
			unit: 'UNIT',
			totalQuantity: parseInt(unitsMatch[1], 10),
			metadata: {
				dosageForm: 'insulin',
				insulinStrength: strength,
			},
		};
	}

	return null;
}

/**
 * Parses inhaler package formats
 * Examples: "72 SPRAY, METERED in 1 BOTTLE, SPRAY", "200 ACTUATION in 1 CANISTER"
 */
function parseInhalerFormat(description: string): ParsedPackage | null {
	// Patterns for inhalers
	const patterns = [
		/(\d+)\s+(?:spray|actuation|puff)(?:\s*,\s*metered)?\s+in\s+\d+\s+(?:bottle|canister|inhaler|device)/i,
		/(\d+)\s+(?:actuations?|puffs?|sprays?)\s+per\s+(?:canister|inhaler|device)/i,
	];

	for (const pattern of patterns) {
		const match = description.match(pattern);
		if (match) {
			return {
				quantity: parseInt(match[1], 10),
				unit: 'ACTUATION',
				totalQuantity: parseInt(match[1], 10),
				metadata: {
					dosageForm: 'inhaler',
				},
			};
		}
	}

	return null;
}

