import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { debounce } from '../../lib/utils/debounce';

describe('Debounce Utility', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	it('should delay function execution', () => {
		const fn = vi.fn();
		const debouncedFn = debounce(fn, 100);

		debouncedFn();
		expect(fn).not.toHaveBeenCalled();

		vi.advanceTimersByTime(100);
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it('should cancel previous calls if called again before delay', () => {
		const fn = vi.fn();
		const debouncedFn = debounce(fn, 100);

		debouncedFn();
		vi.advanceTimersByTime(50);
		debouncedFn();
		vi.advanceTimersByTime(50);
		expect(fn).not.toHaveBeenCalled();

		vi.advanceTimersByTime(50);
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it('should pass arguments to debounced function', () => {
		const fn = vi.fn();
		const debouncedFn = debounce(fn, 100);

		debouncedFn('arg1', 'arg2');
		vi.advanceTimersByTime(100);

		expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
	});

	it('should maintain function context', () => {
		const obj = {
			value: 42,
			fn: function (this: { value: number }) {
				return this.value;
			},
		};

		const debouncedFn = debounce(obj.fn, 100);
		const result = debouncedFn.call(obj);

		vi.advanceTimersByTime(100);
		expect(result).toBeUndefined(); // Debounced function returns void
	});
});

