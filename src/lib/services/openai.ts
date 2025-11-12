/**
 * OpenAI API service wrapper for SIG parsing fallback.
 * Only used when regex parser confidence < 0.8.
 */

import { logger } from '$lib/utils/logger.js';
import { withRetry } from '$lib/utils/retry.js';
import { cache } from './cache.js';
import { deduplicate } from '$lib/utils/requestDeduplicator.js';
import { sigParseKey } from '$lib/constants/cacheKeys.js';
import { SIG_PARSE_TTL } from '$lib/constants/cacheTtl.js';
import type { ParsedSig } from '$lib/types/sig.js';
import { env } from '$env/dynamic/private';

const API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';
const TIMEOUT_MS = 10000; // 10 seconds
const MAX_TOKENS = 200;

/**
 * Normalize SIG text for cache key.
 */
function normalizeSig(sig: string): string {
	return sig.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Create prompt for SIG parsing.
 */
function createSigPrompt(sig: string): string {
	return `Parse the following prescription instruction (SIG) and return JSON.

Special dosage forms to recognize:
- Liquids: Extract volume (mL/L) and concentration if present (e.g., "5mg/mL")
- Insulin: Extract units and strength (U-100, U-200) if mentioned
- Inhalers: Extract actuations/puffs and canister capacity if mentioned

Return JSON format:
{
  "dosage": number,
  "frequency": number,
  "unit": string,
  "confidence": number,
  "dosageForm": "tablet" | "capsule" | "liquid" | "insulin" | "inhaler" | "other" (optional),
  "concentration": { "amount": number, "unit": string, "volume": number, "volumeUnit": string } | null (optional),
  "capacity": number | null (optional, for inhalers: actuations per canister),
  "insulinStrength": number | null (optional, for insulin: U-100 = 100)
}

SIG: "${sig}"

Return only valid JSON, no additional text.`;
}

/**
 * Create prompt for SIG rewriting/correction.
 */
function createRewritePrompt(sig: string): string {
	return `You are a medical prescription instruction (SIG) correction assistant. Your task is to correct and rewrite prescription instructions to fix typos, standardize medical terminology, and ensure they follow common prescription formats.

Rules:
- Convert written numbers to digits (e.g., "one" -> "1", "two" -> "2")
- Standardize frequency terms (e.g., "per day" -> "daily", "2x" -> "twice")
- Add missing units if implied (e.g., if no unit specified, assume "tablet" for oral medications)
- Standardize format to: "Take [number] [unit] [frequency] [optional: route/timing]"
- Keep the meaning exactly the same, only correct and standardize

Original SIG: "${sig}"

Return ONLY the corrected SIG text. Do not add explanations, formatting, or any other text.`;
}

/**
 * Fetch with timeout.
 */
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = TIMEOUT_MS): Promise<Response> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const response = await fetch(url, { ...options, signal: controller.signal });
		clearTimeout(timeoutId);
		return response;
	} catch (error) {
		clearTimeout(timeoutId);
		if (error instanceof Error && error.name === 'AbortError') {
			throw new Error('Request timeout');
		}
		throw error;
	}
}

/**
 * Parse JSON from response content (handles markdown code blocks).
 */
function parseJsonFromContent(content: string): ParsedSig {
	// Remove markdown code blocks if present
	let cleaned = content.trim();
	if (cleaned.startsWith('```')) {
		// Remove opening and closing code blocks
		cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
	}

	// Parse JSON
	const parsed = JSON.parse(cleaned) as Partial<ParsedSig>;

	// Validate required fields
	if (typeof parsed.dosage !== 'number') {
		throw new Error('Invalid response: dosage must be a number');
	}
	if (typeof parsed.frequency !== 'number') {
		throw new Error('Invalid response: frequency must be a number');
	}
	if (typeof parsed.unit !== 'string') {
		throw new Error('Invalid response: unit must be a string');
	}
	if (typeof parsed.confidence !== 'number') {
		throw new Error('Invalid response: confidence must be a number');
	}

	// Validate confidence range
	if (parsed.confidence < 0 || parsed.confidence > 1) {
		throw new Error('Invalid response: confidence must be between 0 and 1');
	}

	// Build result with optional fields
	const result: ParsedSig = {
		dosage: parsed.dosage,
		frequency: parsed.frequency,
		unit: parsed.unit,
		confidence: parsed.confidence,
	};

	// Add optional fields if present and valid
	if (parsed.dosageForm) {
		result.dosageForm = parsed.dosageForm;
	}
	if (parsed.concentration) {
		// Validate concentration structure
		if (
			typeof parsed.concentration.amount === 'number' &&
			typeof parsed.concentration.unit === 'string' &&
			typeof parsed.concentration.volume === 'number' &&
			typeof parsed.concentration.volumeUnit === 'string'
		) {
			result.concentration = parsed.concentration;
		}
	}
	if (typeof parsed.capacity === 'number' && parsed.capacity > 0) {
		result.capacity = parsed.capacity;
	}
	if (typeof parsed.insulinStrength === 'number' && parsed.insulinStrength > 0) {
		result.insulinStrength = parsed.insulinStrength;
	}

	return result;
}

/**
 * Parse SIG using OpenAI API.
 * @param sig - Prescription instruction text
 * @returns Parsed SIG with dosage, frequency, unit, and confidence
 */
export async function parseSig(sig: string): Promise<ParsedSig> {
	const normalizedSig = normalizeSig(sig);
	const cacheKey = sigParseKey(normalizedSig);

	return deduplicate(cacheKey, async () => {
		// Check cache
		const cached = await cache.get<ParsedSig>(cacheKey);
		if (cached) {
			logger.debug(`OpenAI cache hit: ${sig}`);
			return cached;
		}

		// Check for API key (use SvelteKit's env module)
		const apiKey = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
		if (!apiKey) {
			throw new Error('OPENAI_API_KEY environment variable is not set');
		}

		// Make API call
		try {
			const prompt = createSigPrompt(sig);
			const requestBody = {
				model: MODEL,
				messages: [
					{
						role: 'user' as const,
						content: prompt
					}
				],
				temperature: 0, // Deterministic
				max_tokens: MAX_TOKENS
			};

			logger.debug(`OpenAI API request for SIG: ${sig.substring(0, 50)}...`);

			const response = await withRetry(
				async () => {
					const res = await fetchWithTimeout(
						API_URL,
						{
							method: 'POST',
							headers: {
								'Content-Type': 'application/json',
								Authorization: `Bearer ${apiKey}`
							},
							body: JSON.stringify(requestBody)
						},
						TIMEOUT_MS
					);

					if (!res.ok) {
						if (res.status === 401) {
							throw new Error('Invalid OpenAI API key');
						}
						if (res.status === 429) {
							throw { status: 429, message: 'Rate limit exceeded' };
						}
						throw { status: res.status, message: `HTTP ${res.status}` };
					}

					return res;
				},
				{
					maxAttempts: 2, // Only 2 attempts for cost consideration
					initialDelayMs: 1000,
					maxDelayMs: 10000,
					backoffMultiplier: 2
				}
			);

			const data = (await response.json()) as {
				choices?: Array<{
					message?: {
						content?: string;
					};
				}>;
				error?: {
					message: string;
				};
			};

			if (data.error) {
				throw new Error(data.error.message || 'OpenAI API error');
			}

			const content = data.choices?.[0]?.message?.content;
			if (!content) {
				throw new Error('Invalid response: missing content');
			}

			// Parse and validate response
			const parsedSig = parseJsonFromContent(content);

			logger.info(`OpenAI parsed SIG: ${sig} -> ${JSON.stringify(parsedSig)}`);

			// Cache result
			await cache.set(cacheKey, parsedSig, SIG_PARSE_TTL);

			return parsedSig;
		} catch (error) {
			logger.error(`Error parsing SIG with OpenAI: ${sig}`, error as Error);
			throw error;
		}
	});
}

/**
 * Rewrite/correct SIG text using OpenAI API.
 * Used as a fallback when both regex and OpenAI parsers fail.
 * @param sig - Prescription instruction text
 * @returns Rewritten SIG text or null if rewrite fails
 */
export async function rewriteSig(sig: string): Promise<string | null> {
	if (!sig || typeof sig !== 'string') {
		return null;
	}

	const normalizedSig = normalizeSig(sig);
	if (!normalizedSig) {
		return null;
	}

	// Use prefix approach for cache key
	const cacheKey = `rewrite:${sigParseKey(normalizedSig)}`;

	return deduplicate(cacheKey, async () => {
		// Check cache first
		try {
			const cached = await cache.get<string>(cacheKey);
			if (cached) {
				logger.debug(`SIG rewrite cache hit: ${sig.substring(0, 50)}...`);
				return cached;
			}
		} catch (error) {
			// Cache error - log but continue without cache
			logger.warn('Cache error during rewrite lookup, continuing without cache', error as Error);
		}

		// Check for API key (use SvelteKit's env module)
		const apiKey = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
		if (!apiKey) {
			logger.warn(`[REWRITE] OPENAI_API_KEY not set, cannot rewrite SIG: "${sig}"`);
			return null;
		}
		logger.debug(`[REWRITE] API key found, proceeding with rewrite for: "${sig}"`);

		// Make API call
		try {
			const prompt = createRewritePrompt(sig);
			const requestBody = {
				model: MODEL,
				messages: [
					{
						role: 'user' as const,
						content: prompt
					}
				],
				temperature: 0, // Deterministic
				max_tokens: MAX_TOKENS
			};

			logger.info(`[REWRITE] Making OpenAI API request for SIG rewrite: "${sig}"`);
			logger.debug(`OpenAI API request for SIG rewrite: ${sig.substring(0, 50)}...`);

			const response = await withRetry(
				async () => {
					const res = await fetchWithTimeout(
						API_URL,
						{
							method: 'POST',
							headers: {
								'Content-Type': 'application/json',
								Authorization: `Bearer ${apiKey}`
							},
							body: JSON.stringify(requestBody)
						},
						TIMEOUT_MS
					);

					if (!res.ok) {
						if (res.status === 401) {
							throw new Error('Invalid OpenAI API key');
						}
						if (res.status === 429) {
							throw { status: 429, message: 'Rate limit exceeded' };
						}
						throw { status: res.status, message: `HTTP ${res.status}` };
					}

					return res;
				},
				{
					maxAttempts: 2, // Only 2 attempts for cost consideration
					initialDelayMs: 1000,
					maxDelayMs: 10000,
					backoffMultiplier: 2
				}
			);

			const data = (await response.json()) as {
				choices?: Array<{
					message?: {
						content?: string;
					};
				}>;
				error?: {
					message: string;
				};
			};

			if (data.error) {
				logger.error(`[REWRITE] OpenAI API error during rewrite for "${sig}": ${data.error.message}`);
				return null;
			}

			const content = data.choices?.[0]?.message?.content;
			if (!content) {
				logger.warn(`[REWRITE] OpenAI rewrite response missing content for: "${sig}"`);
				return null;
			}

			// Extract text response (not JSON)
			const rewrittenSig = content.trim();
			logger.info(`[REWRITE] OpenAI API response received: "${rewrittenSig}"`);

			// Validate response
			if (!rewrittenSig || rewrittenSig.length === 0) {
				logger.warn(`[REWRITE] OpenAI rewrite returned empty response for: "${sig}"`);
				return null;
			}

			// If rewritten SIG is identical to original, return null (no change)
			if (normalizeSig(rewrittenSig) === normalizedSig) {
				logger.info(`[REWRITE] SIG rewrite returned unchanged (normalized match): "${sig}" -> "${rewrittenSig}"`);
				return null;
			}

			logger.info(`[REWRITE] SIG rewritten successfully: "${sig}" -> "${rewrittenSig}"`);

			// Cache result with 30-day TTL
			try {
				await cache.set(cacheKey, rewrittenSig, SIG_PARSE_TTL);
			} catch (error) {
				// Cache error - log but continue
				logger.warn('Cache error during rewrite caching, continuing without cache', error as Error);
			}

			return rewrittenSig;
		} catch (error) {
			// Handle all errors gracefully - return null instead of throwing
			logger.error(`[REWRITE] Error rewriting SIG with OpenAI: "${sig}"`, error as Error);
			return null;
		}
	});
}

