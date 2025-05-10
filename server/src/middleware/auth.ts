/**
 * Authentication middleware for protecting API routes
 * Validates presence of access tokens in request headers
 */
import { Request, Response, NextFunction } from "express";
import { AuthenticationError } from "../utils/errors.js";

/**
 * Middleware to check for valid access token in Authorization header
 * Extracts Bearer token and adds it to request headers for controller access
 *
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function to pass control to the next middleware
 * @throws AuthenticationError if no token is provided
 */
export const checkAuth = (req: Request, res: Response, next: NextFunction) => {
  const accessToken = req.headers.authorization?.split(" ")[1];

  if (!accessToken) {
    throw new AuthenticationError("Authentication required");
  }

  // Store token in a standardized location for controllers to access
  req.headers.accessToken = accessToken;
  next();
};
