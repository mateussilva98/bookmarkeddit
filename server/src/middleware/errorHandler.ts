import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors.js";
import { formatErrorResponse } from "../utils/responses.js";
import { logError } from "../utils/logger.js";

/**
 * Global error handling middleware
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Default error values
  let statusCode = 500;
  let message = "Internal Server Error";
  let retryAfter: number | undefined;
  let details: any = undefined;

  // Check if it's one of our custom AppError types
  if (err instanceof AppError) {
    statusCode = err.status;
    message = err.message;
    details = err.details;

    // Check for rate limit info
    if ("retryAfter" in err && typeof (err as any).retryAfter === "number") {
      retryAfter = (err as any).retryAfter;
    }
  } else if (err instanceof Error) {
    // If it's a standard Error but not our AppError
    message = err.message || "Something went wrong";
  }

  // Handle unknown errors in production, but provide more details in development
  const isDev = process.env.NODE_ENV !== "production";
  if (!isDev && statusCode === 500) {
    message = "Internal Server Error";
  }

  // Log the error with our structured logger
  logError(`${req.method} ${req.originalUrl} caused error: ${message}`, err, {
    statusCode,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    retryAfter,
    requestBody: req.method !== "GET" ? req.body : undefined,
    requestQuery: req.query,
    requestParams: req.params,
  });

  // Send the response
  res
    .status(statusCode)
    .json(formatErrorResponse(statusCode, message, retryAfter));
};

/**
 * Catch 404 errors for undefined routes
 */
export const notFoundHandler = (req: Request, res: Response) => {
  logError(`Route not found: ${req.method} ${req.originalUrl}`, null, {
    statusCode: 404,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
  });

  res
    .status(404)
    .json(
      formatErrorResponse(
        404,
        `Route not found: ${req.method} ${req.originalUrl}`
      )
    );
};

/**
 * Async handler to avoid try/catch blocks in route handlers
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
