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
	return `Parse the following prescription instruction (SIG) and return JSON:
{dosage: number, frequency: number, unit: string, confidence: number}

SIG: "${sig}"

Return only valid JSON, no additional text.`;
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

	return {
		dosage: parsed.dosage,
		frequency: parsed.frequency,
		unit: parsed.unit,
		confidence: parsed.confidence
	};
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

		// Check for API key
		const apiKey = process.env.OPENAI_API_KEY;
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

