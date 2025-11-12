/**
 * Unit conversion utilities for special dosage forms
 */

/**
 * Result of a unit conversion operation
 */
export interface ConversionResult {
	converted: number;
	unit: string;
	original: number;
	originalUnit: string;
}

/**
 * Result of unit matching check
 */
export interface UnitMatchResult {
	canMatch: boolean;
	conversionNeeded: boolean;
}

/**
 * Converts liquid volumes (mL ↔ L)
 * @param value - Volume value to convert
 * @param fromUnit - Source unit ('mL', 'L', 'milliliter', 'liter')
 * @param toUnit - Target unit ('mL', 'L', 'milliliter', 'liter')
 * @returns Conversion result or null if conversion not possible
 * @example
 * convertLiquidVolume(1000, 'mL', 'L') // Returns { converted: 1, unit: 'L', original: 1000, originalUnit: 'mL' }
 * convertLiquidVolume(1, 'L', 'mL') // Returns { converted: 1000, unit: 'mL', original: 1, originalUnit: 'L' }
 */
export function convertLiquidVolume(
	value: number,
	fromUnit: string,
	toUnit: string
): ConversionResult | null {
	if (typeof value !== 'number' || isNaN(value) || value < 0) {
		return null;
	}

	const normalizedFrom = fromUnit.toLowerCase().trim();
	const normalizedTo = toUnit.toLowerCase().trim();

	// Same unit - no conversion needed
	if (normalizedFrom === normalizedTo) {
		return {
			converted: value,
			unit: toUnit,
			original: value,
			originalUnit: fromUnit,
		};
	}

	// Normalize unit names
	const isFromMl = normalizedFrom === 'ml' || normalizedFrom === 'milliliter' || normalizedFrom === 'milliliters';
	const isFromL = normalizedFrom === 'l' || normalizedFrom === 'liter' || normalizedFrom === 'liters';
	const isToMl = normalizedTo === 'ml' || normalizedTo === 'milliliter' || normalizedTo === 'milliliters';
	const isToL = normalizedTo === 'l' || normalizedTo === 'liter' || normalizedTo === 'liters';

	// mL to L
	if (isFromMl && isToL) {
		const converted = value / 1000;
		// Round to 2 decimal places for precision
		const rounded = Math.round(converted * 100) / 100;
		return {
			converted: rounded,
			unit: 'L',
			original: value,
			originalUnit: fromUnit,
		};
	}

	// L to mL
	if (isFromL && isToMl) {
		const converted = value * 1000;
		// Round to 2 decimal places for precision
		const rounded = Math.round(converted * 100) / 100;
		return {
			converted: rounded,
			unit: 'mL',
			original: value,
			originalUnit: fromUnit,
		};
	}

	// Conversion not possible
	return null;
}

/**
 * Converts insulin units to volume (mL)
 * Assumes U-100 (100 units/mL) unless strength specified
 * @param units - Number of insulin units
 * @param strength - Insulin strength (U-100 = 100, U-200 = 200). Defaults to 100
 * @returns Conversion result with volume in mL
 * @example
 * convertInsulinUnitsToVolume(100, 100) // Returns { converted: 1, unit: 'mL', original: 100, originalUnit: 'unit' }
 * convertInsulinUnitsToVolume(300, 100) // Returns { converted: 3, unit: 'mL', original: 300, originalUnit: 'unit' }
 */
export function convertInsulinUnitsToVolume(
	units: number,
	strength: number = 100 // U-100 default
): ConversionResult {
	if (typeof units !== 'number' || isNaN(units) || units < 0) {
		throw new Error('Invalid units value');
	}
	if (typeof strength !== 'number' || isNaN(strength) || strength <= 0) {
		throw new Error('Invalid insulin strength');
	}

	const volume = units / strength;
	// Round to 2 decimal places for precision
	const rounded = Math.round(volume * 100) / 100;

	return {
		converted: rounded,
		unit: 'mL',
		original: units,
		originalUnit: 'unit',
	};
}

/**
 * Normalizes units for matching (e.g., "mL" and "L" can match if converted)
 * @param unit - Source unit to check
 * @param targetUnit - Target unit to match against
 * @returns Match result indicating if units can match and if conversion is needed
 * @example
 * normalizeUnitForMatching('mL', 'L') // Returns { canMatch: true, conversionNeeded: true }
 * normalizeUnitForMatching('tablet', 'capsule') // Returns { canMatch: false, conversionNeeded: false }
 * normalizeUnitForMatching('tablet', 'tablet') // Returns { canMatch: true, conversionNeeded: false }
 */
export function normalizeUnitForMatching(unit: string, targetUnit: string): UnitMatchResult {
	if (!unit || !targetUnit) {
		return { canMatch: false, conversionNeeded: false };
	}

	const normalized = unit.toLowerCase().trim();
	const normalizedTarget = targetUnit.toLowerCase().trim();

	// Exact match
	if (normalized === normalizedTarget) {
		return { canMatch: true, conversionNeeded: false };
	}

	// Liquid units can match with conversion
	const liquidUnits = ['ml', 'milliliter', 'milliliters', 'l', 'liter', 'liters'];
	if (liquidUnits.includes(normalized) && liquidUnits.includes(normalizedTarget)) {
		return { canMatch: true, conversionNeeded: true };
	}

	// Same category - can match without conversion
	const categories = {
		solid: ['tablet', 'capsule', 'pill'],
		liquid: ['ml', 'milliliter', 'milliliters', 'l', 'liter', 'liters'],
		unit: ['unit', 'u', 'iu', 'units'],
		actuation: ['actuation', 'puff', 'puffs', 'spray', 'sprays'],
	};

	for (const [category, units] of Object.entries(categories)) {
		if (units.includes(normalized) && units.includes(normalizedTarget)) {
			return { canMatch: true, conversionNeeded: false };
		}
	}

	// Different categories - cannot match
	return { canMatch: false, conversionNeeded: false };
}

