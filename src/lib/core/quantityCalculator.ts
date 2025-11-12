/**
 * Quantity calculator for prescription medications.
 * Calculates total quantity from parsed SIG and days' supply.
 */

import { ParsedSig, QuantityResult } from '../types/sig';
import { logger } from '../utils/logger';

/**
 * Rounds quantity based on unit type
 */
function roundQuantity(quantity: number, unit: string): number {
	const normalizedUnit = unit.toLowerCase();

	// Tablets, capsules, pills, units, actuations → round to nearest integer
	if (['tablet', 'capsule', 'pill', 'unit', 'actuation'].includes(normalizedUnit)) {
		return Math.round(quantity);
	}

	// Liquids (mL, L) → round to 2 decimal places
	if (normalizedUnit === 'ml' || normalizedUnit === 'l') {
		return Math.round(quantity * 100) / 100;
	}

	// Default: round to nearest integer
	return Math.round(quantity);
}

/**
 * Calculates total quantity from parsed SIG and days' supply.
 * @param parsedSig - Parsed prescription instruction
 * @param daysSupply - Days' supply
 * @returns Quantity result with total, unit, and calculation details
 * @throws Error if inputs are invalid
 */
export function calculate(parsedSig: ParsedSig, daysSupply: number): QuantityResult {
	// Validate inputs
	if (!parsedSig) {
		throw new Error('parsedSig is required');
	}
	if (typeof daysSupply !== 'number' || daysSupply <= 0) {
		throw new Error('daysSupply must be a positive number');
	}
	if (typeof parsedSig.dosage !== 'number' || parsedSig.dosage <= 0) {
		throw new Error('parsedSig.dosage must be a positive number');
	}
	if (typeof parsedSig.frequency !== 'number' || parsedSig.frequency < 0) {
		throw new Error('parsedSig.frequency must be a non-negative number');
	}

	// Handle special dosage forms
	let total: number;
	let unit = parsedSig.unit;

	// Handle liquids with concentration
	if (parsedSig.dosageForm === 'liquid' && parsedSig.concentration) {
		// Calculate volume needed from concentration
		// Example: "Take 5mg twice daily" with "5mg/mL" → need 2mL per day
		const { amount, volume, volumeUnit } = parsedSig.concentration;
		if (amount > 0 && volume > 0) {
			// Calculate volume per dose: dosage (mg) / concentration (mg/mL) = mL per dose
			const volumePerDose = (parsedSig.dosage / amount) * volume;
			const dailyVolume = volumePerDose * (parsedSig.frequency || 1);
			total = dailyVolume * daysSupply;
			unit = volumeUnit; // Use volume unit from concentration
			logger.debug('Liquid quantity calculated with concentration', {
				dosage: parsedSig.dosage,
				concentration: `${amount}mg/${volume}${volumeUnit}`,
				volumePerDose,
				dailyVolume,
				total,
			});
		} else {
			// Fallback to normal calculation if concentration invalid
			total = parsedSig.frequency === 0
				? parsedSig.dosage * daysSupply
				: (parsedSig.dosage * parsedSig.frequency) * daysSupply;
		}
	}
	// Handle inhalers with capacity
	else if (parsedSig.dosageForm === 'inhaler' && parsedSig.capacity) {
		// Calculate total actuations needed
		const totalActuations = parsedSig.frequency === 0
			? parsedSig.dosage * daysSupply
			: (parsedSig.dosage * parsedSig.frequency) * daysSupply;
		
		// Calculate canisters needed (always round up)
		const canistersNeeded = Math.ceil(totalActuations / parsedSig.capacity);
		
		// Return actuations but note canister count in calculation
		total = totalActuations;
		logger.debug('Inhaler quantity calculated with capacity', {
			totalActuations,
			capacity: parsedSig.capacity,
			canistersNeeded,
		});
	}
	// Handle PRN medications (frequency = 0)
	else if (parsedSig.frequency === 0) {
		// PRN: assume once per day
		total = parsedSig.dosage * daysSupply;
		logger.warn(`PRN medication detected: assuming once per day for quantity calculation`, {
			dosage: parsedSig.dosage,
			daysSupply,
		});
	} else {
		// Normal calculation: (dosage × frequency) × daysSupply
		total = (parsedSig.dosage * parsedSig.frequency) * daysSupply;
	}

	// Round based on unit type
	const roundedTotal = roundQuantity(total, unit);

	// Warn about very large quantities
	if (daysSupply > 365) {
		logger.warn(`Very large days' supply detected: ${daysSupply} days`, {
			total: roundedTotal,
			unit: unit,
		});
	}

	return {
		total: roundedTotal,
		unit: unit, // Use calculated unit (may differ from parsedSig.unit for liquids)
		calculation: {
			dosage: parsedSig.dosage,
			frequency: parsedSig.frequency === 0 ? 1 : parsedSig.frequency, // Show assumed frequency for PRN
			daysSupply,
		},
	};
}

