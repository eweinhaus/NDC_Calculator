import { describe, it, expect } from 'vitest';
import { normalizeNdc, to10DigitNdc, isValidNdc } from '$lib/utils/ndcNormalizer';

describe('normalizeNdc', () => {
	it('should normalize 10-digit format without dashes', () => {
		expect(normalizeNdc('00002322730')).toBe('00002-3227-30');
	});

	it('should normalize 11-digit format with dashes (no change)', () => {
		expect(normalizeNdc('00002-3227-30')).toBe('00002-3227-30');
	});

	it('should add leading zeros to short labeler', () => {
		expect(normalizeNdc('2-3227-30')).toBe('00002-3227-30');
	});

	it('should handle 10-digit format without dashes', () => {
		expect(normalizeNdc('2322730')).toBe('00002-3227-30');
	});

	it('should handle 11-digit format without dashes', () => {
		expect(normalizeNdc('00002322730')).toBe('00002-3227-30');
	});

	it('should handle various dash placements', () => {
		expect(normalizeNdc('00002-322730')).toBe('00002-3227-30');
		expect(normalizeNdc('000023227-30')).toBe('00002-3227-30');
	});

	it('should return null for empty string', () => {
		expect(normalizeNdc('')).toBeNull();
	});

	it('should return null for invalid length (too short)', () => {
		expect(normalizeNdc('12345')).toBeNull();
	});

	it('should return null for invalid length (too long)', () => {
		expect(normalizeNdc('000023227301')).toBeNull();
	});

	it('should return null for non-numeric characters', () => {
		expect(normalizeNdc('abc-123-45')).toBeNull();
		expect(normalizeNdc('00002-3227-3a')).toBeNull();
	});

	it('should handle whitespace', () => {
		expect(normalizeNdc(' 00002-3227-30 ')).toBe('00002-3227-30');
	});

	it('should return null for null or undefined', () => {
		expect(normalizeNdc(null as unknown as string)).toBeNull();
		expect(normalizeNdc(undefined as unknown as string)).toBeNull();
	});
});

describe('to10DigitNdc', () => {
	it('should convert 11-digit format to 10-digit', () => {
		expect(to10DigitNdc('00002-3227-30')).toBe('00002322730');
	});

	it('should handle 10-digit input', () => {
		expect(to10DigitNdc('00002322730')).toBe('00002322730');
	});

	it('should return null for invalid NDC', () => {
		expect(to10DigitNdc('invalid')).toBeNull();
		expect(to10DigitNdc('')).toBeNull();
	});
});

describe('isValidNdc', () => {
	it('should return true for valid NDCs', () => {
		expect(isValidNdc('00002-3227-30')).toBe(true);
		expect(isValidNdc('00002322730')).toBe(true);
		expect(isValidNdc('2-3227-30')).toBe(true);
	});

	it('should return false for invalid NDCs', () => {
		expect(isValidNdc('')).toBe(false);
		expect(isValidNdc('invalid')).toBe(false);
		expect(isValidNdc('12345')).toBe(false);
		expect(isValidNdc('000023227301')).toBe(false);
	});
});

