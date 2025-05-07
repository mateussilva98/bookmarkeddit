import { Request, Response } from "express";
import fetch from "node-fetch";
import { formatErrorResponse } from "../utils/responses.js";
import { RedditApiResponse, RedditUserResponse } from "../types/index.js";

// Rate limiting management
const rateLimitReset: { [key: string]: number } = {}; // Store reset times for rate limits
const RATE_LIMIT_BUFFER = 5000; // 5 seconds buffer

export function isRateLimited(
  token: string,
  now: number = Date.now()
): number | null {
  if (rateLimitReset[token] && now < rateLimitReset[token]) {
    return Math.ceil((rateLimitReset[token] - now) / 1000);
  }
  return null;
}

export function setRateLimit(
  token: string,
  retrySeconds: number,
  now: number = Date.now()
) {
  rateLimitReset[token] = now + retrySeconds * 1000 + RATE_LIMIT_BUFFER;
}

// Fetch user profile
export async function getUserProfile(req: Request, res: Response) {
  const accessToken = req.headers.accessToken as string;
  const now = Date.now();

  // Check if we're in a rate limit cooldown period
  const retryAfter = isRateLimited(accessToken, now);
  if (retryAfter) {
    return res
      .status(429)
      .json(
        formatErrorResponse(
          429,
          "Rate limit in effect, please try again later",
          retryAfter
        )
      );
  }

  try {
    const response = await fetch("https://oauth.reddit.com/api/v1/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "bookmarkeddit/1.0",
      },
    });

    // Handle rate limiting
    if (response.status === 429) {
      const retryHeader = response.headers.get("retry-after");
      const retrySeconds = retryHeader ? parseInt(retryHeader) : 60;

      setRateLimit(accessToken, retrySeconds, now);

      console.error(
        `Rate limited by Reddit API. Retry after ${retrySeconds} seconds.`
      );
      return res
        .status(429)
        .json(
          formatErrorResponse(
            429,
            "Too many requests to Reddit API",
            retrySeconds
          )
        );
    }

    if (!response.ok) {
      let errorText;
      try {
        const errorData = await response.json();
        errorText = JSON.stringify(errorData);
      } catch (e) {
        errorText = await response.text();
      }

      console.error("Reddit API Error fetching user profile:", errorText);
      return res
        .status(response.status)
        .json(formatErrorResponse(response.status, errorText));
    }

    const data = (await response.json()) as RedditUserResponse;
    res.json(data);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res
      .status(500)
      .json(
        formatErrorResponse(
          500,
          `Failed to fetch user profile: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      );
  }
}

// Validate token
export async function validateToken(req: Request, res: Response) {
  const accessToken = req.headers.accessToken as string;

  try {
    const response = await fetch("https://oauth.reddit.com/api/v1/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "bookmarkeddit/1.0",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Token validation failed:", response.status, errorText);
      return res
        .status(response.status)
        .json(
          formatErrorResponse(
            response.status,
            `Token validation failed: ${errorText}`
          )
        );
    }

    const data = await response.json();
    return res.json({ valid: true, user: data });
  } catch (error) {
    console.error("Error validating token:", error);
    return res
      .status(500)
      .json(
        formatErrorResponse(
          500,
          `Error validating token: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      );
  }
}

// Get saved posts
export async function getSavedPosts(req: Request, res: Response) {
  const accessToken = req.headers.accessToken as string;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
  const after = (req.query.after as string) || null;
  const now = Date.now();

  // Check if we're in a rate limit cooldown period
  const retryAfter = isRateLimited(accessToken, now);
  if (retryAfter) {
    return res
      .status(429)
      .json(
        formatErrorResponse(
          429,
          "Rate limit in effect, please try again later",
          retryAfter
        )
      );
  }

  try {
    // First, get the username of the authenticated user
    const userResponse = await fetch("https://oauth.reddit.com/api/v1/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "bookmarkeddit/1.0",
      },
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error("Token validation failed:", userResponse.status, errorText);

      // If token is invalid, return appropriate error
      if (userResponse.status === 401) {
        return res
          .status(401)
          .json(
            formatErrorResponse(
              401,
              "Your session has expired. Please log in again."
            )
          );
      }

      return res
        .status(userResponse.status)
        .json(
          formatErrorResponse(
            userResponse.status,
            `Token validation failed: ${errorText}`
          )
        );
    }

    // Parse the user data to get the username
    const userData = (await userResponse.json()) as RedditUserResponse;
    const username = userData.name;

    if (!username) {
      console.error("Failed to get username from Reddit API");
      return res
        .status(500)
        .json(formatErrorResponse(500, "Failed to get your Reddit username"));
    }

    console.log(`Fetching saved posts for user: ${username}`);

    // Build the URL with the username instead of "me"
    let url = `https://oauth.reddit.com/user/${username}/saved?limit=${limit}&raw_json=1`;
    if (after) {
      url += `&after=${after}`;
    }

    console.log(`Fetching saved posts with URL: ${url}`);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "bookmarkeddit/1.0",
      },
    });

    console.log("Reddit API Response Status:", response.status);

    // Handle rate limiting
    if (response.status === 429) {
      const retryHeader = response.headers.get("retry-after");
      const retrySeconds = retryHeader ? parseInt(retryHeader) : 60;

      setRateLimit(accessToken, retrySeconds, now);

      console.error(
        `Rate limited by Reddit API. Retry after ${retrySeconds} seconds.`
      );
      return res
        .status(429)
        .json(
          formatErrorResponse(
            429,
            "Too many requests to Reddit API",
            retrySeconds
          )
        );
    }

    if (!response.ok) {
      let errorText;
      try {
        const errorData = await response.json();
        errorText = JSON.stringify(errorData);
      } catch (e) {
        errorText = await response.text();
      }

      console.error("Reddit API Error:", errorText);

      // Handle specific error codes
      if (response.status === 400) {
        return res
          .status(400)
          .json(
            formatErrorResponse(
              400,
              "Bad request to Reddit API. Your session might be invalid or you may have insufficient permissions."
            )
          );
      }

      return res
        .status(response.status)
        .json(formatErrorResponse(response.status, errorText));
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error fetching saved posts:", error);
    res
      .status(500)
      .json(
        formatErrorResponse(
          500,
          `Failed to fetch saved posts: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      );
  }
}

// Get all saved posts
export async function getAllSavedPosts(req: Request, res: Response) {
  const accessToken = req.headers.accessToken as string;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
  const now = Date.now();

  // Check if we're in a rate limit cooldown period
  const retryAfter = isRateLimited(accessToken, now);
  if (retryAfter) {
    return res
      .status(429)
      .json(
        formatErrorResponse(
          429,
          "Rate limit in effect, please try again later",
          retryAfter
        )
      );
  }

  try {
    // First, get the username of the authenticated user
    const userResponse = await fetch("https://oauth.reddit.com/api/v1/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "bookmarkeddit/1.0",
      },
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error("Token validation failed:", userResponse.status, errorText);

      // If token is invalid, return appropriate error
      if (userResponse.status === 401) {
        return res
          .status(401)
          .json(
            formatErrorResponse(
              401,
              "Your session has expired. Please log in again."
            )
          );
      }

      return res
        .status(userResponse.status)
        .json(
          formatErrorResponse(
            userResponse.status,
            `Token validation failed: ${errorText}`
          )
        );
    }

    // Parse the user data to get the username
    const userData = (await userResponse.json()) as RedditUserResponse;
    const username = userData.name;

    if (!username) {
      console.error("Failed to get username from Reddit API");
      return res
        .status(500)
        .json(formatErrorResponse(500, "Failed to get your Reddit username"));
    }

    console.log(`Fetching all saved posts for user: ${username}`);

    // Initialize variables for the incremental fetching
    let allPosts: any[] = [];
    let afterToken: string | null = null;
    let hasMore = true;
    let batchNumber = 1;

    // Fetch posts in batches until we've got them all
    while (hasMore) {
      // Build the URL with the username
      let url = `https://oauth.reddit.com/user/${username}/saved?limit=${limit}&raw_json=1`;
      if (afterToken) {
        url += `&after=${afterToken}`;
      }

      console.log(`Fetching batch #${batchNumber} with URL: ${url}`);

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": "bookmarkeddit/1.0",
        },
      });

      console.log(`Batch #${batchNumber} response status:`, response.status);

      // Handle rate limiting
      if (response.status === 429) {
        const retryHeader = response.headers.get("retry-after");
        const retrySeconds = retryHeader ? parseInt(retryHeader) : 60;

        setRateLimit(accessToken, retrySeconds, now);

        console.error(
          `Rate limited by Reddit API. Retry after ${retrySeconds} seconds.`
        );
        return res
          .status(429)
          .json(
            formatErrorResponse(
              429,
              "Too many requests to Reddit API",
              retrySeconds
            )
          );
      }

      if (!response.ok) {
        let errorText;
        try {
          const errorData = await response.json();
          errorText = JSON.stringify(errorData);
        } catch (e) {
          errorText = await response.text();
        }

        console.error(`Reddit API Error in batch #${batchNumber}:`, errorText);

        // Handle specific error codes
        if (response.status === 400) {
          return res
            .status(400)
            .json(
              formatErrorResponse(
                400,
                "Bad request to Reddit API. Your session might be invalid or you may have insufficient permissions."
              )
            );
        }

        return res
          .status(response.status)
          .json(formatErrorResponse(response.status, errorText));
      }

      // Process the batch of data
      const batchData = (await response.json()) as RedditApiResponse;

      // Add the children to our collection
      if (batchData.data?.children && batchData.data.children.length > 0) {
        allPosts = [...allPosts, ...batchData.data.children];
        console.log(
          `Added ${batchData.data.children.length} posts from batch #${batchNumber}. Total so far: ${allPosts.length}`
        );
      } else {
        console.log(`Batch #${batchNumber} returned no posts.`);
      }

      // Check if there are more posts to fetch
      if (batchData.data?.after) {
        afterToken = batchData.data.after;
        batchNumber++;
      } else {
        hasMore = false;
        console.log("No more posts to fetch.");
      }

      // Add a small delay to prevent overwhelming the Reddit API
      if (hasMore) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Return all the fetched posts with the same structure as a single batch
    const fullResponse = {
      kind: "Listing",
      data: {
        after: null,
        before: null,
        children: allPosts,
        dist: allPosts.length,
        modhash: "",
      },
    };

    console.log(`Successfully fetched all ${allPosts.length} saved posts.`);
    res.json(fullResponse);
  } catch (error) {
    console.error("Error fetching all saved posts:", error);
    res
      .status(500)
      .json(
        formatErrorResponse(
          500,
          `Failed to fetch all saved posts: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      );
  }
}

// Unsave a post or comment
export async function unsavePost(req: Request, res: Response) {
  const accessToken = req.headers.accessToken as string;
  const { id } = req.body;
  const now = Date.now();

  if (!id) {
    return res
      .status(400)
      .json(formatErrorResponse(400, "Post ID is required"));
  }

  // Check if we're in a rate limit cooldown period
  const retryAfter = isRateLimited(accessToken, now);
  if (retryAfter) {
    return res
      .status(429)
      .json(
        formatErrorResponse(
          429,
          "Rate limit in effect, please try again later",
          retryAfter
        )
      );
  }

  try {
    const response = await fetch(`https://oauth.reddit.com/api/unsave`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "bookmarkeddit/1.0",
      },
      body: `id=${id}`,
    });

    // Handle rate limiting
    if (response.status === 429) {
      const retryHeader = response.headers.get("retry-after");
      const retrySeconds = retryHeader ? parseInt(retryHeader) : 60;

      setRateLimit(accessToken, retrySeconds, now);

      console.error(
        `Rate limited by Reddit API. Retry after ${retrySeconds} seconds.`
      );
      return res
        .status(429)
        .json(
          formatErrorResponse(
            429,
            "Too many requests to Reddit API",
            retrySeconds
          )
        );
    }

    if (!response.ok) {
      let errorText;
      try {
        const errorData = await response.json();
        errorText = JSON.stringify(errorData);
      } catch (e) {
        errorText = await response.text();
      }

      console.error("Reddit API Error when unsaving:", errorText);
      return res
        .status(response.status)
        .json(formatErrorResponse(response.status, errorText));
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error unsaving post:", error);
    res
      .status(500)
      .json(
        formatErrorResponse(
          500,
          `Failed to unsave post: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      );
  }
}

// Clear rate limit for debugging
export function clearRateLimit(req: Request, res: Response) {
  const { token } = req.body;

  if (token && rateLimitReset[token]) {
    delete rateLimitReset[token];
    res.json({ success: true, message: "Rate limit cleared" });
  } else {
    res.status(400).json({ error: "Invalid token or no rate limit set" });
  }
}

export { rateLimitReset };
