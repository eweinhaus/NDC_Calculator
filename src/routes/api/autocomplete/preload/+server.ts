/**
 * API endpoint for preloading common drug names and NDC codes.
 * Returns a curated list for client-side autocomplete filtering.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { logger } from '$lib/utils/logger.js';

/**
 * Common drug names (top prescribed medications).
 * This list can be expanded with more common drugs.
 */
const COMMON_DRUGS = [
	'Lisinopril',
	'Metformin Hydrochloride',
	'Atorvastatin',
	'Gabapentin',
	'Prednisone',
	'Methylprednisolone',
	'Amlodipine',
	'Omeprazole',
	'Metoprolol',
	'Losartan',
	'Albuterol',
	'Furosemide',
	'Levothyroxine',
	'Atenolol',
	'Hydrochlorothiazide',
	'Simvastatin',
	'Pantoprazole',
	'Tramadol',
	'Carvedilol',
	'Sertraline',
	'Fluoxetine',
	'Citalopram',
	'Warfarin',
	'Clopidogrel',
	'Acetaminophen',
	'Ibuprofen',
	'Naproxen',
	'Aspirin',
	'Doxycycline',
	'Amoxicillin',
	'Azithromycin',
	'Ciprofloxacin',
	'Levofloxacin',
	'Cephalexin',
	'Clindamycin',
	'Metronidazole',
	'Trimethoprim',
	'Sulfamethoxazole',
	'Prednisolone',
	'Dexamethasone',
	'Insulin',
	'Glipizide',
	'Glyburide',
	'Pioglitazone',
	'Rosiglitazone',
	'Sitagliptin',
	'Canagliflozin',
	'Empagliflozin',
	'Dapagliflozin'
];

/**
 * Load drug names from test data file.
 */
function loadDrugsFromTestData(): string[] {
	try {
		const testDataPath = join(process.cwd(), 'test-data', 'drug-samples.json');
		const fileContent = readFileSync(testDataPath, 'utf-8');
		const drugs = JSON.parse(fileContent) as Array<{ name: string }>;
		return drugs.map((d) => d.name).filter((name, index, self) => self.indexOf(name) === index);
	} catch (error) {
		logger.warn('Failed to load drugs from test data', error as Error);
		return [];
	}
}

/**
 * Load NDC codes from test data file.
 */
function loadNdcsFromTestData(): string[] {
	try {
		const testDataPath = join(process.cwd(), 'test-data', 'ndc-samples.json');
		const fileContent = readFileSync(testDataPath, 'utf-8');
		const ndcs = JSON.parse(fileContent) as Array<{ ndc: string; normalized?: string }>;
		// Use normalized if available, otherwise use original
		return ndcs.map((n) => n.normalized || n.ndc).filter((ndc, index, self) => self.indexOf(ndc) === index);
	} catch (error) {
		logger.warn('Failed to load NDCs from test data', error as Error);
		return [];
	}
}

/**
 * Load NDC codes from drug samples (extract from ndcs arrays).
 */
function loadNdcsFromDrugSamples(): string[] {
	try {
		const testDataPath = join(process.cwd(), 'test-data', 'drug-samples.json');
		const fileContent = readFileSync(testDataPath, 'utf-8');
		const drugs = JSON.parse(fileContent) as Array<{ ndcs?: string[] }>;
		const ndcs: string[] = [];
		for (const drug of drugs) {
			if (drug.ndcs && Array.isArray(drug.ndcs)) {
				ndcs.push(...drug.ndcs);
			}
		}
		return ndcs.filter((ndc, index, self) => self.indexOf(ndc) === index);
	} catch (error) {
		logger.warn('Failed to load NDCs from drug samples', error as Error);
		return [];
	}
}

/**
 * Generate preload data by combining test data and common drugs/NDCs.
 */
function generatePreloadData(): { drugs: string[]; ndcs: string[] } {
	// Combine common drugs with test data
	const testDrugs = loadDrugsFromTestData();
	const allDrugs = [...new Set([...COMMON_DRUGS, ...testDrugs])].sort();

	// Combine NDCs from multiple sources
	const testNdcs = loadNdcsFromTestData();
	const drugSampleNdcs = loadNdcsFromDrugSamples();
	const allNdcs = [...new Set([...testNdcs, ...drugSampleNdcs])].sort();

	logger.info(`Generated preload data: ${allDrugs.length} drugs, ${allNdcs.length} NDCs`);

	return {
		drugs: allDrugs,
		ndcs: allNdcs
	};
}

/**
 * Cache the preload data in memory (static data, doesn't change often).
 */
let cachedPreloadData: { drugs: string[]; ndcs: string[] } | null = null;

export const GET: RequestHandler = async () => {
	try {
		// Use cached data if available (regenerate on server restart)
		if (!cachedPreloadData) {
			cachedPreloadData = generatePreloadData();
		}

		return json(cachedPreloadData);
	} catch (error) {
		logger.error('Error generating preload data', error as Error);
		// Return empty arrays on error (fallback to API)
		return json({ drugs: [], ndcs: [] });
	}
};

