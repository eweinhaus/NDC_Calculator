/**
 * Integration tests for NDC autocomplete API endpoint
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { GET } from '../../routes/api/autocomplete/ndc/+server.js';
import type { RequestEvent } from '@sveltejs/kit';

describe('NDC Autocomplete API Endpoint', () => {
	describe('GET /api/autocomplete/ndc', () => {
		it('should return empty array for queries less than 2 characters', async () => {
			const url = new URL('http://localhost/api/autocomplete/ndc?q=1');
			const event = {
				url
			} as RequestEvent;

			const response = await GET(event);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data).toEqual({ suggestions: [] });
		});

		it('should return empty array for empty query', async () => {
			const url = new URL('http://localhost/api/autocomplete/ndc?q=');
			const event = {
				url
			} as RequestEvent;

			const response = await GET(event);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data).toEqual({ suggestions: [] });
		});

		it('should return suggestions for valid NDC query', async () => {
			const url = new URL('http://localhost/api/autocomplete/ndc?q=76420');
			const event = {
				url
			} as RequestEvent;

			const response = await GET(event);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data).toHaveProperty('suggestions');
			expect(Array.isArray(data.suggestions)).toBe(true);
			// May be empty if no results, but should not error
		}, 30000); // 30 second timeout for API call

		it('should handle errors gracefully', async () => {
			// Test with invalid query that might cause issues
			const url = new URL('http://localhost/api/autocomplete/ndc?q=999999999999');
			const event = {
				url
			} as RequestEvent;

			const response = await GET(event);
			const data = await response.json();

			// Should return 200 with empty array, not throw error
			expect(response.status).toBe(200);
			expect(data).toHaveProperty('suggestions');
			expect(Array.isArray(data.suggestions)).toBe(true);
		}, 30000);
	});
});

