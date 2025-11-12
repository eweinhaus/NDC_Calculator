/**
 * API endpoint for NDC code autocomplete suggestions
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { getNdcAutocompleteSuggestions } from '$lib/services/fda.js';
import { logger } from '$lib/utils/logger.js';

export const GET: RequestHandler = async ({ url }) => {
	const query = url.searchParams.get('q');

	if (!query || query.trim().length < 2) {
		return json({ suggestions: [] });
	}

	try {
		const suggestions = await getNdcAutocompleteSuggestions(query.trim());
		return json({ suggestions });
	} catch (error) {
		logger.error('Error fetching NDC autocomplete suggestions', error as Error);
		// Return empty array on error (don't expose error details to client)
		return json({ suggestions: [] });
	}
};

