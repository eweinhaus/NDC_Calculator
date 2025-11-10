/**
 * Warning or error message
 */
export interface Warning {
	type: 'inactive_ndc' | 'overfill' | 'underfill' | 'dosage_form_mismatch' | 'parse_warning';
	message: string;
	severity: 'error' | 'warning' | 'info';
}

