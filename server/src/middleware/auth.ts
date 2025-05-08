import { Request, Response, NextFunction } from "express";
import { AuthenticationError } from "../utils/errors.js";

// Helper function to check for access token
export const checkAuth = (req: Request, res: Response, next: NextFunction) => {
  const accessToken = req.headers.authorization?.split(" ")[1];

  if (!accessToken) {
    throw new AuthenticationError("Authentication required");
  }

  req.headers.accessToken = accessToken;
  next();
};
