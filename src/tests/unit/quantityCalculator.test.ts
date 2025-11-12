import { describe, it, expect } from 'vitest';
import { calculate } from '../../lib/core/quantityCalculator';
import { ParsedSig } from '../../lib/types/sig';

describe('Quantity Calculator', () => {
	describe('calculate()', () => {
		it('should calculate normal quantity correctly', () => {
			const parsedSig: ParsedSig = {
				dosage: 2,
				frequency: 3,
				unit: 'tablet',
				confidence: 0.9,
			};

			const result = calculate(parsedSig, 30);
			expect(result.total).toBe(180); // (2 × 3) × 30 = 180
			expect(result.unit).toBe('tablet');
			expect(result.calculation.dosage).toBe(2);
			expect(result.calculation.frequency).toBe(3);
			expect(result.calculation.daysSupply).toBe(30);
		});

		it('should handle PRN medications (frequency = 0)', () => {
			const parsedSig: ParsedSig = {
				dosage: 1,
				frequency: 0, // PRN
				unit: 'tablet',
				confidence: 0.8,
			};

			const result = calculate(parsedSig, 30);
			expect(result.total).toBe(30); // 1 × 30 = 30 (assume once per day)
			expect(result.unit).toBe('tablet');
			expect(result.calculation.frequency).toBe(1); // Shows assumed frequency
		});

		it('should handle fractional dosages', () => {
			const parsedSig: ParsedSig = {
				dosage: 1.5,
				frequency: 2,
				unit: 'tablet',
				confidence: 0.9,
			};

			const result = calculate(parsedSig, 30);
			expect(result.total).toBe(90); // (1.5 × 2) × 30 = 90
		});

		it('should round tablets to nearest integer', () => {
			const parsedSig: ParsedSig = {
				dosage: 1.5,
				frequency: 1,
				unit: 'tablet',
				confidence: 0.9,
			};

			const result = calculate(parsedSig, 30);
			expect(result.total).toBe(45); // (1.5 × 1) × 30 = 45 (already integer)
			
			// Test with actual fractional result
			const parsedSig2: ParsedSig = {
				dosage: 1.5,
				frequency: 1,
				unit: 'tablet',
				confidence: 0.9,
			};

			const result2 = calculate(parsedSig2, 31);
			expect(result2.total).toBe(47); // (1.5 × 1) × 31 = 46.5 → rounded to 47
		});

		it('should round liquids to 2 decimal places', () => {
			const parsedSig: ParsedSig = {
				dosage: 5,
				frequency: 3,
				unit: 'mL',
				confidence: 0.9,
			};

			const result = calculate(parsedSig, 10);
			expect(result.total).toBe(150); // (5 × 3) × 10 = 150
			// Test with fractional result
			const parsedSig2: ParsedSig = {
				dosage: 2.5,
				frequency: 2,
				unit: 'mL',
				confidence: 0.9,
			};

			const result2 = calculate(parsedSig2, 7);
			expect(result2.total).toBe(35); // (2.5 × 2) × 7 = 35
		});

		it('should handle very large quantities', () => {
			const parsedSig: ParsedSig = {
				dosage: 1,
				frequency: 1,
				unit: 'tablet',
				confidence: 0.9,
			};

			const result = calculate(parsedSig, 365);
			expect(result.total).toBe(365); // (1 × 1) × 365 = 365
		});

		it('should preserve unit from parsed SIG', () => {
			const testCases = [
				{ unit: 'tablet', expected: 'tablet' },
				{ unit: 'capsule', expected: 'capsule' },
				{ unit: 'mL', expected: 'mL' },
				{ unit: 'unit', expected: 'unit' },
			];

			for (const testCase of testCases) {
				const parsedSig: ParsedSig = {
					dosage: 1,
					frequency: 1,
					unit: testCase.unit,
					confidence: 0.9,
				};

				const result = calculate(parsedSig, 30);
				expect(result.unit).toBe(testCase.expected);
			}
		});

		it('should throw error for invalid inputs', () => {
			const validSig: ParsedSig = {
				dosage: 1,
				frequency: 1,
				unit: 'tablet',
				confidence: 0.9,
			};

			expect(() => calculate(null as any, 30)).toThrow('parsedSig is required');
			expect(() => calculate(validSig, 0)).toThrow('daysSupply must be a positive number');
			expect(() => calculate(validSig, -1)).toThrow('daysSupply must be a positive number');
			expect(() => {
				calculate({ ...validSig, dosage: 0 }, 30);
			}).toThrow('parsedSig.dosage must be a positive number');
			expect(() => {
				calculate({ ...validSig, frequency: -1 }, 30);
			}).toThrow('parsedSig.frequency must be a non-negative number');
		});

		it('should handle various frequency values', () => {
			const testCases = [
				{ frequency: 1, daysSupply: 30, expected: 30 },
				{ frequency: 2, daysSupply: 30, expected: 60 },
				{ frequency: 3, daysSupply: 30, expected: 90 },
				{ frequency: 4, daysSupply: 30, expected: 120 },
			];

			for (const testCase of testCases) {
				const parsedSig: ParsedSig = {
					dosage: 1,
					frequency: testCase.frequency,
					unit: 'tablet',
					confidence: 0.9,
				};

				const result = calculate(parsedSig, testCase.daysSupply);
				expect(result.total).toBe(testCase.expected);
			}
		});

		it('should handle various days supply values', () => {
			const parsedSig: ParsedSig = {
				dosage: 1,
				frequency: 2,
				unit: 'tablet',
				confidence: 0.9,
			};

			const testCases = [
				{ daysSupply: 7, expected: 14 },
				{ daysSupply: 30, expected: 60 },
				{ daysSupply: 90, expected: 180 },
				{ daysSupply: 365, expected: 730 },
			];

			for (const testCase of testCases) {
				const result = calculate(parsedSig, testCase.daysSupply);
				expect(result.total).toBe(testCase.expected);
			}
		});

		describe('special dosage forms', () => {
			describe('liquids with concentration', () => {
				it('should calculate liquid quantity with concentration', () => {
					const parsedSig: ParsedSig = {
						dosage: 5, // 5mg
						frequency: 2,
						unit: 'mg',
						confidence: 0.9,
						dosageForm: 'liquid',
						concentration: {
							amount: 5, // 5mg
							unit: 'mg',
							volume: 1, // 1mL
							volumeUnit: 'mL',
						},
					};

					const result = calculate(parsedSig, 30);
					// Volume per dose: 5mg / 5mg/mL = 1mL
					// Daily volume: 1mL × 2 = 2mL
					// Total: 2mL × 30 = 60mL
					expect(result.total).toBe(60);
					expect(result.unit).toBe('mL');
				});

				it('should handle liquid without concentration (fallback)', () => {
					const parsedSig: ParsedSig = {
						dosage: 5,
						frequency: 2,
						unit: 'mL',
						confidence: 0.9,
						dosageForm: 'liquid',
					};

					const result = calculate(parsedSig, 30);
					// Normal calculation: (5 × 2) × 30 = 300
					expect(result.total).toBe(300);
					expect(result.unit).toBe('mL');
				});
			});

			describe('inhalers with capacity', () => {
				it('should calculate inhaler quantity with capacity', () => {
					const parsedSig: ParsedSig = {
						dosage: 2,
						frequency: 2,
						unit: 'actuation',
						confidence: 0.9,
						dosageForm: 'inhaler',
						capacity: 200, // 200 actuations per canister
					};

					const result = calculate(parsedSig, 30);
					// Total actuations: (2 × 2) × 30 = 120
					// Canisters needed: ceil(120 / 200) = 1
					expect(result.total).toBe(120);
					expect(result.unit).toBe('actuation');
				});

				it('should calculate canisters needed for large quantity', () => {
					const parsedSig: ParsedSig = {
						dosage: 2,
						frequency: 2,
						unit: 'actuation',
						confidence: 0.9,
						dosageForm: 'inhaler',
						capacity: 72, // 72 actuations per canister
					};

					const result = calculate(parsedSig, 30);
					// Total actuations: (2 × 2) × 30 = 120
					// Canisters needed: ceil(120 / 72) = 2
					expect(result.total).toBe(120);
					expect(result.unit).toBe('actuation');
				});

				it('should handle inhaler without capacity (fallback)', () => {
					const parsedSig: ParsedSig = {
						dosage: 2,
						frequency: 2,
						unit: 'actuation',
						confidence: 0.9,
						dosageForm: 'inhaler',
					};

					const result = calculate(parsedSig, 30);
					// Normal calculation: (2 × 2) × 30 = 120
					expect(result.total).toBe(120);
					expect(result.unit).toBe('actuation');
				});
			});

			describe('backward compatibility', () => {
				it('should work with existing ParsedSig (no special form fields)', () => {
					const parsedSig: ParsedSig = {
						dosage: 1,
						frequency: 2,
						unit: 'tablet',
						confidence: 0.9,
					};

					const result = calculate(parsedSig, 30);
					expect(result.total).toBe(60);
					expect(result.unit).toBe('tablet');
				});
			});
		});
	});
});

