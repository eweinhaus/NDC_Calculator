/**
 * Parsed SIG (prescription instructions)
 */
export interface ParsedSig {
	dosage: number;
	frequency: number;
	unit: string;
	confidence: number;
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

