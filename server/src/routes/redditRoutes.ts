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

// Reddit API Routes
router.get("/me", checkAuth, getUserProfile);
router.get("/validate-token", checkAuth, validateToken);
router.get("/saved", checkAuth, getSavedPosts);
router.get("/saved-all", checkAuth, getAllSavedPosts);
router.post("/unsave", checkAuth, unsavePost);

// Debug route
router.post("/clear-rate-limit", clearRateLimit);

export default router;
