/**
 * SIG (prescription instruction) parser orchestrator.
 * Coordinates regex and OpenAI parsers with caching.
 * This is the main entry point for all SIG parsing operations.
 */

import { parse as regexParse } from './regexSigParser';
import { parse as openaiParse } from './openaiSigParser';
import { rewriteSig } from '../services/openai';
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
 * If both parsers fail, attempts to rewrite the SIG using AI and retries parsing.
 * Results are cached for 30 days.
 * @param sig - Prescription instruction text
 * @param recursionDepth - Internal parameter to prevent infinite recursion (max 1 rewrite attempt)
 * @returns Parsed SIG or null if parsing fails
 */
export async function parse(sig: string, recursionDepth: number = 0): Promise<ParsedSig | null> {
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

	// Both parsers failed - try rewrite fallback (only on first attempt)
	if (recursionDepth === 0) {
		try {
			logger.debug(`Attempting SIG rewrite fallback: ${sig.substring(0, 50)}...`);
			const rewrittenSig = await rewriteSig(sig);
			if (rewrittenSig && rewrittenSig.trim() !== sig.trim()) {
				logger.info(`SIG rewritten successfully: "${sig}" -> "${rewrittenSig}", retrying parse...`);
				// Recursively try parsing rewritten SIG (with depth=1 to prevent infinite loops)
				const rewrittenResult = await parse(rewrittenSig, 1);
				if (rewrittenResult && validateParsedSig(rewrittenResult)) {
					// Cache result with original SIG's cache key (not rewritten SIG's key)
					try {
						await cache.set(cacheKey, rewrittenResult, SIG_PARSE_TTL);
						logger.info(`Rewritten SIG parsed successfully: ${sig.substring(0, 50)}...`);
					} catch (error) {
						// Cache error - log but continue
						logger.warn('Cache error, continuing without caching', error as Error);
					}
					return rewrittenResult;
				} else {
					logger.warn(`Rewritten SIG still failed to parse. Original: "${sig}", Rewritten: "${rewrittenSig}"`);
				}
			} else if (rewrittenSig && rewrittenSig.trim() === sig.trim()) {
				logger.debug(`SIG rewrite returned unchanged: ${sig.substring(0, 50)}...`);
			} else {
				logger.warn(`SIG rewrite failed or unavailable (returned null). Original SIG: "${sig}"`);
			}
		} catch (error) {
			// Rewrite error - log and continue to return null
			logger.error(`Error during SIG rewrite fallback for "${sig}"`, error as Error);
		}
	}

	// Both parsers failed and rewrite either failed or didn't help
	// If recursionDepth === 1 (already rewritten), return null to prevent infinite loops
	logger.warn(`Failed to parse SIG: ${sig.substring(0, 50)}...`);
	return null;
}

