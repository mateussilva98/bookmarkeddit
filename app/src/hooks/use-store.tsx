/**
 * Global state management for Bookmarkeddit
 * Implements a custom store using React Context API
 */
import {
  createContext,
  Dispatch,
  FC,
  PropsWithChildren,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { UserProfile, authService } from "../api";

// Type definitions for store properties
type ThemeType = "dark" | "light";
type Layout = "grid" | "list";
type SortOption = "recent" | "upvotes" | "comments";

/**
 * User authentication state interface
 * Tracks tokens, expiration, user profile, and auth status
 */
interface AuthState {
  access_token: string | null;
  refresh_token: string | null;
  expires_at: number | null; // Timestamp when the token expires
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Initial auth state
const initialAuthState: AuthState = {
  access_token: null,
  refresh_token: null,
  expires_at: null,
  user: null,
  isAuthenticated: false,
  isLoading: true, // Start with loading true to check for stored tokens
  error: null,
};

/**
 * Main store interface with all application settings and state
 */
interface StoreProps {
  theme: ThemeType;
  layout: Layout;
  sortBy: SortOption;
  showImages: boolean;
  compactText: boolean;
  blurNSFW: boolean;
  showFilters: boolean; // Controls filters visibility
  auth: AuthState;
}

// Initial default store values
const initialStore: StoreProps = {
  theme: "dark",
  layout: "grid",
  sortBy: "recent",
  showImages: true,
  compactText: true,
  blurNSFW: true,
  showFilters: true, // Default to showing filters
  auth: initialAuthState,
};

// Create the context with default values
export const StoreContext = createContext<{
  store: StoreProps;
  setStore: Dispatch<SetStateAction<StoreProps>>;
}>({
  store: initialStore,
  setStore: () => {
    throw new Error("setStore must be used within a StoreProvider");
  },
});

// Use this to prevent initialization from running multiple times
// This prevents infinite loops in development mode with React.StrictMode
let globalAuthInitialized = false;

/**
 * Custom hook for accessing and manipulating the global store
 * Provides convenience methods for common state operations
 */
export const useStore = () => {
  const { store, setStore } = useContext(StoreContext);

  // UI Preferences functions

  /**
   * Toggle between light and dark theme
   */
  const changeTheme = () => {
    const newTheme = store.theme === "dark" ? "light" : "dark";
    document.body.classList.remove(store.theme);
    document.body.classList.add(newTheme);
    localStorage.setItem("theme", newTheme);
    setStore((currentStore) => ({ ...currentStore, theme: newTheme }));
  };

  /**
   * Change layout between grid and list views
   */
  const changeLayout = (layout: Layout) => {
    localStorage.setItem("layout", layout);
    setStore((currentStore) => ({ ...currentStore, layout }));
  };

  /**
   * Change sort order for posts
   */
  const changeSortBy = (sortBy: SortOption) => {
    localStorage.setItem("sortBy", sortBy);
    setStore((currentStore) => ({ ...currentStore, sortBy }));
  };

  /**
   * Toggle image display on/off
   */
  const toggleShowImages = () => {
    const newValue = !store.showImages;
    localStorage.setItem("showImages", newValue.toString());
    setStore((currentStore) => ({ ...currentStore, showImages: newValue }));
  };

  /**
   * Toggle compact text display on/off
   */
  const toggleCompactText = () => {
    const newValue = !store.compactText;
    localStorage.setItem("compactText", newValue.toString());
    setStore((currentStore) => ({ ...currentStore, compactText: newValue }));
  };

  /**
   * Toggle NSFW content blurring on/off
   */
  const toggleBlurNSFW = () => {
    const newValue = !store.blurNSFW;
    localStorage.setItem("blurNSFW", newValue.toString());
    setStore((currentStore) => ({ ...currentStore, blurNSFW: newValue }));
  };

  /**
   * Toggle filters sidebar visibility
   */
  const toggleFiltersVisibility = () => {
    const newValue = !store.showFilters;
    localStorage.setItem("showFilters", newValue.toString());
    setStore((currentStore) => ({ ...currentStore, showFilters: newValue }));
  };

  // Authentication functions

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

  // Track ongoing refresh promise to prevent multiple simultaneous refreshes
  const refreshPromiseRef = useRef<Promise<boolean> | null>(null);

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
      setAuthLoading(true);
      console.log("Initializing auth state from localStorage...");

      const accessToken = localStorage.getItem("access_token");
      const refreshToken = localStorage.getItem("refresh_token");
      const expiresAt = localStorage.getItem("expires_at");
      const userProfileStr = localStorage.getItem("user_profile");

      if (!accessToken || !refreshToken || !expiresAt) {
        console.log("No auth tokens found in localStorage");
        setAuthLoading(false);
        return;
      }

      console.log("Found auth tokens in localStorage");

      // Try to parse stored user profile if it exists
      let storedUserProfile: UserProfile | null = null;
      if (userProfileStr) {
        try {
          storedUserProfile = JSON.parse(userProfileStr) as UserProfile;
          console.log(
            "Using cached user profile from localStorage:",
            storedUserProfile.name
          );
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

      console.log("Auth state updated, isAuthenticated set to true", {
        hasUserProfile: !!storedUserProfile,
        userName: storedUserProfile?.name,
      });

      // Check if token is expired or will expire soon
      const expiresAtNum = parseInt(expiresAt);
      const isExpiringSoon = expiresAtNum < Date.now() + 5 * 60 * 1000;
      console.log("Token expiration check:", {
        expiresAt: new Date(expiresAtNum).toLocaleString(),
        isExpiringSoon,
        timeRemaining:
          Math.floor((expiresAtNum - Date.now()) / 1000) + " seconds",
      });

      try {
        if (isExpiringSoon) {
          console.log("Token is expiring soon, refreshing...");
          // Refresh the token if it's expiring soon
          await refreshAuth();
        } else if (!storedUserProfile) {
          console.log("Fetching user profile from API...");
          // Only fetch the user profile if we don't have it stored
          const userProfile = await authService.getUserProfile(accessToken);
          setUserProfile(userProfile);
        }
        console.log("Auth initialization complete, setting isLoading to false");
        setAuthLoading(false);
      } catch (error) {
        console.error("Error during auth initialization:", error);
        // If there's an error, attempt to refresh the token
        if (!isExpiringSoon) {
          await refreshAuth();
        } else {
          setAuthLoading(false);
        }
      }
    };

    initializeAuthState();
    // Only include dependencies that won't change with every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    store,
    setStore,
    // UI preferences
    changeTheme,
    changeLayout,
    changeSortBy,
    toggleShowImages,
    toggleCompactText,
    toggleBlurNSFW,
    toggleFiltersVisibility,
    // Auth methods
    setAuthTokens,
    setUserProfile,
    setAuthError,
    setAuthLoading,
    handleCodeExchange,
    refreshAuth,
    checkTokenExpiration,
    logout,
  };
};

/**
 * Store Provider component that wraps the application
 * Initializes the store and provides it to all child components
 */
export const StoreProvider: FC<PropsWithChildren> = ({ children }) => {
  const [store, setStore] = useState<StoreProps>(initialStore);

  // Initialize UI preferences from localStorage
  useEffect(() => {
    const theme = localStorage.getItem("theme") as ThemeType | null;
    const layout = localStorage.getItem("layout") as Layout | null;
    const sortBy = localStorage.getItem("sortBy") as SortOption | null;
    const showImagesStr = localStorage.getItem("showImages");
    const compactTextStr = localStorage.getItem("compactText");
    const blurNSFWStr = localStorage.getItem("blurNSFW");
    const showFiltersStr = localStorage.getItem("showFilters");

    const showImages = showImagesStr !== null ? showImagesStr === "true" : true;
    const compactText =
      compactTextStr !== null ? compactTextStr === "true" : true;
    const blurNSFW = blurNSFWStr !== null ? blurNSFWStr === "true" : true;
    const showFilters =
      showFiltersStr !== null ? showFiltersStr === "true" : true;

    // Apply theme to body
    if (theme) {
      document.body.classList.add(theme);
      setStore((currentStore) => ({
        ...currentStore,
        theme: theme,
      }));
    } else {
      document.body.classList.add("dark");
    }

    // Update store with UI preferences
    setStore((currentStore) => ({
      ...currentStore,
      layout: layout || initialStore.layout,
      sortBy: sortBy || initialStore.sortBy,
      showImages,
      compactText,
      blurNSFW,
      showFilters,
    }));
  }, []);

  return (
    <StoreContext.Provider value={{ store, setStore }}>
      {children}
    </StoreContext.Provider>
  );
};
