import "dotenv/config";
import express from "express";
import cors from "cors";
import redditRoutes from "./routes/redditRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { requestLogger, logInfo } from "./utils/logger.js";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Add request logger middleware (logs all incoming requests)
app.use(requestLogger);

// Register routes
app.use("/reddit", redditRoutes);
app.use("/reddit/auth", authRoutes);

// Debug route to check if server is running
app.get("/", (req, res) => {
  res.json({ status: "Proxy server is running" });
});

// 404 handler - must be placed after all routes
app.use(notFoundHandler);

// Global error handler - must be the last middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  logInfo(`Proxy server running:`, {
    port: PORT,
    environment: process.env.NODE_ENV || "development",
  });
});
