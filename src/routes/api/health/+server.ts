import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const startTime = Date.now();
const version = '1.0.0'; // TODO: Read from package.json in production

/**
 * GET /api/health
 * Health check endpoint for deployment monitoring
 */
export const GET: RequestHandler = async () => {
	const uptime = Math.floor((Date.now() - startTime) / 1000);

	// Determine status (for now, always healthy)
	// In production, you might check database connections, external APIs, etc.
	const status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

	const response = {
		status,
		timestamp: new Date().toISOString(),
		version,
		uptime
	};

	// Return appropriate status code
	const statusCode = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503;

	return json(response, { status: statusCode });
};
