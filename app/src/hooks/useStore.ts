/**
 * useStore hook - Main entry point for accessing global store
 * Combines authentication and settings stores
 */
import { useContext, useEffect } from "react";
import { StoreContext } from "./store/StoreContext.tsx";
import { useAuthStore } from "./store/useAuthStore";
import { useSettingsStore } from "./store/useSettingsStore";
import { authService } from "../api";

// Global variable to prevent multiple initialization
let globalAuthInitialized = false;

// Re-export the provider for convenience
export { StoreProvider } from "./store/StoreContext.tsx";

/**
 * Custom hook for accessing and manipulating the global store
 * Provides combined access to both auth and settings state
 */
export const useStore = () => {
  const { store, setStore } = useContext(StoreContext);

  // Get authentication and settings functions from separated stores
  const auth = useAuthStore();
  const settings = useSettingsStore();

  // Initialize auth state from localStorage
  useEffect(() => {
    // CRITICAL: Skip initialization if already done
    // This prevents infinite loops when store updates trigger re-renders
    if (globalAuthInitialized) {
      return;
    }

    // Mark as initialized globally
    globalAuthInitialized = true;

    const initializeAuthState = async () => {
      auth.setAuthLoading(true);
      // Initialize authentication state by retrieving tokens from localStorage

      const accessToken = localStorage.getItem("access_token");
      const refreshToken = localStorage.getItem("refresh_token");
      const expiresAt = localStorage.getItem("expires_at");
      const userProfileStr = localStorage.getItem("user_profile");
      if (!accessToken || !refreshToken || !expiresAt) {
        // No authentication tokens found, abort initialization
        auth.setAuthLoading(false);
        return;
      }
      // Authentication tokens found in localStorage

      // Try to parse stored user profile if it exists
      let storedUserProfile: any = null;
      if (userProfileStr) {
        try {
          // Successfully parsed user profile from local storage
          storedUserProfile = JSON.parse(userProfileStr);
        } catch (e) {
          console.error("Failed to parse stored user profile:", e);
        }
      }

      // Update store with saved tokens and user profile
      setStore((currentStore) => ({
        ...currentStore,
        auth: {
          ...currentStore.auth,
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: parseInt(expiresAt),
          isAuthenticated: true,
          user: storedUserProfile,
        },
      }));

      // Authentication state updated in store with user profile and tokens

      // Check if token is expired or will expire soon (5 minutes buffer)
      const expiresAtNum = parseInt(expiresAt);
      const isExpiringSoon = expiresAtNum < Date.now() + 5 * 60 * 1000;
      try {
        if (isExpiringSoon) {
          // Token is about to expire, initiating refresh process
          await auth.refreshAuth();
        } else if (!storedUserProfile) {
          // No user profile in cache, fetching from API
          const userProfile = await authService.getUserProfile(accessToken);
          auth.setUserProfile(userProfile);
        }
        // Auth initialization completed successfully
        auth.setAuthLoading(false);
      } catch (error) {
        console.error("Error during auth initialization:", error);
        // If there's an error, attempt to refresh the token
        if (!isExpiringSoon) {
          await auth.refreshAuth();
        } else {
          auth.setAuthLoading(false);
        }
      }
    };

    initializeAuthState();
    // Only include dependencies that won't change with every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Return combined store functions and properties
  return {
    store,
    setStore,

    // Auth state and methods
    auth: store.auth,
    setAuthTokens: auth.setAuthTokens,
    setUserProfile: auth.setUserProfile,
    setAuthError: auth.setAuthError,
    setAuthLoading: auth.setAuthLoading,
    handleCodeExchange: auth.handleCodeExchange,
    refreshAuth: auth.refreshAuth,
    checkTokenExpiration: auth.checkTokenExpiration,
    logout: auth.logout,
    handleAuthError: auth.handleAuthError,

    // Settings state and methods
    theme: store.theme,
    layout: store.layout,
    sortBy: store.sortBy,
    showImages: store.showImages,
    compactText: store.compactText,
    blurNSFW: store.blurNSFW,
    showFilters: store.showFilters,
    changeTheme: settings.changeTheme,
    changeLayout: settings.changeLayout,
    changeSortBy: settings.changeSortBy,
    toggleShowImages: settings.toggleShowImages,
    toggleCompactText: settings.toggleCompactText,
    toggleBlurNSFW: settings.toggleBlurNSFW,
    toggleFiltersVisibility: settings.toggleFiltersVisibility,
  };
};
