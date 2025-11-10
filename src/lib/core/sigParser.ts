/**
 * SIG (prescription instruction) parser orchestrator.
 * Coordinates regex and OpenAI parsers with caching.
 * This is the main entry point for all SIG parsing operations.
 */

import { parse as regexParse } from './regexSigParser';
import { parse as openaiParse } from './openaiSigParser';
import { cache } from '../services/cache';
import { sigParseKey } from '../constants/cacheKeys';
import { SIG_PARSE_TTL } from '../constants/cacheTtl';
import { logger } from '../utils/logger';
import { ParsedSig } from '../types/sig';

/**
 * Valid units for validation
 */
const VALID_UNITS = ['tablet', 'capsule', 'pill', 'ml', 'l', 'unit', 'actuation'];

/**
 * Normalizes SIG text for cache key (same as cache key function)
 */
function normalizeSigForCache(sig: string): string {
	if (!sig || typeof sig !== 'string') {
		return '';
	}
	return sig.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Validates parsed SIG result
 */
function validateParsedSig(parsed: ParsedSig | null): parsed is ParsedSig {
	if (!parsed) {
		return false;
	}

	// Validate required fields
	if (typeof parsed.dosage !== 'number' || parsed.dosage <= 0) {
		return false;
	}
	if (typeof parsed.frequency !== 'number' || parsed.frequency < 0) {
		return false;
	}
	if (typeof parsed.unit !== 'string' || !VALID_UNITS.includes(parsed.unit.toLowerCase())) {
		return false;
	}
	if (typeof parsed.confidence !== 'number' || parsed.confidence < 0 || parsed.confidence > 1) {
		return false;
	}

	return true;
}

/**
 * Parses SIG text using regex (primary) and OpenAI (fallback) parsers.
 * Results are cached for 30 days.
 * @param sig - Prescription instruction text
 * @returns Parsed SIG or null if parsing fails
 */
export async function parse(sig: string): Promise<ParsedSig | null> {
	if (!sig || typeof sig !== 'string') {
		return null;
	}

	const normalizedSig = normalizeSigForCache(sig);
	if (!normalizedSig) {
		return null;
	}

	const cacheKey = sigParseKey(normalizedSig);

	// Check cache first
	try {
		const cached = await cache.get<ParsedSig>(cacheKey);
		if (cached) {
			if (validateParsedSig(cached)) {
				logger.debug(`SIG parser cache hit: ${sig.substring(0, 50)}...`);
				return cached;
			} else {
				logger.warn(`Invalid cached SIG result, clearing: ${cacheKey}`);
				await cache.delete(cacheKey);
			}
		}
	} catch (error) {
		// Cache error - log but continue without cache
		logger.warn('Cache error, continuing without cache', error as Error);
	}

	// Cache miss - try regex parser first
	let regexResult: ParsedSig | null = null;
	try {
		regexResult = regexParse(sig);
		if (regexResult && regexResult.confidence >= 0.8) {
			// High confidence regex result - cache and return
			if (validateParsedSig(regexResult)) {
				try {
					await cache.set(cacheKey, regexResult, SIG_PARSE_TTL);
					logger.debug(`SIG parsed with regex (high confidence): ${sig.substring(0, 50)}...`);
				} catch (error) {
					// Cache error - log but continue
					logger.warn('Cache error, continuing without caching', error as Error);
				}
				return regexResult;
			} else {
				logger.warn(`Invalid regex result for SIG: ${sig.substring(0, 50)}...`);
			}
		}
	} catch (error) {
		// Regex parser error - log but try OpenAI
		logger.warn('Regex parser error, trying OpenAI fallback', error as Error);
	}

	// Regex confidence < 0.8 or null - try OpenAI parser
	if (!regexResult || regexResult.confidence < 0.8) {
		try {
			const openaiResult = await openaiParse(sig);
			if (openaiResult && validateParsedSig(openaiResult)) {
				// OpenAI result valid - cache and return
				try {
					await cache.set(cacheKey, openaiResult, SIG_PARSE_TTL);
					logger.debug(`SIG parsed with OpenAI: ${sig.substring(0, 50)}...`);
				} catch (error) {
					// Cache error - log but continue
					logger.warn('Cache error, continuing without caching', error as Error);
				}
				return openaiResult;
			} else if (openaiResult) {
				logger.warn(`Invalid OpenAI result for SIG: ${sig.substring(0, 50)}...`);
			}
		} catch (error) {
			// OpenAI parser error - log and return null
			logger.error('OpenAI parser error', error as Error);
		}
	}

	// Both parsers failed or returned invalid results
	logger.warn(`Failed to parse SIG: ${sig.substring(0, 50)}...`);
	return null;
}

