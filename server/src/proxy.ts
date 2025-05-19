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

// This could be kept as a general API request logger
app.use("/api", (req, res, next) => {
  // Log the request method and URL
  /* console.log(`API Request received: ${req.method} ${req.url}`); */
  next(); // Add next() to continue to the actual route handlers
});

// Register API routes with /api prefix
app.use("/api/reddit", redditRoutes);
app.use("/api/reddit/auth", authRoutes);

// Health check endpoint
app.get("/", (req, res) => {
  res.json({ status: "Proxy server is running" });
});

// API Health check endpoint
app.get("/api", (req, res) => {
  res.json({ status: "API is running" });
});

// 404 handler for undefined routes - must be after all defined routes
app.use(notFoundHandler);

// Global error handler - must be the last middleware in the chain
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logInfo(`Proxy server running:`, {
    port: PORT,
    environment: process.env.NODE_ENV || "development",
  });
});
