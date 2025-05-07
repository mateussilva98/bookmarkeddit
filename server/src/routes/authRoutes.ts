import { Router } from "express";
import { exchangeToken, refreshToken } from "../controllers/authController.js";

const router = Router();

// Auth Routes
router.post("/token", exchangeToken);
router.post("/refresh", refreshToken);

export default router;
