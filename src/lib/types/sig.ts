/**
 * Concentration information for liquid medications
 */
export interface Concentration {
	amount: number;      // e.g., 5 (from "5mg")
	unit: string;        // e.g., "mg"
	volume: number;      // e.g., 1 (from "5mg/1mL")
	volumeUnit: string;  // e.g., "mL"
}

/**
 * Parsed SIG (prescription instructions)
 */
export interface ParsedSig {
	dosage: number;
	frequency: number;
	unit: string;
	confidence: number;
	// Special dosage form metadata (optional for backward compatibility)
	dosageForm?: 'tablet' | 'capsule' | 'liquid' | 'insulin' | 'inhaler' | 'other';
	concentration?: Concentration;  // For liquids: e.g., "5mg/mL"
	capacity?: number;               // For inhalers: actuations per canister
	insulinStrength?: number;        // For insulin: U-100 = 100, U-200 = 200
}

/**
 * Calculated quantity result
 */
export interface QuantityResult {
	total: number;
	unit: string;
	calculation: {
		dosage: number;
		frequency: number;
		daysSupply: number;
	};
}

