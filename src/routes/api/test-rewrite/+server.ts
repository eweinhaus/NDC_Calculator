import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { rewriteSig } from '$lib/services/openai';
import { logger } from '$lib/utils/logger';
import { env } from '$env/dynamic/private';

/**
 * GET /api/test-rewrite
 * Test endpoint for SIG rewrite function
 * Query params: sig (the SIG to test)
 */
export const GET: RequestHandler = async ({ url }) => {
	const sig = url.searchParams.get('sig') || 'Take one per day';
	const apiKey = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
	const hasApiKey = !!apiKey;

	logger.info(`[TEST-REWRITE] Testing rewrite for: "${sig}"`);
	logger.info(`[TEST-REWRITE] OPENAI_API_KEY is ${hasApiKey ? 'SET' : 'NOT SET'}`);
	if (hasApiKey) {
		logger.info(`[TEST-REWRITE] API key length: ${apiKey?.length || 0} characters`);
		logger.info(`[TEST-REWRITE] API key starts with: ${apiKey?.substring(0, 7) || 'N/A'}...`);
	} else {
		logger.warn(`[TEST-REWRITE] All env vars: ${JSON.stringify(Object.keys(process.env).filter(k => k.includes('OPENAI') || k.includes('API')))}`);
	}

	try {
		const rewritten = await rewriteSig(sig);

		if (rewritten) {
			logger.info(`[TEST-REWRITE] Success: "${sig}" -> "${rewritten}"`);
			return json({
				success: true,
				original: sig,
				rewritten: rewritten,
				changed: rewritten.trim() !== sig.trim(),
				apiKeySet: hasApiKey,
			});
		} else {
			// Rewrite returned null - this is expected when SIG is already correct
			logger.info(`[TEST-REWRITE] Rewrite returned null for "${sig}" - no change needed`);
			return json({
				success: false,
				original: sig,
				rewritten: null,
				apiKeySet: hasApiKey,
				error: hasApiKey
					? 'No rewrite needed - SIG is already in correct format'
					: 'OPENAI_API_KEY environment variable is not set. Please set it to enable rewrite functionality.',
			});
		}
	} catch (error) {
		logger.error(`[TEST-REWRITE] Error testing rewrite for "${sig}"`, error as Error);
		return json({
			success: false,
			original: sig,
			rewritten: null,
			apiKeySet: hasApiKey,
			error: error instanceof Error ? error.message : 'Unknown error',
		});
	}
};

