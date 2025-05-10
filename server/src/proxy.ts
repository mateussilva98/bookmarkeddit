/**
 * Express server proxy for Reddit API interactions
 * Handles authentication flow and provides endpoints for client requests
 */
import "dotenv/config";
import express from "express";
import cors from "cors";
import redditRoutes from "./routes/redditRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { requestLogger, logInfo } from "./utils/logger.js";

const app = express();

// Middleware setup
app.use(cors());
app.use(express.json());

// Request logging middleware - captures all incoming requests
app.use(requestLogger);

// Register API routes
app.use("/reddit", redditRoutes);
app.use("/reddit/auth", authRoutes);

// Health check endpoint
app.get("/", (req, res) => {
  res.json({ status: "Proxy server is running" });
});

// 404 handler for undefined routes - must be after all defined routes
app.use(notFoundHandler);

// Global error handler - must be the last middleware in the chain
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  logInfo(`Proxy server running:`, {
    port: PORT,
    environment: process.env.NODE_ENV || "development",
  });
});
