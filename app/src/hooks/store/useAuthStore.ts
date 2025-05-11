/**
 * Authentication store for Bookmarkeddit
 * Manages user authentication state, tokens, and profile
 */
import { useCallback, useContext, useRef } from "react";
import { StoreContext } from "./StoreContext.tsx";
import { UserProfile, authService } from "../../api";

/**
 * User authentication state interface
 * Tracks tokens, expiration, user profile, and auth status
 */
export interface AuthState {
  access_token: string | null;
  refresh_token: string | null;
  expires_at: number | null; // Timestamp when the token expires
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Initial auth state
export const initialAuthState: AuthState = {
  access_token: null,
  refresh_token: null,
  expires_at: null,
  user: null,
  isAuthenticated: false,
  isLoading: true, // Start with loading true to check for stored tokens
  error: null,
};

/**
 * Custom hook for managing authentication state
 */
export const useAuthStore = () => {
  const { store, setStore } = useContext(StoreContext);

  // Track ongoing refresh promise to prevent multiple simultaneous refreshes
  const refreshPromiseRef = useRef<Promise<boolean> | null>(null);

  /**
   * Set authentication tokens and update store
   */
  const setAuthTokens = useCallback(
    (accessToken: string, refreshToken: string, expiresIn: number) => {
      // Calculate expiration timestamp
      const expiresAt = Date.now() + expiresIn * 1000;

      // Save to localStorage
      localStorage.setItem("access_token", accessToken);
      localStorage.setItem("refresh_token", refreshToken);
      localStorage.setItem("expires_at", expiresAt.toString());

      // Update store
      setStore((currentStore) => ({
        ...currentStore,
        auth: {
          ...currentStore.auth,
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: expiresAt,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      }));
    },
    [setStore]
  );

  /**
   * Update user profile in the store and localStorage
   */
  const setUserProfile = useCallback(
    (user: UserProfile) => {
      // Save to localStorage as JSON string
      localStorage.setItem("user_profile", JSON.stringify(user));

      setStore((currentStore) => ({
        ...currentStore,
        auth: {
          ...currentStore.auth,
          user,
        },
      }));
    },
    [setStore]
  );

  /**
   * Set authentication error in the store
   */
  const setAuthError = useCallback(
    (error: string) => {
      setStore((currentStore) => ({
        ...currentStore,
        auth: {
          ...currentStore.auth,
          error,
          isLoading: false,
        },
      }));
    },
    [setStore]
  );

  /**
   * Set authentication loading state
   */
  const setAuthLoading = useCallback(
    (isLoading: boolean) => {
      setStore((currentStore) => ({
        ...currentStore,
        auth: {
          ...currentStore.auth,
          isLoading,
        },
      }));
    },
    [setStore]
  );

  /**
   * Handle authentication errors (401/403)
   * Clears both auth and posts data from localStorage
   */
  const handleAuthError = useCallback(() => {
    console.log("Authentication error detected, clearing all session data");

    // Clear auth data
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("expires_at");
    localStorage.removeItem("user_profile");

    // Clear posts data
    localStorage.removeItem("bookmarkeddit_posts");
    localStorage.removeItem("bookmarkeddit_posts_timestamp");

    // Reset auth state
    setStore((currentStore) => ({
      ...currentStore,
      auth: {
        ...initialAuthState,
        isLoading: false,
        error: "Your session has expired. Please log in again.",
      },
    }));

    // Redirect to homepage
    window.location.href = "/";
  }, [setStore]);

  /**
   * Log out the current user by clearing tokens and auth state
   */
  const logout = useCallback(() => {
    // Clear localStorage immediately to complete the logout
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("expires_at");
    localStorage.removeItem("user_profile");

    // Reset auth state
    setStore((currentStore) => ({
      ...currentStore,
      auth: {
        ...initialAuthState,
        isLoading: false,
      },
    }));

    // Navigate to homepage - this will force a clean app state
    window.location.href = "/";
  }, [setStore]);

  /**
   * Refresh authentication tokens using the refresh token
   * Ensures only one refresh happens at a time
   */
  const refreshAuth = useCallback(async (): Promise<boolean> => {
    if (refreshPromiseRef.current) {
      // If a refresh is already in progress, return the same promise
      return refreshPromiseRef.current;
    }

    const refreshToken = store.auth.refresh_token;
    if (!refreshToken) {
      setAuthError("No refresh token available");
      return false;
    }

    refreshPromiseRef.current = (async () => {
      try {
        setAuthLoading(true);
        const tokenData = await authService.refreshToken(refreshToken);
        setAuthTokens(
          tokenData.access_token,
          tokenData.refresh_token,
          tokenData.expires_in
        );
        return true;
      } catch (error) {
        setAuthError(
          error instanceof Error ? error.message : "Failed to refresh token"
        );
        logout(); // If refresh fails, log the user out
        return false;
      } finally {
        setAuthLoading(false);
        refreshPromiseRef.current = null; // Reset promise after completion
      }
    })();

    return refreshPromiseRef.current;
  }, [
    store.auth.refresh_token,
    setAuthError,
    setAuthLoading,
    setAuthTokens,
    logout,
  ]);

  /**
   * Handle OAuth code exchange after Reddit callback
   * Exchanges authorization code for tokens and fetches user profile
   */
  const handleCodeExchange = useCallback(
    async (code: string): Promise<boolean> => {
      try {
        setAuthLoading(true);
        const tokenData = await authService.getTokens(code);
        setAuthTokens(
          tokenData.access_token,
          tokenData.refresh_token,
          tokenData.expires_in
        );

        // Get user profile after successful authentication
        try {
          const userProfile = await authService.getUserProfile(
            tokenData.access_token
          );
          setUserProfile(userProfile);
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }

        return true;
      } catch (error) {
        setAuthError(
          error instanceof Error
            ? error.message
            : "Failed to exchange code for token"
        );
        return false;
      } finally {
        setAuthLoading(false);
      }
    },
    [setAuthError, setAuthLoading, setAuthTokens, setUserProfile]
  );

  /**
   * Check if access token is valid or needs refresh
   * Returns valid token or null if auth failed
   */
  const checkTokenExpiration = useCallback(async (): Promise<string | null> => {
    const { access_token, refresh_token, expires_at } = store.auth;

    if (!access_token || !refresh_token) {
      return null;
    }

    // If token is expired or will expire in the next 5 minutes, refresh it
    const isExpiringSoon = expires_at
      ? expires_at < Date.now() + 5 * 60 * 1000
      : true;
    if (isExpiringSoon) {
      const success = await refreshAuth();
      return success ? store.auth.access_token : null;
    }

    return access_token;
  }, [store.auth, refreshAuth]);

  // Return the auth-related methods
  return {
    auth: store.auth,
    setAuthTokens,
    setUserProfile,
    setAuthError,
    setAuthLoading,
    handleCodeExchange,
    refreshAuth,
    checkTokenExpiration,
    logout,
    handleAuthError,
  };
};
