/**
 * Structured logging system for the NDC Calculator application.
 * Provides JSON logging with levels, context, and production-ready formatting.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
	requestId?: string;
	userId?: string;
	service?: string;
	[key: string]: unknown;
}

interface LogEntry {
	timestamp: string;
	level: LogLevel;
	message: string;
	service: string;
	context?: LogContext;
	error?: {
		name: string;
		message: string;
		stack?: string;
		[key: string]: unknown;
	};
}

/**
 * Logger class for structured JSON logging.
 */
export class Logger {
	private serviceName: string;
	private logLevel: LogLevel;
	private isDevelopment: boolean;

	constructor(serviceName: string = 'ndc-calculator') {
		this.serviceName = serviceName;
		this.isDevelopment = process.env.NODE_ENV !== 'production';
		this.logLevel = this.getLogLevel();
	}

	/**
	 * Get log level from environment variable or default.
	 */
	private getLogLevel(): LogLevel {
		const envLevel = process.env.LOG_LEVEL?.toLowerCase();
		if (envLevel === 'debug' || envLevel === 'info' || envLevel === 'warn' || envLevel === 'error') {
			return envLevel;
		}
		return this.isDevelopment ? 'debug' : 'info';
	}

	/**
	 * Check if a log level should be output.
	 */
	private shouldLog(level: LogLevel): boolean {
		const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
		const currentLevelIndex = levels.indexOf(this.logLevel);
		const messageLevelIndex = levels.indexOf(level);
		return messageLevelIndex >= currentLevelIndex;
	}

	/**
	 * Format error object for logging.
	 */
	private formatError(error: Error): LogEntry['error'] {
		return {
			name: error.name,
			message: error.message,
			stack: this.isDevelopment ? error.stack : undefined,
			...(error as Record<string, unknown>)
		};
	}

	/**
	 * Create log entry object.
	 */
	private createLogEntry(
		level: LogLevel,
		message: string,
		error?: Error,
		context?: LogContext
	): LogEntry {
		const entry: LogEntry = {
			timestamp: new Date().toISOString(),
			level,
			message,
			service: context?.service || this.serviceName,
			context: context ? { ...context } : undefined
		};

		if (error) {
			entry.error = this.formatError(error);
		}

		// Remove service from context if it's already in the entry
		if (entry.context && 'service' in entry.context) {
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { service, ...restContext } = entry.context;
			entry.context = Object.keys(restContext).length > 0 ? restContext : undefined;
		}

		return entry;
	}

	/**
	 * Output log entry to console.
	 */
	private output(entry: LogEntry): void {
		if (!this.shouldLog(entry.level)) {
			return;
		}

		if (this.isDevelopment) {
			// Pretty-print JSON in development
			console.log(JSON.stringify(entry, null, 2));
		} else {
			// Single-line JSON in production
			console.log(JSON.stringify(entry));
		}
	}

	/**
	 * Log debug message.
	 */
	debug(message: string, error?: Error, context?: LogContext): void {
		this.output(this.createLogEntry('debug', message, error, context));
	}

	/**
	 * Log info message.
	 */
	info(message: string, error?: Error, context?: LogContext): void {
		this.output(this.createLogEntry('info', message, error, context));
	}

	/**
	 * Log warning message.
	 */
	warn(message: string, error?: Error, context?: LogContext): void {
		this.output(this.createLogEntry('warn', message, error, context));
	}

	/**
	 * Log error message.
	 */
	error(message: string, error?: Error, context?: LogContext): void {
		this.output(this.createLogEntry('error', message, error, context));
	}
}

/**
 * Singleton logger instance.
 */
export const logger = new Logger();

