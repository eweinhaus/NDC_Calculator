/**
 * NDC information from FDA API
 */
export interface NdcInfo {
	ndc: string;
	packageSize: number;
	packageDescription: string;
	manufacturer: string;
	dosageForm: string;
	active: boolean;
}

/**
 * NDC selection recommendation
 */
export interface NdcSelection {
	ndc: string;
	packageSize: number;
	packageCount?: number;
	totalQuantity: number;
	overfill: number;
	underfill: number;
	matchScore: number;
	packageDescription?: string;
	manufacturer?: string;
}

