/**
 * Regex-based SIG (prescription instruction) parser.
 * Primary parser that handles 80%+ of common prescription patterns.
 */

import { ParsedSig, Concentration } from '../types/sig';
import {
	SIG_PATTERNS,
	UNIT_PATTERNS,
	FREQUENCY_PATTERNS,
	CONFIDENCE_RULES,
	type SigPattern,
} from '../constants/sigPatterns';

/**
 * Normalizes SIG text for parsing
 */
function normalizeSig(sig: string): string {
	if (!sig || typeof sig !== 'string') {
		return '';
	}
	return sig
		.toLowerCase()
		.trim()
		.replace(/\s+/g, ' ') // Replace multiple spaces with single space
		.replace(/[;,:]/g, '') // Remove common punctuation except decimal points
		.trim();
}

/**
 * Extracts dosage from SIG text using pattern match
 */
function extractDosage(sig: string, match: RegExpMatchArray, dosageGroup?: number): number | null {
	if (!dosageGroup || !match[dosageGroup]) {
		return null;
	}

	const dosageStr = match[dosageGroup].trim();
	
	// Handle ranges (e.g., "1-2" → 1.5)
	const rangeMatch = dosageStr.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);
	if (rangeMatch) {
		const min = parseFloat(rangeMatch[1]);
		const max = parseFloat(rangeMatch[2]);
		return (min + max) / 2; // Average
	}

	// Handle single number
	const dosage = parseFloat(dosageStr);
	return isNaN(dosage) || dosage <= 0 ? null : dosage;
}

/**
 * Extracts unit from SIG text
 * Handles patterns with fixed units (unitGroup: 0) and extracts from match groups (unitGroup > 0)
 */
function extractUnit(sig: string, pattern?: SigPattern, match?: RegExpMatchArray): string | null {
	// Check if pattern has fixed unit (unitGroup: 0)
	if (pattern && pattern.unitGroup === 0) {
		// Extract from pattern name or use fixed unit based on pattern
		if (pattern.name.includes('ml') || pattern.name.includes('liquid')) {
			return 'mL';
		}
		if (pattern.name.includes('unit') || pattern.name.includes('insulin') || pattern.name.includes('subq') || pattern.name.includes('sc')) {
			return 'unit';
		}
		if (pattern.name.includes('puff') || pattern.name.includes('actuation') || pattern.name.includes('inhale')) {
			return 'actuation';
		}
	}

	// Extract from match group if unitGroup > 0
	if (pattern && pattern.unitGroup && pattern.unitGroup > 0 && match && match[pattern.unitGroup]) {
		const unitRaw = match[pattern.unitGroup].trim();
		// Normalize unit: convert to lowercase and map to standard forms
		const unitLower = unitRaw.toLowerCase();
		
		// Map common unit variations to standard forms
		if (unitLower === 'ml' || unitLower === 'milliliter' || unitLower === 'milliliters' || unitLower === 'millilitre' || unitLower === 'millilitres' || unitLower === 'cc' || unitLower === 'ccs') {
			return 'mL';
		}
		if (unitLower === 'l' || unitLower === 'liter' || unitLower === 'liters' || unitLower === 'litre' || unitLower === 'litres') {
			return 'L';
		}
		if (unitLower === 'tablet' || unitLower === 'tab' || unitLower === 'tablets' || unitLower === 'tabs') {
			return 'tablet';
		}
		if (unitLower === 'capsule' || unitLower === 'cap' || unitLower === 'capsules' || unitLower === 'caps') {
			return 'capsule';
		}
		if (unitLower === 'pill' || unitLower === 'pills') {
			return 'pill';
		}
		if (unitLower === 'unit' || unitLower === 'units' || unitLower === 'u' || unitLower === 'iu') {
			return 'unit';
		}
		if (unitLower === 'actuation' || unitLower === 'actuations' || unitLower === 'puff' || unitLower === 'puffs' || unitLower === 'spray' || unitLower === 'sprays') {
			return 'actuation';
		}
		
		// If no mapping found, return as-is (uppercase for consistency with other units)
		return unitRaw.toUpperCase();
	}

	// Try unit patterns
	for (const unitPattern of UNIT_PATTERNS) {
		if (unitPattern.pattern.test(sig)) {
			return unitPattern.normalized;
		}
	}

	const normalizedSig = sig.toLowerCase();

	// Handle numbers immediately followed by liquid units (e.g., "0.3ml", "1cc")
	const fusedLiquidMatch = normalizedSig.match(/\d+(?:\.\d+)?\s*(ml|milliliter|milliliters|millilitre|millilitres|cc|ccs)\b/);
	if (fusedLiquidMatch) {
		return 'mL';
	}

	// Additional heuristics for injection instructions lacking explicit units
	if (normalizedSig.includes('inject')) {
		if (/\bunits?\b/.test(normalizedSig) || /\bu\b/.test(normalizedSig) || /\biu\b/.test(normalizedSig)) {
			return 'unit';
		}
		if (/\b(?:ml|milliliter|milliliters|millilitre|millilitres|cc|ccs)\b/.test(normalizedSig)) {
			return 'mL';
		}
	}

	return null;
}

/**
 * Detects dosage form from unit and SIG text
 */
function detectDosageForm(unit: string, sig: string): 'tablet' | 'capsule' | 'liquid' | 'insulin' | 'inhaler' | 'other' {
	const normalizedUnit = unit.toLowerCase();
	const normalizedSig = sig.toLowerCase();

	// Liquids
	if (normalizedUnit === 'ml' || normalizedUnit === 'l' || normalizedUnit === 'milliliter' || normalizedUnit === 'liter') {
		return 'liquid';
	}

	// Insulin
	if (normalizedUnit === 'unit' || normalizedUnit === 'u' || normalizedUnit === 'iu') {
		if (normalizedSig.includes('insulin') || normalizedSig.includes('subcutaneously') || normalizedSig.includes('sc') || normalizedSig.includes('subq')) {
			return 'insulin';
		}
	}

	// Inhalers - if unit is actuation/puff/spray, assume inhaler
	if (normalizedUnit === 'actuation' || normalizedUnit === 'puff' || normalizedUnit === 'spray') {
		return 'inhaler';
	}

	// Tablets
	if (normalizedUnit === 'tablet' || normalizedUnit === 'tab') {
		return 'tablet';
	}

	// Capsules
	if (normalizedUnit === 'capsule' || normalizedUnit === 'cap') {
		return 'capsule';
	}

	return 'other';
}

/**
 * Extracts concentration from SIG text (e.g., "5mg/mL", "10mg per 5mL")
 */
function extractConcentration(sig: string): Concentration | null {
	// Pattern: "Xmg/mL" or "Xmg per XmL"
	const patterns = [
		/(\d+(?:\.\d+)?)\s*mg\s*\/\s*(\d+(?:\.\d+)?)\s*ml/i,
		/(\d+(?:\.\d+)?)\s*mg\s*per\s*(\d+(?:\.\d+)?)\s*ml/i,
	];

	for (const pattern of patterns) {
		const match = sig.match(pattern);
		if (match) {
			const amount = parseFloat(match[1]);
			const volume = parseFloat(match[2]);
			if (amount > 0 && volume > 0) {
				return {
					amount,
					unit: 'mg',
					volume,
					volumeUnit: 'mL',
				};
			}
		}
	}

	return null;
}

/**
 * Extracts insulin strength from SIG text (e.g., "U-100", "U-200")
 */
function extractInsulinStrength(sig: string): number | null {
	const match = sig.match(/\bu-?(\d+)\b/i);
	if (match) {
		const strength = parseInt(match[1], 10);
		return strength > 0 ? strength : null;
	}
	return null;
}

/**
 * Extracts inhaler capacity from SIG text (e.g., "200 actuations per canister")
 */
function extractInhalerCapacity(sig: string): number | null {
	const patterns = [
		/(\d+)\s+actuations?\s+per\s+(?:canister|inhaler|device)/i,
		/(\d+)\s+puffs?\s+per\s+(?:canister|inhaler|device)/i,
	];

	for (const pattern of patterns) {
		const match = sig.match(pattern);
		if (match) {
			const capacity = parseInt(match[1], 10);
			return capacity > 0 ? capacity : null;
		}
	}

	return null;
}

/**
 * Extracts frequency from SIG text
 */
function extractFrequency(
	sig: string,
	match: RegExpMatchArray,
	frequencyGroup?: number,
	pattern?: SigPattern
): number | null {
	// If pattern has fixed frequency (frequencyGroup = 0), check pattern name first
	// This takes precedence over general frequency patterns
	if (frequencyGroup === 0 && pattern) {
		// Extract from pattern name
		if (pattern.name.includes('prn') || pattern.name.includes('as_needed')) {
			return 0;
		}
		if (pattern.name.includes('morning_and_evening')) {
			return 2;
		}
		if (pattern.name.includes('four_times')) {
			return 4;
		}
		if (pattern.name.includes('three_times')) {
			return 3;
		}
		if (pattern.name.includes('twice')) {
			return 2;
		}
		if (pattern.name.includes('once') || pattern.name.includes('daily') || pattern.name.includes('morning') || pattern.name.includes('evening') || pattern.name.includes('bedtime')) {
			return 1;
		}
	}

	// Try frequency patterns (for patterns without fixed frequency)
	for (const freqPattern of FREQUENCY_PATTERNS) {
		const freqMatch = sig.match(freqPattern.pattern);
		if (freqMatch) {
			if (typeof freqPattern.frequency === 'number') {
				return freqPattern.frequency;
			} else if (typeof freqPattern.frequency === 'function') {
				return freqPattern.frequency(freqMatch);
			}
		}
	}

	// Try to extract from match group if available
	if (frequencyGroup && frequencyGroup > 0 && match[frequencyGroup]) {
		const freqStr = match[frequencyGroup].trim();
		
		// Check if it's "every X hours" pattern (the number in the group is hours)
		if (pattern?.name.includes('every_hours') || (sig.includes('every') && sig.includes('hours'))) {
			const hoursMatch = freqStr.match(/(\d+)/);
			if (hoursMatch) {
				const hours = parseInt(hoursMatch[1], 10);
				return hours > 0 ? Math.floor(24 / hours) : 0;
			}
		}

		// Check if it's a number (for "X times daily" patterns)
		const numMatch = freqStr.match(/(\d+)/);
		if (numMatch) {
			return parseInt(numMatch[1], 10);
		}
	}

	return null;
}

/**
 * Calculates confidence score for parsed SIG
 */
function calculateConfidence(
	match: RegExpMatchArray,
	pattern: SigPattern,
	extracted: {
		dosage: number | null;
		frequency: number | null;
		unit: string | null;
	}
): number {
	let confidence = CONFIDENCE_RULES.exactMatch;

	// Reduce confidence for missing parts
	if (!extracted.dosage) {
		confidence -= 0.2;
	}
	if (extracted.frequency === null) {
		confidence -= 0.15;
	}
	if (!extracted.unit) {
		confidence -= 0.1;
	}

	// Adjust based on match quality
	if (confidence < CONFIDENCE_RULES.weakMatch) {
		confidence = CONFIDENCE_RULES.weakMatch;
	}

	return Math.max(0, Math.min(1, confidence));
}

/**
 * Parses SIG text using regex patterns
 * @param sig - Prescription instruction text
 * @returns Parsed SIG or null if parsing fails
 */
export function parse(sig: string): ParsedSig | null {
	if (!sig || typeof sig !== 'string') {
		return null;
	}

	const normalized = normalizeSig(sig);
	if (!normalized) {
		return null;
	}

	// Try each pattern in priority order
	for (const pattern of SIG_PATTERNS) {
		const match = normalized.match(pattern.pattern);
		if (!match) {
			continue;
		}

		// Extract components
		const dosage = extractDosage(normalized, match, pattern.dosageGroup);
		const unit = extractUnit(normalized, pattern, match) || 'tablet'; // Default to tablet if not found
		const frequency = extractFrequency(normalized, match, pattern.frequencyGroup, pattern);

		console.error(`🔍 [SIG PARSER] Pattern "${pattern.name}" matched:`, {
			sig: normalized,
			dosage,
			unit,
			frequency,
			dosageGroup: pattern.dosageGroup,
			unitGroup: pattern.unitGroup,
			frequencyGroup: pattern.frequencyGroup,
			matchGroups: match.slice(1).map((g, i) => `[${i+1}]=${g}`).join(', ')
		});

		// Calculate confidence
		const confidence = calculateConfidence(match, pattern, { dosage, frequency, unit });

		// If confidence is too low, try next pattern
		if (confidence < 0.7) {
			continue;
		}

		// Validate extracted values
		if (!dosage || dosage <= 0) {
			continue;
		}
		if (frequency === null || frequency < 0) {
			// Allow frequency = 0 for PRN, but set to null for validation
			if (frequency !== 0) {
				continue;
			}
		}
		if (!unit) {
			continue;
		}

		// Extract special dosage form metadata
		const dosageForm = detectDosageForm(unit, normalized);
		const concentration = extractConcentration(normalized);
		const insulinStrength = extractInsulinStrength(normalized);
		const capacity = extractInhalerCapacity(normalized);

		const parsedResult = {
			dosage,
			frequency: frequency ?? 0,
			unit,
			confidence,
			dosageForm,
			concentration: concentration || undefined,
			insulinStrength: insulinStrength || undefined,
			capacity: capacity || undefined,
		};

		console.error(`✅ [SIG PARSER] Successfully parsed SIG:`, parsedResult);

		// Return parsed SIG with special form metadata
		return parsedResult;
	}

	// No pattern matched or all had low confidence
	return null;
}

