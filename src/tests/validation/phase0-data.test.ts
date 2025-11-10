/**
 * Phase 0 Test Data Validation
 * Validates that test data files exist, are properly formatted, and meet minimum thresholds.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Phase 0 Test Data Validation', () => {
	const testDataDir = join(process.cwd(), 'test-data');

	describe('File Existence', () => {
		it('should have drug-samples.json', () => {
			const filePath = join(testDataDir, 'drug-samples.json');
			expect(() => readFileSync(filePath, 'utf-8')).not.toThrow();
		});

		it('should have sig-samples.json', () => {
			const filePath = join(testDataDir, 'sig-samples.json');
			expect(() => readFileSync(filePath, 'utf-8')).not.toThrow();
		});

		it('should have package-descriptions.json', () => {
			const filePath = join(testDataDir, 'package-descriptions.json');
			expect(() => readFileSync(filePath, 'utf-8')).not.toThrow();
		});

		it('should have ndc-samples.json', () => {
			const filePath = join(testDataDir, 'ndc-samples.json');
			expect(() => readFileSync(filePath, 'utf-8')).not.toThrow();
		});
	});

	describe('Drug Samples', () => {
		let drugSamples: unknown[];

		beforeAll(() => {
			const filePath = join(testDataDir, 'drug-samples.json');
			const content = readFileSync(filePath, 'utf-8');
			drugSamples = JSON.parse(content);
		});

		it('should have at least 10 drug samples', () => {
			expect(Array.isArray(drugSamples)).toBe(true);
			expect(drugSamples.length).toBeGreaterThanOrEqual(10);
		});

		it('should have valid drug sample structure', () => {
			if (drugSamples.length > 0) {
				const sample = drugSamples[0] as Record<string, unknown>;
				expect(sample).toHaveProperty('name');
				expect(typeof sample.name).toBe('string');
			}
		});
	});

	describe('SIG Samples', () => {
		let sigSamples: unknown[];

		beforeAll(() => {
			const filePath = join(testDataDir, 'sig-samples.json');
			const content = readFileSync(filePath, 'utf-8');
			sigSamples = JSON.parse(content);
		});

		it('should have at least 20 SIG samples', () => {
			expect(Array.isArray(sigSamples)).toBe(true);
			expect(sigSamples.length).toBeGreaterThanOrEqual(20);
		});

		it('should have valid SIG sample structure', () => {
			if (sigSamples.length > 0) {
				const sample = sigSamples[0] as Record<string, unknown>;
				expect(sample).toHaveProperty('sig');
				expect(typeof sample.sig).toBe('string');
			}
		});
	});

	describe('Package Descriptions', () => {
		let packageDescriptions: unknown[];

		beforeAll(() => {
			const filePath = join(testDataDir, 'package-descriptions.json');
			const content = readFileSync(filePath, 'utf-8');
			packageDescriptions = JSON.parse(content);
		});

		it('should have at least 30 package descriptions', () => {
			expect(Array.isArray(packageDescriptions)).toBe(true);
			expect(packageDescriptions.length).toBeGreaterThanOrEqual(30);
		});

		it('should have valid package description structure', () => {
			if (packageDescriptions.length > 0) {
				const sample = packageDescriptions[0] as Record<string, unknown>;
				expect(sample).toHaveProperty('description');
				expect(typeof sample.description).toBe('string');
			}
		});
	});

	describe('NDC Samples', () => {
		let ndcSamples: unknown[];

		beforeAll(() => {
			const filePath = join(testDataDir, 'ndc-samples.json');
			const content = readFileSync(filePath, 'utf-8');
			ndcSamples = JSON.parse(content);
		});

		it('should have NDC samples', () => {
			expect(Array.isArray(ndcSamples)).toBe(true);
			expect(ndcSamples.length).toBeGreaterThan(0);
		});

		it('should have valid NDC sample structure', () => {
			if (ndcSamples.length > 0) {
				const sample = ndcSamples[0] as Record<string, unknown>;
				expect(sample).toHaveProperty('ndc');
				expect(sample).toHaveProperty('normalized');
				expect(typeof sample.ndc).toBe('string');
				expect(typeof sample.normalized).toBe('string');
			}
		});
	});

	describe('JSON Validity', () => {
		it('should have valid JSON in all test data files', () => {
			const files = [
				'drug-samples.json',
				'sig-samples.json',
				'package-descriptions.json',
				'ndc-samples.json'
			];

			for (const file of files) {
				const filePath = join(testDataDir, file);
				expect(() => {
					const content = readFileSync(filePath, 'utf-8');
					JSON.parse(content);
				}).not.toThrow(`File ${file} should be valid JSON`);
			}
		});
	});
});

