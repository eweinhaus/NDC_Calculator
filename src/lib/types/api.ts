// Import types that are defined in other files
import type { DrugInfo } from './drug.js';
import type { QuantityResult } from './sig.js';
import type { NdcSelection } from './ndc.js';
import type { Warning } from './warning.js';

/**
 * Request payload for calculation endpoint
 */
export interface CalculationRequest {
	drugInput: string;
	sig: string;
	daysSupply: number;
}

/**
 * Response payload for calculation endpoint
 */
export interface CalculationResponse {
	success: boolean;
	data?: CalculationResult;
	error?: ApiError;
}

/**
 * Successful calculation result
 */
export interface CalculationResult {
	drug: DrugInfo;
	quantity: QuantityResult;
	recommendedNdc: NdcSelection;
	alternatives: NdcSelection[];
	warnings: Warning[];
	inactiveNdcs?: Array<{ ndc: string; reason: string }>;
}

/**
 * API error structure
 */
export interface ApiError {
	code: string;
	message: string;
	details?: unknown;
}

