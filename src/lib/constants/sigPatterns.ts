/**
 * SIG (prescription instruction) parsing patterns and constants.
 * Patterns are ordered by priority (most specific first).
 */

/**
 * Unit pattern for extracting medication units
 */
export interface UnitPattern {
	pattern: RegExp;
	normalized: string; // Normalized unit name
}

/**
 * Frequency pattern for extracting dosing frequency
 */
export interface FrequencyPattern {
	pattern: RegExp;
	frequency: number | ((match: RegExpMatchArray) => number); // Fixed number or calculation function
}

/**
 * Confidence scoring rule
 */
export interface ConfidenceRule {
	exactMatch: number; // 0.9-1.0
	partialMatch: number; // 0.8-0.9
	weakMatch: number; // 0.7-0.8
}

/**
 * SIG pattern definition
 */
export interface SigPattern {
	pattern: RegExp;
	name: string;
	priority: number; // Higher priority = more specific, checked first
	dosageGroup?: number; // Regex group index for dosage extraction
	frequencyGroup?: number; // Regex group index for frequency extraction
	unitGroup?: number; // Regex group index for unit extraction
}

/**
 * Unit extraction patterns (ordered by specificity)
 */
export const UNIT_PATTERNS: UnitPattern[] = [
	// Tablets
	{ pattern: /\btablets?\b/i, normalized: 'tablet' },
	{ pattern: /\btabs?\b/i, normalized: 'tablet' },
	// Capsules
	{ pattern: /\bcapsules?\b/i, normalized: 'capsule' },
	{ pattern: /\bcaps?\b/i, normalized: 'capsule' },
	// Pills
	{ pattern: /\bpills?\b/i, normalized: 'pill' },
	// Liquids
	{ pattern: /\bml\b/i, normalized: 'mL' },
	{ pattern: /\bl\b/i, normalized: 'L' },
	{ pattern: /\bliters?\b/i, normalized: 'L' },
	// Units (insulin, etc.)
	{ pattern: /\bunits?\b/i, normalized: 'unit' },
	{ pattern: /\bu\b/i, normalized: 'unit' },
	{ pattern: /\biu\b/i, normalized: 'unit' },
	// Actuations (inhalers)
	{ pattern: /\bactuations?\b/i, normalized: 'actuation' },
	{ pattern: /\bpuffs?\b/i, normalized: 'actuation' },
];

/**
 * Frequency extraction patterns
 * Ordered by specificity (most specific first) to avoid false matches
 */
export const FREQUENCY_PATTERNS: FrequencyPattern[] = [
	// Four times daily (most specific)
	{
		pattern: /\bfour\s+times\s+(?:daily|a\s+day)\b/i,
		frequency: 4,
	},
	{
		pattern: /\bq\.i\.d\.\b/i, // Q.I.D. = four times daily
		frequency: 4,
	},
	{
		pattern: /\bqid\b/i, // QID = four times daily
		frequency: 4,
	},
	// Three times daily
	{
		pattern: /\bthree\s+times\s+(?:daily|a\s+day)\b/i,
		frequency: 3,
	},
	{
		pattern: /\bt\.i\.d\.\b/i, // T.I.D. = three times daily
		frequency: 3,
	},
	{
		pattern: /\btid\b/i, // TID = three times daily
		frequency: 3,
	},
	// Twice daily
	{
		pattern: /\btwice\s+(?:daily|a\s+day)\b/i,
		frequency: 2,
	},
	{
		pattern: /\bb\.i\.d\.\b/i, // B.I.D. = twice daily
		frequency: 2,
	},
	{
		pattern: /\bbid\b/i, // BID = twice daily
		frequency: 2,
	},
	// Once daily
	{
		pattern: /\bonce\s+(?:daily|a\s+day)\b/i,
		frequency: 1,
	},
	{
		pattern: /\bqd\b/i, // QD = once daily
		frequency: 1,
	},
	// Daily (least specific - must come last)
	{
		pattern: /\bdaily\b/i,
		frequency: 1,
	},
	// Every X hours
	{
		pattern: /\bevery\s+(\d+)\s+hours?\b/i,
		frequency: (match) => {
			const hours = parseInt(match[1], 10);
			return hours > 0 ? Math.floor(24 / hours) : 0;
		},
	},
	// Every X minutes
	{
		pattern: /\bevery\s+(\d+)\s+minutes?\b/i,
		frequency: (match) => {
			const minutes = parseInt(match[1], 10);
			return minutes > 0 ? Math.floor(1440 / minutes) : 0;
		},
	},
	// Timing-based (morning, evening, bedtime)
	// Most specific first: "morning and evening" before individual timing
	{
		pattern: /\bin\s+the\s+morning\s+and\s+in\s+the\s+evening\b/i,
		frequency: 2,
	},
	{
		pattern: /\b(?:every\s+)?(?:morning|am)\b/i,
		frequency: 1,
	},
	{
		pattern: /\b(?:every\s+)?(?:evening|pm|bedtime|at\s+bedtime)\b/i,
		frequency: 1,
	},
	// PRN (as needed) - frequency = 0
	{
		pattern: /\b(?:as\s+needed|prn|as\s+directed)\b/i,
		frequency: 0,
	},
];

/**
 * Confidence scoring rules
 */
export const CONFIDENCE_RULES: ConfidenceRule = {
	exactMatch: 0.95, // All parts found, exact pattern match
	partialMatch: 0.85, // Most parts found, minor variations
	weakMatch: 0.75, // Some parts missing, lower confidence
};

/**
 * SIG parsing patterns (ordered by priority - most specific first)
 * Note: Patterns are sorted by priority descending after definition
 */
const SIG_PATTERNS_RAW: SigPattern[] = [
	// Pattern 1: "Take X [unit] [route] [frequency] [timing]" - Most specific
	{
		pattern: /take\s+(\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?)\s+(\w+)\s+(?:by\s+mouth|orally|po)\s+(.+?)(?:\s+with\s+food|\s+at\s+bedtime|\s+every\s+morning|\s+every\s+evening|$)/i,
		name: 'take_unit_route_frequency_timing',
		priority: 10,
		dosageGroup: 1,
		unitGroup: 2,
		frequencyGroup: 3,
	},
	// Pattern 2: "Take X [unit] [route] [frequency]"
	{
		pattern: /take\s+(\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?)\s+(\w+)\s+(?:by\s+mouth|orally|po)\s+(.+?)(?:\s+with\s+food|$)/i,
		name: 'take_unit_route_frequency',
		priority: 9,
		dosageGroup: 1,
		unitGroup: 2,
		frequencyGroup: 3,
	},
	// Pattern 3: "Take X [unit] every X hours"
	{
		pattern: /take\s+(\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?)\s+(\w+)\s+every\s+(\d+)\s+hours?/i,
		name: 'take_unit_every_hours',
		priority: 9,
		dosageGroup: 1,
		unitGroup: 2,
		frequencyGroup: 3,
	},
	// Pattern 4: "X [unit] X times daily"
	{
		pattern: /(\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?)\s+(\w+)\s+(\d+)\s+times\s+(?:daily|a\s+day)/i,
		name: 'unit_times_daily',
		priority: 8,
		dosageGroup: 1,
		unitGroup: 2,
		frequencyGroup: 3,
	},
	// Pattern 5: "Take X [unit] twice daily"
	{
		pattern: /take\s+(\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?)\s+(\w+)\s+twice\s+(?:daily|a\s+day)/i,
		name: 'take_unit_twice_daily',
		priority: 8,
		dosageGroup: 1,
		unitGroup: 2,
		frequencyGroup: 0, // Fixed frequency = 2
	},
	// Pattern 6: "Take X [unit] once daily"
	{
		pattern: /take\s+(\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?)\s+(\w+)\s+once\s+(?:daily|a\s+day)/i,
		name: 'take_unit_once_daily',
		priority: 8,
		dosageGroup: 1,
		unitGroup: 2,
		frequencyGroup: 0, // Fixed frequency = 1
	},
	// Pattern 7: "Take X [unit] three times daily"
	{
		pattern: /take\s+(\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?)\s+(\w+)\s+three\s+times\s+(?:daily|a\s+day)/i,
		name: 'take_unit_three_times_daily',
		priority: 8,
		dosageGroup: 1,
		unitGroup: 2,
		frequencyGroup: 0, // Fixed frequency = 3
	},
	// Pattern 8: "Take X [unit] four times daily"
	{
		pattern: /take\s+(\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?)\s+(\w+)\s+four\s+times\s+(?:daily|a\s+day)/i,
		name: 'take_unit_four_times_daily',
		priority: 8,
		dosageGroup: 1,
		unitGroup: 2,
		frequencyGroup: 0, // Fixed frequency = 4
	},
	// Pattern 9: "Take X [unit] every morning/evening"
	{
		pattern: /take\s+(\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?)\s+(\w+)\s+every\s+(?:morning|evening|am|pm)/i,
		name: 'take_unit_every_morning_evening',
		priority: 7,
		dosageGroup: 1,
		unitGroup: 2,
		frequencyGroup: 0, // Fixed frequency = 1
	},
	// Pattern 10: "Take X [unit] at bedtime"
	{
		pattern: /take\s+(\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?)\s+(\w+)\s+at\s+bedtime/i,
		name: 'take_unit_at_bedtime',
		priority: 7,
		dosageGroup: 1,
		unitGroup: 2,
		frequencyGroup: 0, // Fixed frequency = 1
	},
	// Pattern 11: "X [unit] [route] [frequency]" - Without "Take"
	{
		pattern: /(\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?)\s+(\w+)\s+(?:by\s+mouth|orally|po)\s+(.+?)(?:\s+with\s+food|$)/i,
		name: 'unit_route_frequency',
		priority: 6,
		dosageGroup: 1,
		unitGroup: 2,
		frequencyGroup: 3,
	},
	// Pattern 12: "X [unit] every X hours" - Without "Take"
	{
		pattern: /(\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?)\s+(\w+)\s+every\s+(\d+)\s+hours?/i,
		name: 'unit_every_hours',
		priority: 6,
		dosageGroup: 1,
		unitGroup: 2,
		frequencyGroup: 3,
	},
	// Pattern 13: "X [unit] twice daily" - Without "Take"
	{
		pattern: /(\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?)\s+(\w+)\s+twice\s+(?:daily|a\s+day)/i,
		name: 'unit_twice_daily',
		priority: 5,
		dosageGroup: 1,
		unitGroup: 2,
		frequencyGroup: 0, // Fixed frequency = 2
	},
	// Pattern 14: "X [unit] once daily" - Without "Take"
	{
		pattern: /(\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?)\s+(\w+)\s+once\s+(?:daily|a\s+day)/i,
		name: 'unit_once_daily',
		priority: 5,
		dosageGroup: 1,
		unitGroup: 2,
		frequencyGroup: 0, // Fixed frequency = 1
	},
	// Pattern 15: "X [unit] daily" - Simple
	{
		pattern: /(\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?)\s+(\w+)\s+daily/i,
		name: 'unit_daily',
		priority: 4,
		dosageGroup: 1,
		unitGroup: 2,
		frequencyGroup: 0, // Fixed frequency = 1
	},
	// Pattern 16: "Take X [unit] in the morning and X [unit] in the evening"
	{
		pattern: /take\s+(\d+(?:\.\d+)?)\s+(\w+)\s+in\s+the\s+morning\s+and\s+\d+(?:\.\d+)?\s+\w+\s+in\s+the\s+evening/i,
		name: 'take_unit_morning_and_evening',
		priority: 9,
		dosageGroup: 1,
		unitGroup: 2,
		frequencyGroup: 0, // Fixed frequency = 2
	},
	// Pattern 17: "Take X [unit] as needed/PRN"
	{
		pattern: /take\s+(\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?)\s+(\w+).*?(?:as\s+needed|prn|as\s+directed)/i,
		name: 'take_unit_prn',
		priority: 6,
		dosageGroup: 1,
		unitGroup: 2,
		frequencyGroup: 0, // Fixed frequency = 0 (PRN)
	},
];

/**
 * SIG parsing patterns (sorted by priority descending - most specific first)
 */
export const SIG_PATTERNS: SigPattern[] = SIG_PATTERNS_RAW.sort(
	(a, b) => b.priority - a.priority
);

