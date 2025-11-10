/**
 * OpenAI-based SIG (prescription instruction) parser.
 * Fallback parser for complex patterns when regex confidence < 0.8.
 */

import { parseSig as openaiParseSig } from '../services/openai';
import { ParsedSig } from '../types/sig';
import { logger } from '../utils/logger';

/**
 * Valid units for SIG parsing
 */
const VALID_UNITS = ['tablet', 'capsule', 'pill', 'mL', 'L', 'unit', 'actuation'];

/**
 * Normalizes SIG text (same as regex parser)
 */
function normalizeSig(sig: string): string {
	if (!sig || typeof sig !== 'string') {
		return '';
	}
	return sig
		.toLowerCase()
		.trim()
		.replace(/\s+/g, ' ') // Replace multiple spaces with single space
		.replace(/[.,;:]/g, '') // Remove common punctuation
		.trim();
}

/**
 * Validates parsed SIG response
 */
function validateParsedSig(parsed: Partial<ParsedSig>): parsed is ParsedSig {
	if (!parsed) {
		return false;
	}

	// Validate required fields exist
	if (typeof parsed.dosage !== 'number') {
		return false;
	}
	if (typeof parsed.frequency !== 'number') {
		return false;
	}
	if (typeof parsed.unit !== 'string') {
		return false;
	}
	if (typeof parsed.confidence !== 'number') {
		return false;
	}

	// Validate values
	if (parsed.dosage <= 0) {
		return false;
	}
	if (parsed.frequency < 0) {
		return false;
	}
	if (!VALID_UNITS.includes(parsed.unit.toLowerCase())) {
		return false;
	}
	if (parsed.confidence < 0 || parsed.confidence > 1) {
		return false;
	}

	return true;
}

/**
 * Parses SIG using OpenAI API (fallback parser).
 * Returns null on any error instead of throwing.
 * @param sig - Prescription instruction text
 * @returns Parsed SIG or null if parsing fails
 */
export async function parse(sig: string): Promise<ParsedSig | null> {
	if (!sig || typeof sig !== 'string') {
		return null;
	}

	const normalized = normalizeSig(sig);
	if (!normalized) {
		return null;
	}

	try {
		// Call OpenAI service (already handles caching, retry, etc.)
		const parsed = await openaiParseSig(sig);

		// Validate parsed result
		if (!validateParsedSig(parsed)) {
			logger.warn(`OpenAI parser returned invalid result for SIG: ${sig}`, {
				parsed,
			});
			return null;
		}

		// Normalize unit to lowercase for consistency
		const normalizedUnit = parsed.unit.toLowerCase();

		return {
			dosage: parsed.dosage,
			frequency: parsed.frequency,
			unit: normalizedUnit,
			confidence: parsed.confidence,
		};
	} catch (error) {
		// Handle all errors gracefully - return null instead of throwing
		logger.error(`Error parsing SIG with OpenAI: ${sig.substring(0, 50)}...`, error as Error);
		return null;
	}
}

