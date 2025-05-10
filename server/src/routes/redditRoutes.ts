/**
 * Reddit API route definitions
 * Maps endpoint URLs to controller functions with appropriate middleware
 */
import { Router } from "express";
import {
  getUserProfile,
  validateToken,
  getSavedPosts,
  getAllSavedPosts,
  unsavePost,
  clearRateLimit,
} from "../controllers/redditController.js";
import { checkAuth } from "../middleware/auth.js";

const router = Router();

// Protected API routes - all require authentication
router.get("/me", checkAuth, getUserProfile); // Get authenticated user profile
router.get("/validate-token", checkAuth, validateToken); // Validate access token
router.get("/saved", checkAuth, getSavedPosts); // Get paginated saved posts
router.get("/saved-all", checkAuth, getAllSavedPosts); // Get all saved posts in one request
router.post("/unsave", checkAuth, unsavePost); // Unsave a post or comment

// Debug/development route - not protected
router.post("/clear-rate-limit", clearRateLimit);

export default router;
