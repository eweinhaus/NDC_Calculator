/**
 * Warning generation logic for NDC selections.
 * Generates warnings for inactive NDCs, overfills, underfills, and dosage form mismatches.
 */

import { NdcSelection } from '../types/ndc';
import { ParsedSig } from '../types/sig';
import { NdcInfo } from '../types/ndc';
import { Warning } from '../types/warning';
import { logger } from '../utils/logger';

/**
 * Maps SIG units to dosage forms for comparison
 */
const UNIT_TO_DOSAGE_FORMS: Record<string, string[]> = {
	tablet: ['TABLET', 'PILL'],
	capsule: ['CAPSULE'],
	pill: ['PILL', 'TABLET'],
	ml: ['LIQUID', 'SOLUTION', 'SUSPENSION', 'SYRUP'],
	l: ['LIQUID', 'SOLUTION', 'SUSPENSION'],
	unit: ['INJECTION', 'UNIT', 'VIAL'],
	actuation: ['INHALATION', 'AEROSOL', 'SPRAY'],
};

/**
 * Generates warning for inactive NDC.
 */
function generateInactiveNdcWarning(ndcInfo: NdcInfo): Warning {
	return {
		type: 'inactive_ndc',
		severity: 'error',
		message: `NDC ${ndcInfo.ndc} is inactive and should not be dispensed`,
	};
}

/**
 * Generates warning for overfill (waste > 10%).
 */
function generateOverfillWarning(
	selection: NdcSelection,
	targetQuantity: number
): Warning | null {
	if (selection.overfill <= 0) {
		return null;
	}

	const overfillPercent = (selection.overfill / targetQuantity) * 100;

	// Only warn if overfill > 10%
	if (overfillPercent > 10) {
		return {
			type: 'overfill',
			severity: 'warning',
			message: `Recommended package results in ${overfillPercent.toFixed(1)}% waste (${selection.overfill} ${selection.packageDescription?.split(' ')[1] || 'units'} excess)`,
		};
	}

	return null;
}

/**
 * Generates warning for underfill (insufficient quantity).
 */
function generateUnderfillWarning(
	selection: NdcSelection,
	targetQuantity: number
): Warning | null {
	if (selection.underfill <= 0) {
		return null;
	}

	const packageCount = selection.packageCount || 1;
	const requiredPackages = Math.ceil(targetQuantity / selection.packageSize);

	return {
		type: 'underfill',
		severity: 'warning',
		message: `Recommended package is insufficient. Requires ${requiredPackages} package${requiredPackages > 1 ? 's' : ''} to meet quantity`,
	};
}

/**
 * Generates warning for dosage form mismatch.
 */
function generateDosageFormMismatchWarning(
	selection: NdcSelection,
	parsedSig: ParsedSig,
	ndcInfo: NdcInfo
): Warning | null {
	if (!parsedSig.unit || !ndcInfo.dosageForm) {
		return null;
	}

	const normalizedUnit = parsedSig.unit.toLowerCase();
	const normalizedDosageForm = ndcInfo.dosageForm.toUpperCase();

	// Get expected dosage forms for this unit
	const expectedForms = UNIT_TO_DOSAGE_FORMS[normalizedUnit];
	if (!expectedForms) {
		return null; // Unknown unit, can't validate
	}

	// Check if dosage form matches
	const matches = expectedForms.some((form) =>
		normalizedDosageForm.includes(form)
	);

	if (!matches) {
		return {
			type: 'dosage_form_mismatch',
			severity: 'warning',
			message: `SIG specifies ${parsedSig.unit} but NDC is ${ndcInfo.dosageForm}. Please verify.`,
		};
	}

	return null;
}

/**
 * Generates all warnings for an NDC selection.
 * @param selection - NDC selection to check
 * @param targetQuantity - Target quantity
 * @param parsedSig - Parsed SIG (for dosage form matching)
 * @param ndcInfo - Original NDC info (for active status and dosage form)
 * @returns Array of warnings
 */
export function generateWarnings(
	selection: NdcSelection,
	targetQuantity: number,
	parsedSig: ParsedSig,
	ndcInfo: NdcInfo
): Warning[] {
	const warnings: Warning[] = [];

	// Check inactive NDC
	if (!ndcInfo.active) {
		warnings.push(generateInactiveNdcWarning(ndcInfo));
	}

	// Check overfill
	const overfillWarning = generateOverfillWarning(selection, targetQuantity);
	if (overfillWarning) {
		warnings.push(overfillWarning);
	}

	// Check underfill (only for single-pack, multi-pack always meets target)
	if (selection.packageCount === 1 && selection.underfill > 0) {
		const underfillWarning = generateUnderfillWarning(selection, targetQuantity);
		if (underfillWarning) {
			warnings.push(underfillWarning);
		}
	}

	// Check dosage form mismatch
	const mismatchWarning = generateDosageFormMismatchWarning(
		selection,
		parsedSig,
		ndcInfo
	);
	if (mismatchWarning) {
		warnings.push(mismatchWarning);
	}

	return warnings;
}

