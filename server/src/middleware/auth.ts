import { Request, Response, NextFunction } from "express";

// Helper function to check for access token
export const checkAuth = (req: Request, res: Response, next: NextFunction) => {
  const accessToken = req.headers.authorization?.split(" ")[1];

  if (!accessToken) {
    return res.status(401).json({ error: "Authentication required" });
  }

  req.headers.accessToken = accessToken;
  next();
};
