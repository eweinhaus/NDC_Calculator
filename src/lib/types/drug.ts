/**
 * Drug information from RxNorm
 */
export interface DrugInfo {
	name: string;
	rxcui: string;
	strength?: string;
	dosageForm?: string;
}

/**
 * RxNorm API response structure
 * Note: This will be refined based on Phase 0 findings
 */
export interface RxNormResponse {
	// To be defined based on Phase 0 API research
	// Placeholder structure:
	idGroup?: {
		rxnormId?: string[];
	};
	// Add more fields as needed
}

/**
 * RxNorm NDC list response
 */
export interface RxNormNdcResponse {
	ndcGroup?: {
		ndc?: string[];
	};
	// Add more fields as needed
}

