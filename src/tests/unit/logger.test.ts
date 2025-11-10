import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Logger } from '$lib/utils/logger';

describe('Logger', () => {
	let logger: Logger;
	let consoleLogSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		logger = new Logger('test-service');
		consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
		process.env.NODE_ENV = 'test';
		process.env.LOG_LEVEL = undefined;
	});

	afterEach(() => {
		consoleLogSpy.mockRestore();
		vi.restoreAllMocks();
	});

	describe('log levels', () => {
		it('should log debug messages in development', () => {
			process.env.NODE_ENV = 'development';
			logger = new Logger('test');
			logger.debug('Debug message');
			expect(consoleLogSpy).toHaveBeenCalled();
		});

		it('should not log debug messages when level is info', () => {
			process.env.LOG_LEVEL = 'info';
			logger = new Logger('test');
			logger.debug('Debug message');
			expect(consoleLogSpy).not.toHaveBeenCalled();
		});

		it('should log info messages', () => {
			logger.info('Info message');
			expect(consoleLogSpy).toHaveBeenCalled();
		});

		it('should log warn messages', () => {
			logger.warn('Warning message');
			expect(consoleLogSpy).toHaveBeenCalled();
		});

		it('should log error messages', () => {
			logger.error('Error message');
			expect(consoleLogSpy).toHaveBeenCalled();
		});
	});

	describe('log format', () => {
		it('should include timestamp, level, message, and service', () => {
			logger.info('Test message');
			const call = consoleLogSpy.mock.calls[0][0];
			const logEntry = JSON.parse(call);
			expect(logEntry).toHaveProperty('timestamp');
			expect(logEntry).toHaveProperty('level', 'info');
			expect(logEntry).toHaveProperty('message', 'Test message');
			expect(logEntry).toHaveProperty('service', 'test-service');
		});

		it('should include context when provided', () => {
			logger.info('Test message', undefined, { requestId: '123', userId: 'user1' });
			const call = consoleLogSpy.mock.calls[0][0];
			const logEntry = JSON.parse(call);
			expect(logEntry.context).toEqual({ requestId: '123', userId: 'user1' });
		});

		it('should include error details when error provided', () => {
			const testError = new Error('Test error');
			logger.error('Error occurred', testError);
			const call = consoleLogSpy.mock.calls[0][0];
			const logEntry = JSON.parse(call);
			expect(logEntry.error).toHaveProperty('name', 'Error');
			expect(logEntry.error).toHaveProperty('message', 'Test error');
		});

		it('should include stack trace in development', () => {
			process.env.NODE_ENV = 'development';
			logger = new Logger('test');
			const testError = new Error('Test error');
			logger.error('Error occurred', testError);
			const call = consoleLogSpy.mock.calls[0][0];
			const logEntry = JSON.parse(call);
			expect(logEntry.error).toHaveProperty('stack');
		});

		it('should not include stack trace in production', () => {
			process.env.NODE_ENV = 'production';
			logger = new Logger('test');
			const testError = new Error('Test error');
			logger.error('Error occurred', testError);
			const call = consoleLogSpy.mock.calls[0][0];
			const logEntry = JSON.parse(call);
			expect(logEntry.error).not.toHaveProperty('stack');
		});
	});

	describe('output format', () => {
		it('should pretty-print JSON in development', () => {
			process.env.NODE_ENV = 'development';
			logger = new Logger('test');
			logger.info('Test message');
			const call = consoleLogSpy.mock.calls[0][0];
			// Pretty-printed JSON has newlines
			expect(call).toContain('\n');
		});

		it('should output single-line JSON in production', () => {
			process.env.NODE_ENV = 'production';
			logger = new Logger('test');
			logger.info('Test message');
			const call = consoleLogSpy.mock.calls[0][0];
			// Single-line JSON has no newlines
			expect(call).not.toContain('\n');
		});
	});

	describe('context service override', () => {
		it('should use context service if provided', () => {
			logger.info('Test message', undefined, { service: 'custom-service' });
			const call = consoleLogSpy.mock.calls[0][0];
			const logEntry = JSON.parse(call);
			expect(logEntry.service).toBe('custom-service');
			// Context should be undefined when only service is provided (it gets removed)
			expect(logEntry.context).toBeUndefined();
		});
	});

	describe('log level filtering', () => {
		it('should filter debug when level is warn', () => {
			process.env.LOG_LEVEL = 'warn';
			logger = new Logger('test');
			logger.debug('Debug message');
			logger.info('Info message');
			expect(consoleLogSpy).not.toHaveBeenCalled();
		});

		it('should allow warn and error when level is warn', () => {
			process.env.LOG_LEVEL = 'warn';
			logger = new Logger('test');
			logger.warn('Warning message');
			logger.error('Error message');
			expect(consoleLogSpy).toHaveBeenCalledTimes(2);
		});
	});
});

