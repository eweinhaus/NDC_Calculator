/**
 * API endpoint for drug name autocomplete suggestions
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { getAutocompleteSuggestions } from '$lib/services/rxnorm.js';
import { logger } from '$lib/utils/logger.js';

export const GET: RequestHandler = async ({ url }) => {
	const query = url.searchParams.get('q');

	if (!query || query.trim().length < 3) {
		return json({ suggestions: [] });
	}

	try {
		const suggestions = await getAutocompleteSuggestions(query.trim());
		return json({ suggestions });
	} catch (error) {
		logger.error('Error fetching autocomplete suggestions', error as Error);
		// Return empty array on error (don't expose error details to client)
		return json({ suggestions: [] });
	}
};

