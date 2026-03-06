/**
 * Simple Logger Utility
 * Structured logging with levels and timestamps
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  data?: any;
  duration?: number;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV !== 'production';

  // Format timestamp
  private getTimestamp(): string {
    return new Date().toISOString();
  }

  // Format log output
  private format(level: LogLevel, message: string, data?: any, duration?: number): string {
    let output = `[${this.getTimestamp()}] [${level.toUpperCase()}] ${message}`;
    if (duration) output += ` (${duration}ms)`;
    if (data) output += ` | ${JSON.stringify(data)}`;
    return output;
  }

  // Debug level - only in development
  debug(message: string, data?: any): void {
    if (this.isDevelopment) {
      console.log(this.format('debug', message, data));
    }
  }

  // Info level - general information
  info(message: string, data?: any): void {
    console.log(this.format('info', message, data));
  }

  // Warn level - warnings
  warn(message: string, data?: any): void {
    console.warn(this.format('warn', message, data));
  }

  // Error level - errors with context
  error(message: string, error?: Error | any, context?: any): void {
    const errorData = {
      message: error?.message || String(error),
      stack: error?.stack?.split('\n')[0],
      ...context,
    };
    console.error(this.format('error', message, errorData));
  }

  // Log query with performance
  query(operation: string, collection: string, duration: number, filter?: any): void {
    if (this.isDevelopment) {
      const message = `[DB] ${operation} on ${collection}`;
      console.log(this.format('debug', message, { filter }, duration));
    }
  }

  // Log API request
  request(method: string, path: string, statusCode: number, duration: number): void {
    const status = statusCode >= 400 ? 'warn' : 'info';
    const message = `${method} ${path} → ${statusCode}`;
    console.log(this.format(status as LogLevel, message, undefined, duration));
  }

  // Log metrics
  metrics(message: string, metrics: Record<string, any>): void {
    console.log(this.format('info', message, metrics));
  }
}

export const logger = new Logger();
