/**
 * Logger utility for server logging functionality
 * Provides structured logging for requests, responses, and errors
 */

// Log levels
enum LogLevel {
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
  DEBUG = "DEBUG",
}

// Log entry structure
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: any;
}

/**
 * Format a log entry into a consistent string format
 */
const formatLogEntry = (entry: LogEntry): string => {
  const { timestamp, level, message, context } = entry;

  // Basic formatted log message
  let formattedMessage = `[${timestamp}] ${level}: ${message}`;

  // Add stringified context if provided
  if (context) {
    try {
      if (typeof context === "object") {
        // Remove sensitive data like tokens before logging
        const sanitizedContext = { ...context };
        if (sanitizedContext.headers) {
          if (sanitizedContext.headers.authorization) {
            sanitizedContext.headers.authorization = "[REDACTED]";
          }
          if (sanitizedContext.headers.accessToken) {
            sanitizedContext.headers.accessToken = "[REDACTED]";
          }
        }
        formattedMessage += `\nContext: ${JSON.stringify(
          sanitizedContext,
          null,
          2
        )}`;
      } else {
        formattedMessage += `\nContext: ${context}`;
      }
    } catch (err) {
      formattedMessage += `\nContext: [Error serializing context]`;
    }
  }

  return formattedMessage;
};

/**
 * Create a log entry with current timestamp
 */
const createLogEntry = (
  level: LogLevel,
  message: string,
  context?: any
): LogEntry => {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
  };
};

/**
 * Log an informational message (requests, successful operations)
 */
export const logInfo = (message: string, context?: any): void => {
  const entry = createLogEntry(LogLevel.INFO, message, context);
  const formattedLog = formatLogEntry(entry);
  console.log(formattedLog);
};

/**
 * Log a warning message (potential issues, rate limiting)
 */
export const logWarn = (message: string, context?: any): void => {
  const entry = createLogEntry(LogLevel.WARN, message, context);
  const formattedLog = formatLogEntry(entry);
  console.warn(formattedLog);
};

/**
 * Log an error message (failures, exceptions)
 */
export const logError = (message: string, error?: any, context?: any): void => {
  // Combine error information with context
  let combinedContext = context || {};

  if (error) {
    // Extract useful information from error objects
    if (error instanceof Error) {
      combinedContext = {
        ...combinedContext,
        errorName: error.name,
        errorMessage: error.message,
        stack: error.stack,
      };
    } else {
      combinedContext = {
        ...combinedContext,
        error,
      };
    }
  }

  const entry = createLogEntry(LogLevel.ERROR, message, combinedContext);
  const formattedLog = formatLogEntry(entry);
  console.error(formattedLog);
};

/**
 * Log debugging information (only in development)
 */
export const logDebug = (message: string, context?: any): void => {
  // Only log debug messages in development environment
  if (process.env.NODE_ENV !== "production") {
    const entry = createLogEntry(LogLevel.DEBUG, message, context);
    const formattedLog = formatLogEntry(entry);
    console.debug(formattedLog);
  }
};

/**
 * Request logger middleware for Express
 */
export const requestLogger = (req: any, res: any, next: any): void => {
  const startTime = Date.now();

  // Log incoming request
  logInfo(`${req.method} ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    query: req.query,
    body: req.method !== "GET" ? req.body : undefined,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  // Capture response info after request completes
  res.on("finish", () => {
    const duration = Date.now() - startTime;

    const logContext = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    };

    if (res.statusCode >= 400) {
      // For error responses
      logError(
        `${req.method} ${req.originalUrl} responded ${res.statusCode} (${duration}ms)`,
        null,
        logContext
      );
    } else {
      // For successful responses
      logInfo(
        `${req.method} ${req.originalUrl} responded ${res.statusCode} (${duration}ms)`,
        logContext
      );
    }
  });

  next();
};

// Default export for convenience
export default {
  info: logInfo,
  warn: logWarn,
  error: logError,
  debug: logDebug,
  requestLogger,
};
