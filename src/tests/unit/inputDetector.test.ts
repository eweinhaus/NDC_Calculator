/**
 * Unit tests for input type detector utility
 */

import { describe, it, expect } from 'vitest';
import { detectInputType } from '../../lib/utils/inputDetector.js';

describe('Input Type Detector', () => {
	describe('NDC Detection', () => {
		it('should detect NDC starting with digits', () => {
			expect(detectInputType('76420')).toBe('ndc');
			expect(detectInputType('00002')).toBe('ndc');
			expect(detectInputType('12345')).toBe('ndc');
		});

		it('should detect NDC with dashes', () => {
			expect(detectInputType('76420-345')).toBe('ndc');
			expect(detectInputType('00002-3227')).toBe('ndc');
			expect(detectInputType('76420-345-00')).toBe('ndc');
		});

		it('should detect partial NDC codes', () => {
			expect(detectInputType('764')).toBe('ndc');
			expect(detectInputType('00002-')).toBe('ndc');
			expect(detectInputType('76420-3')).toBe('ndc');
		});

		it('should detect NDC with leading zeros', () => {
			expect(detectInputType('00002')).toBe('ndc');
			expect(detectInputType('00002-3227')).toBe('ndc');
		});
	});

	describe('Drug Name Detection', () => {
		it('should detect drug names starting with letters', () => {
			expect(detectInputType('Lisinopril')).toBe('drug');
			expect(detectInputType('Aspirin')).toBe('drug');
			expect(detectInputType('Metformin')).toBe('drug');
		});

		it('should detect lowercase drug names', () => {
			expect(detectInputType('lisinopril')).toBe('drug');
			expect(detectInputType('aspirin')).toBe('drug');
		});

		it('should detect drug names with numbers but no dashes (common pattern)', () => {
			expect(detectInputType('2mg')).toBe('drug');
			expect(detectInputType('3ml')).toBe('drug');
			expect(detectInputType('10mg')).toBe('drug');
			expect(detectInputType('50mg')).toBe('drug');
		});
	});

	describe('Edge Cases', () => {
		it('should return unknown for empty string', () => {
			expect(detectInputType('')).toBe('unknown');
			expect(detectInputType('   ')).toBe('unknown');
		});

		it('should return unknown for null or undefined', () => {
			expect(detectInputType(null as any)).toBe('unknown');
			expect(detectInputType(undefined as any)).toBe('unknown');
		});

		it('should handle special characters', () => {
			// Special characters alone are unknown
			expect(detectInputType('-')).toBe('unknown');
			expect(detectInputType('@')).toBe('unknown');
		});

		it('should handle mixed input', () => {
			// Mixed input with dashes and digits is likely NDC
			expect(detectInputType('-76420')).toBe('ndc');
		});
	});

	describe('Real-world Examples', () => {
		it('should correctly identify common NDC formats', () => {
			expect(detectInputType('76420-345-00')).toBe('ndc');
			expect(detectInputType('00002-3227-30')).toBe('ndc');
			expect(detectInputType('00002322730')).toBe('ndc');
			expect(detectInputType('76420')).toBe('ndc');
		});

		it('should correctly identify common drug name patterns', () => {
			expect(detectInputType('Lisinopril 10mg')).toBe('drug');
			expect(detectInputType('Aspirin 81mg')).toBe('drug');
			expect(detectInputType('Metformin')).toBe('drug');
		});
	});
});

