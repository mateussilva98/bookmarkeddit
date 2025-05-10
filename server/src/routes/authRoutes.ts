/**
 * Authentication route definitions
 * Endpoints for OAuth flow with Reddit API
 */
import { Router } from "express";
import { exchangeToken, refreshToken } from "../controllers/authController.js";

const router = Router();

// Auth Routes - public endpoints (no auth middleware required)
router.post("/token", exchangeToken); // Exchange authorization code for tokens
router.post("/refresh", refreshToken); // Refresh an expired access token

export default router;
