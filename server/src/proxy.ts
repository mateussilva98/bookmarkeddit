import express from "express";
import cors from "cors";
import redditRoutes from "./routes/redditRoutes.js";
import authRoutes from "./routes/authRoutes.js";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Register routes
app.use("/reddit", redditRoutes);
app.use("/reddit/auth", authRoutes);

// Debug route to check if server is running
app.get("/", (req, res) => {
  res.json({ status: "Proxy server is running" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});
