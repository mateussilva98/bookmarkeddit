/**
 * API service for handling authentication and Reddit API requests
 * This file contains services for authentication flow and Reddit API interactions
 */

// Base URLs for API endpoints
const PROXY_BASE_URL =
  process.env.NODE_ENV === "production" ? "/api" : "http://localhost:3000";
const REDDIT_BASE_URL = "https://www.reddit.com";

// Cache for user profile data to reduce API calls
let userProfileCache: {
  profile: UserProfile | null;
  accessToken: string | null;
  timestamp: number | null;
} = {
  profile: null,
  accessToken: null,
  timestamp: null,
};

// Add a promise cache to handle multiple simultaneous requests
let pendingProfileRequest: Promise<UserProfile> | null = null;

// Cache timeout in milliseconds (5 minutes)
const PROFILE_CACHE_TIMEOUT = 5 * 60 * 1000;

// Type definitions for auth responses
export interface AuthTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface UserProfile {
  name: string;
  icon_img: string;
}

/**
 * Custom error class for authentication-related errors
 */
export class AuthenticationError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "AuthenticationError";
    this.status = status;
  }
}

/**
 * Custom error class for API-related errors
 * Includes support for rate limiting information
 */
export class ApiError extends Error {
  status?: number;
  retryAfter?: number;
  isAuthError: boolean;

  constructor(message: string, status?: number, retryAfter?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.retryAfter = retryAfter;
    // Mark 401 and 403 responses as auth errors
    this.isAuthError = status === 401 || status === 403;
  }
}

/**
 * Authentication service for handling Reddit OAuth flow
 */
export const authService = {
  /**
   * Exchange authorization code for access and refresh tokens
   * @param code - The authorization code from Reddit OAuth
   * @returns Promise with token response
   */
  getTokens: async (code: string): Promise<AuthTokenResponse> => {
    // Use a fixed redirect URI that matches exactly what you registered with Reddit
    const redirectURI =
      import.meta.env.VITE_REDIRECT_URI ||
      window.location.origin + "/login/callback";
    try {
      // Initiating OAuth token exchange with Reddit

      const response = await fetch(`${PROXY_BASE_URL}/reddit/auth/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
          redirectUri: redirectURI,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          "Token exchange failed with status:",
          response.status,
          response.statusText
        );
        console.error("Error details:", errorText);

        throw new AuthenticationError(
          `Failed to fetch access token: ${response.status} ${
            response.statusText
          }${errorText ? ` - ${errorText}` : ""}`,
          response.status
        );
      }

      const data = await response.json();
      // Successfully received authentication tokens from Reddit
      return data as AuthTokenResponse;
    } catch (error) {
      // Detailed error logging
      console.error("Token exchange error:", error);

      if (error instanceof AuthenticationError) {
        throw error;
      }

      if (error instanceof TypeError && error.message === "Failed to fetch") {
        throw new AuthenticationError(
          "Network error during authentication. Please check your internet connection and try again."
        );
      }

      throw new AuthenticationError(
        `Error during token exchange: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },

  /**
   * Refresh the access token using a refresh token
   * @param refreshToken - The refresh token to use
   * @returns Promise with new token response
   */ refreshToken: async (
    refreshToken: string
  ): Promise<AuthTokenResponse> => {
    try {
      // Initiating token refresh process

      const response = await fetch(`${PROXY_BASE_URL}/reddit/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refreshToken,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          "Token refresh failed with status:",
          response.status,
          response.statusText
        );
        console.error("Error details:", errorText);

        throw new AuthenticationError(
          `Failed to refresh token: ${response.status} ${response.statusText}${
            errorText ? ` - ${errorText}` : ""
          }`,
          response.status
        );
      }

      const data = await response.json();
      // Successfully refreshed authentication tokens
      return data as AuthTokenResponse;
    } catch (error) {
      // Detailed error logging
      console.error("Token refresh error:", error);

      if (error instanceof AuthenticationError) {
        throw error;
      }

      if (error instanceof TypeError && error.message === "Failed to fetch") {
        throw new AuthenticationError(
          "Network error during token refresh. Please check your internet connection and try again."
        );
      }

      throw new AuthenticationError(
        `Error during token refresh: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },

  /**
   * Get user profile information with caching support
   * @param accessToken - The access token for authentication
   * @returns Promise with user profile data
   */
  getUserProfile: async (accessToken: string): Promise<UserProfile> => {
    // Check if we have a cached profile for this access token that's not expired
    const now = Date.now();
    if (
      userProfileCache.profile &&
      userProfileCache.accessToken === accessToken &&
      userProfileCache.timestamp &&
      now - userProfileCache.timestamp < PROFILE_CACHE_TIMEOUT
    ) {
      // Using cached user profile data (within 5 minute window)
      return userProfileCache.profile;
    }

    // Return the pending request if one is in progress
    if (pendingProfileRequest) {
      // Reusing existing profile request that's already in progress
      return pendingProfileRequest;
    }

    try {
      // Create and store the pending request
      pendingProfileRequest = (async () => {
        try {
          // Fetching current user profile information from Reddit API
          const response = await fetch(`${PROXY_BASE_URL}/reddit/me`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          });

          if (!response.ok) {
            throw new ApiError(
              `Failed to fetch user profile: ${response.statusText}`,
              response.status
            );
          }

          const profile = await response.json();

          // Cache the result
          userProfileCache = {
            profile,
            accessToken,
            timestamp: Date.now(),
          };

          return profile;
        } finally {
          // Clear the pending request
          pendingProfileRequest = null;
        }
      })();

      return pendingProfileRequest;
    } catch (error) {
      pendingProfileRequest = null;
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        `Error fetching user profile: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },

  /**
   * Generate the OAuth login URL for Reddit
   * @returns Login URL string with proper scopes and parameters
   */
  getLoginUrl: (): string => {
    const clientId = import.meta.env.VITE_CLIENT_ID;
    // Use a fixed redirect URI that matches exactly what you registered with Reddit
    const redirectURI =
      import.meta.env.VITE_REDIRECT_URI ||
      window.location.origin + "/login/callback";
    return `${REDDIT_BASE_URL}/api/v1/authorize?client_id=${clientId}&response_type=code&state=bookmarkeddit&redirect_uri=${redirectURI}&duration=permanent&scope=identity,history,save`;
  },
};

/**
 * Reddit API service for interacting with Reddit endpoints
 */
export const redditApi = {
  /**
   * Fetch saved posts with pagination support
   * @param accessToken - The access token for authentication
   * @param after - Pagination token for fetching next batch
   * @param limit - Number of posts to fetch per request
   * @returns Promise with saved posts data
   */
  getSavedPosts: async (
    accessToken: string,
    after?: string,
    limit = 100
  ): Promise<any> => {
    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (limit) params.append("limit", limit.toString());
      if (after) params.append("after", after);

      const query = params.toString() ? `?${params.toString()}` : ""; // Only log on development
      if (import.meta.env.DEV) {
        // Debug: Making a request to the saved posts endpoint with query parameters
      }

      const response = await fetch(`${PROXY_BASE_URL}/reddit/saved${query}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      // Handle specific error responses
      if (response.status === 400) {
        const data = await response.json();
        console.error("400 Bad Request from Reddit API", data);

        // This could be a permissions issue
        throw new ApiError(
          "Failed to access saved posts. This could be due to insufficient permissions. Please ensure you've granted the 'history' and 'save' scopes during login.",
          400
        );
      }

      if (response.status === 401) {
        throw new ApiError(
          "Your session has expired. Please log in again.",
          401
        );
      }

      if (response.status === 429) {
        // Handle rate limiting
        const data = await response.json();
        const retryAfter = data.retryAfter || 60; // Default to 60 seconds if not specified

        console.warn(
          `Rate limited by Reddit API. Retry after ${retryAfter} seconds.`
        );

        throw new ApiError(
          `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
          429,
          retryAfter
        );
      }

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: response.statusText }));
        throw new ApiError(
          `Failed to fetch saved posts: ${
            errorData.error || response.statusText
          }`,
          response.status
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        `Error fetching saved posts: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },

  /**
   * Fetch all saved posts incrementally using the server's batching mechanism
   * @param accessToken - The access token for authentication
   * @param limit - Number of posts to fetch per batch
   * @returns Promise with all saved posts data
   */
  getAllSavedPosts: async (accessToken: string, limit = 100): Promise<any> => {
    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (limit) params.append("limit", limit.toString());

      const query = params.toString() ? `?${params.toString()}` : ""; // Only log on development
      if (import.meta.env.DEV) {
        // Debug: Making a request to get all saved posts with query parameters
      }

      const response = await fetch(
        `${PROXY_BASE_URL}/reddit/saved-all${query}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Handle specific error responses
      if (response.status === 400) {
        const data = await response.json();
        console.error("400 Bad Request from Reddit API", data);

        // This could be a permissions issue
        throw new ApiError(
          "Failed to access saved posts. This could be due to insufficient permissions. Please ensure you've granted the 'history' and 'save' scopes during login.",
          400
        );
      }

      if (response.status === 401) {
        throw new ApiError(
          "Your session has expired. Please log in again.",
          401
        );
      }

      if (response.status === 429) {
        // Handle rate limiting
        const data = await response.json();
        const retryAfter = data.retryAfter || 60; // Default to 60 seconds if not specified

        console.warn(
          `Rate limited by Reddit API. Retry after ${retryAfter} seconds.`
        );

        throw new ApiError(
          `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
          429,
          retryAfter
        );
      }

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: response.statusText }));
        throw new ApiError(
          `Failed to fetch all saved posts: ${
            errorData.error || response.statusText
          }`,
          response.status
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        `Error fetching all saved posts: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },

  /**
   * Unsave a post or comment with rate limit handling
   * @param accessToken - The access token for authentication
   * @param id - The Reddit ID of the item to unsave
   * @returns Promise that resolves when unsave is complete
   */
  unsaveItem: async (accessToken: string, id: string): Promise<void> => {
    try {
      const response = await fetch(`${PROXY_BASE_URL}/reddit/unsave`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });
      if (response.status === 401 || response.status === 403) {
        throw new ApiError(
          "Your session has expired. Please log in again.",
          response.status
        );
      }

      if (response.status === 429) {
        // Handle rate limiting
        const data = await response.json();
        const retryAfter = data.retryAfter || 60;

        throw new ApiError(
          `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
          429,
          retryAfter
        );
      }

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: response.statusText }));
        throw new ApiError(
          `Failed to unsave item: ${errorData.error || response.statusText}`,
          response.status
        );
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        `Error unsaving item: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },
};
