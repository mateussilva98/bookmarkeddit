import { Request, Response, NextFunction } from "express";
import fetch from "node-fetch";
import { formatErrorResponse } from "../utils/responses.js";
import { RedditApiResponse, RedditUserResponse } from "../types/index.js";
import {
  AppError,
  RateLimitError,
  ExternalApiError,
  AuthenticationError,
} from "../utils/errors.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { logInfo, logError, logWarn, logDebug } from "../utils/logger.js";

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
  logWarn(`Rate limit set for token. Retry after ${retrySeconds} seconds.`, {
    retrySeconds,
    resetAt: new Date(rateLimitReset[token]).toISOString(),
  });
}

// Fetch user profile - example of using the new error handling system
export const getUserProfile = asyncHandler(
  async (req: Request, res: Response) => {
    const accessToken = req.headers.accessToken as string;
    const now = Date.now();

    // Check if we're in a rate limit cooldown period
    const retryAfter = isRateLimited(accessToken, now);
    if (retryAfter) {
      throw new RateLimitError(
        "Rate limit in effect, please try again later",
        retryAfter
      );
    }

    logInfo("Fetching user profile from Reddit API");

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

      logError(`Rate limited by Reddit API when fetching user profile`, null, {
        retryAfter: retrySeconds,
        endpoint: "/api/v1/me",
      });

      throw new RateLimitError("Too many requests to Reddit API", retrySeconds);
    }

    if (!response.ok) {
      let errorText;
      let errorData;

      try {
        errorData = await response.json();
        errorText = JSON.stringify(errorData);
      } catch (e) {
        errorText = await response.text();
      }

      logError("Reddit API Error fetching user profile", null, {
        status: response.status,
        errorText,
        errorData,
      });

      // Handle authentication errors specifically
      if (response.status === 401) {
        throw new AuthenticationError(
          "Your session has expired. Please log in again.",
          errorData
        );
      }

      throw new ExternalApiError(
        `Reddit API Error: ${errorText}`,
        response.status,
        errorData
      );
    }

    const data = (await response.json()) as RedditUserResponse;
    logInfo("Successfully fetched user profile", { username: data.name });
    res.json(data);
  }
);

// Validate token
export async function validateToken(req: Request, res: Response) {
  const accessToken = req.headers.accessToken as string;

  try {
    logInfo("Validating Reddit API token");

    const response = await fetch("https://oauth.reddit.com/api/v1/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "bookmarkeddit/1.0",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logError("Token validation failed", null, {
        status: response.status,
        errorText,
      });

      return res
        .status(response.status)
        .json(
          formatErrorResponse(
            response.status,
            `Token validation failed: ${errorText}`
          )
        );
    }

    const data = (await response.json()) as RedditUserResponse;
    logInfo("Token validated successfully", { username: data.name });
    return res.json({ valid: true, user: data });
  } catch (error) {
    logError("Error validating token", error);
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
    logWarn("Rate limit in effect for saved posts request", {
      retryAfter,
      endpoint: "/saved",
    });

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
    logInfo("Fetching username for saved posts request");

    const userResponse = await fetch("https://oauth.reddit.com/api/v1/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "bookmarkeddit/1.0",
      },
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      logError("Token validation failed when fetching saved posts", null, {
        status: userResponse.status,
        errorText,
      });

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
      logError("Failed to get username from Reddit API");
      return res
        .status(500)
        .json(formatErrorResponse(500, "Failed to get your Reddit username"));
    }

    logInfo(`Fetching saved posts for user`, {
      username,
      limit,
      after: after || "none",
    });

    // Build the URL with the username instead of "me"
    let url = `https://oauth.reddit.com/user/${username}/saved?limit=${limit}&raw_json=1`;
    if (after) {
      url += `&after=${after}`;
    }

    logDebug(`Constructed URL for saved posts`, { url });

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "bookmarkeddit/1.0",
      },
    });

    logInfo("Reddit API Response for saved posts", {
      status: response.status,
      ok: response.ok,
    });

    // Handle rate limiting
    if (response.status === 429) {
      const retryHeader = response.headers.get("retry-after");
      const retrySeconds = retryHeader ? parseInt(retryHeader) : 60;

      setRateLimit(accessToken, retrySeconds, now);

      logError("Rate limited by Reddit API when fetching saved posts", null, {
        retryAfter: retrySeconds,
        endpoint: "/user/saved",
      });

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
      let errorData;

      try {
        errorData = await response.json();
        errorText = JSON.stringify(errorData);
      } catch (e) {
        errorText = await response.text();
      }

      logError("Reddit API Error when fetching saved posts", null, {
        status: response.status,
        errorText,
        errorData,
      });

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

    const data = (await response.json()) as RedditApiResponse;

    logInfo("Successfully fetched saved posts", {
      count: data.data?.children?.length || 0,
      hasMore: !!data.data?.after,
    });

    res.json(data);
  } catch (error) {
    logError("Error fetching saved posts", error);
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
    logWarn("Rate limit in effect for all saved posts request", {
      retryAfter,
      endpoint: "/saved-all",
    });

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
    logInfo("Fetching username for all saved posts request");

    const userResponse = await fetch("https://oauth.reddit.com/api/v1/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "bookmarkeddit/1.0",
      },
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      logError("Token validation failed when fetching all saved posts", null, {
        status: userResponse.status,
        errorText,
      });

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
      logError("Failed to get username from Reddit API");
      return res
        .status(500)
        .json(formatErrorResponse(500, "Failed to get your Reddit username"));
    }

    logInfo(`Starting incremental fetch of all saved posts`, {
      username,
      limit,
    });

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

      logDebug(`Fetching batch #${batchNumber}`, { url, batchNumber });

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": "bookmarkeddit/1.0",
        },
      });

      logInfo(`Batch #${batchNumber} response received`, {
        status: response.status,
        ok: response.ok,
        batchNumber,
      });

      // Handle rate limiting
      if (response.status === 429) {
        const retryHeader = response.headers.get("retry-after");
        const retrySeconds = retryHeader ? parseInt(retryHeader) : 60;

        setRateLimit(accessToken, retrySeconds, now);

        logError(`Rate limited by Reddit API on batch #${batchNumber}`, null, {
          retryAfter: retrySeconds,
          endpoint: "/user/saved",
          batchNumber,
        });

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
        let errorData;

        try {
          errorData = await response.json();
          errorText = JSON.stringify(errorData);
        } catch (e) {
          errorText = await response.text();
        }

        logError(`Reddit API Error in batch #${batchNumber}`, null, {
          status: response.status,
          errorText,
          errorData,
          batchNumber,
        });

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
        logInfo(`Added posts from batch #${batchNumber}`, {
          batchCount: batchData.data.children.length,
          totalSoFar: allPosts.length,
          batchNumber,
        });
      } else {
        logInfo(`Batch #${batchNumber} returned no posts`, { batchNumber });
      }

      // Check if there are more posts to fetch
      if (batchData.data?.after) {
        afterToken = batchData.data.after;
        batchNumber++;
      } else {
        hasMore = false;
        logInfo("No more posts to fetch, completed incremental fetch");
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

    logInfo(`Successfully fetched all saved posts`, {
      totalPosts: allPosts.length,
      batchesRequired: batchNumber,
    });

    res.json(fullResponse);
  } catch (error) {
    logError("Error fetching all saved posts", error);
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
    logError("Missing post ID in unsave request", null, { body: req.body });
    return res
      .status(400)
      .json(formatErrorResponse(400, "Post ID is required"));
  }

  // Check if we're in a rate limit cooldown period
  const retryAfter = isRateLimited(accessToken, now);
  if (retryAfter) {
    logWarn("Rate limit in effect for unsave request", {
      retryAfter,
      endpoint: "/unsave",
      postId: id,
    });

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
    logInfo("Attempting to unsave post", { postId: id });

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

      logError("Rate limited by Reddit API when unsaving post", null, {
        retryAfter: retrySeconds,
        endpoint: "/api/unsave",
        postId: id,
      });

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
      let errorData;

      try {
        errorData = await response.json();
        errorText = JSON.stringify(errorData);
      } catch (e) {
        errorText = await response.text();
      }

      logError("Reddit API Error when unsaving post", null, {
        status: response.status,
        errorText,
        errorData,
        postId: id,
      });

      return res
        .status(response.status)
        .json(formatErrorResponse(response.status, errorText));
    }

    logInfo("Successfully unsaved post", { postId: id });
    res.status(200).json({ success: true });
  } catch (error) {
    logError("Error unsaving post", error, { postId: id });
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
    logInfo("Manually clearing rate limit for token", {
      wasLimitedUntil: new Date(rateLimitReset[token]).toISOString(),
    });

    delete rateLimitReset[token];
    res.json({ success: true, message: "Rate limit cleared" });
  } else {
    logWarn("Failed to clear rate limit - invalid token or no rate limit set", {
      token: !!token,
    });

    res.status(400).json({ error: "Invalid token or no rate limit set" });
  }
}

export { rateLimitReset };
