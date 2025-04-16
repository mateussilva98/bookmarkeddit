import express, { Request, Response } from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/reddit/saved", async (req: Request, res: Response) => {
  const accessToken = req.headers.authorization?.split(" ")[1]; // Extract token from Authorization header

  if (!accessToken) {
    return res.status(400).json({ error: "Access token is missing" });
  }

  console.log("Access Token:", accessToken); // Log the access token for debugging

  try {
    const response = await fetch("https://oauth.reddit.com/user/mateus_silva_98/saved?limit=100", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "YourAppName/1.0",
      },
    });

    console.log("Reddit API Response Status:", response.status); // Log the response status

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Reddit API Error:", errorText); // Log the error response from Reddit
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error fetching saved posts:", error);
    res.status(500).json({ error: "Failed to fetch saved posts" });
  }
});

app.listen(5000, () => {
  console.log("Proxy server running on http://localhost:5000");
});
