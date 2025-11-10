import { describe, it, expect, vi, beforeEach } from 'vitest';
import { copyToClipboard } from '../../lib/utils/clipboard';

describe('Clipboard Utility', () => {
	beforeEach(() => {
		// Mock navigator.clipboard using Object.defineProperty
		Object.defineProperty(global, 'navigator', {
			value: {
				clipboard: {
					writeText: vi.fn().mockResolvedValue(undefined),
				},
			},
			writable: true,
			configurable: true,
		});
	});

	it('should copy text using Clipboard API', async () => {
		const text = 'test-ndc-code';
		const result = await copyToClipboard(text);

		expect(result).toBe(true);
		expect(navigator.clipboard.writeText).toHaveBeenCalledWith(text);
	});

	it('should return false for empty text', async () => {
		const result = await copyToClipboard('');
		expect(result).toBe(false);
	});
});
