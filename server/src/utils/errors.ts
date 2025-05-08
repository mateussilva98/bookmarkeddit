/**
 * Custom error classes for structured error handling
 */

// Base App Error class that extends the built-in Error class
export class AppError extends Error {
  status: number;
  isOperational: boolean;
  details?: any;

  constructor(
    message: string,
    status: number = 500,
    isOperational: boolean = true,
    details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.isOperational = isOperational; // Operational errors are expected/handled errors vs. programming errors
    this.details = details;

    // Capture the stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

// Authentication errors (401 Unauthorized)
export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication required", details?: any) {
    super(message, 401, true, details);
  }
}

// Authorization errors (403 Forbidden)
export class AuthorizationError extends AppError {
  constructor(
    message: string = "You do not have permission to perform this action",
    details?: any
  ) {
    super(message, 403, true, details);
  }
}

// Not Found errors (404)
export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found", details?: any) {
    super(message, 404, true, details);
  }
}

// Validation errors (400 Bad Request)
export class ValidationError extends AppError {
  constructor(message: string = "Invalid input data", details?: any) {
    super(message, 400, true, details);
  }
}

// Rate Limit errors (429 Too Many Requests)
export class RateLimitError extends AppError {
  retryAfter?: number;

  constructor(
    message: string = "Rate limit exceeded",
    retryAfter?: number,
    details?: any
  ) {
    super(message, 429, true, details);
    this.retryAfter = retryAfter;
  }
}

// External API errors (for Reddit API issues)
export class ExternalApiError extends AppError {
  constructor(
    message: string = "External API error",
    status: number = 500,
    details?: any
  ) {
    super(message, status, true, details);
  }
}
