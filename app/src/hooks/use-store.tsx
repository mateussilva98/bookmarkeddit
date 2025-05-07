import {
  createContext,
  Dispatch,
  FC,
  PropsWithChildren,
  SetStateAction,
  useContext,
  useEffect,
  useState,
} from "react";
import { AuthTokenResponse, UserProfile, authService } from "../api";

type ThemeType = "dark" | "light";
type Layout = "grid" | "list";
type SortOption = "recent" | "upvotes" | "comments";
type Compactness = "compact" | "normal";

// User authentication state
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

interface StoreProps {
  theme: ThemeType;
  layout: Layout;
  sortBy: SortOption;
  compactness: Compactness;
  showImages: boolean;
  compactText: boolean;
  blurNSFW: boolean;
  showFilters: boolean; // New property for filters visibility
  auth: AuthState;
}

const initialStore: StoreProps = {
  theme: "dark",
  layout: "grid",
  sortBy: "recent",
  compactness: "normal",
  showImages: true,
  compactText: true,
  blurNSFW: true,
  showFilters: true, // Default to showing filters
  auth: initialAuthState,
};

export const StoreContext = createContext<{
  store: StoreProps;
  setStore: Dispatch<SetStateAction<StoreProps>>;
}>({
  store: initialStore,
  setStore: () => {
    throw new Error("setStore must be used within a StoreProvider");
  },
});

export const useStore = () => {
  const { store, setStore } = useContext(StoreContext);

  // UI Preferences functions
  const changeTheme = () => {
    const newTheme = store.theme === "dark" ? "light" : "dark";
    document.body.classList.remove(store.theme);
    document.body.classList.add(newTheme);
    localStorage.setItem("theme", newTheme);
    setStore((currentStore) => ({ ...currentStore, theme: newTheme }));
  };

  const changeLayout = (layout: Layout) => {
    localStorage.setItem("layout", layout);
    setStore((currentStore) => ({ ...currentStore, layout }));
  };

  const changeSortBy = (sortBy: SortOption) => {
    localStorage.setItem("sortBy", sortBy);
    setStore((currentStore) => ({ ...currentStore, sortBy }));
  };

  const changeCompactness = (compactness: Compactness) => {
    localStorage.setItem("compactness", compactness);
    setStore((currentStore) => ({ ...currentStore, compactness }));
  };

  const toggleShowImages = () => {
    const newValue = !store.showImages;
    localStorage.setItem("showImages", newValue.toString());
    setStore((currentStore) => ({ ...currentStore, showImages: newValue }));
  };

  const toggleCompactText = () => {
    const newValue = !store.compactText;
    localStorage.setItem("compactText", newValue.toString());
    setStore((currentStore) => ({ ...currentStore, compactText: newValue }));
  };

  const toggleBlurNSFW = () => {
    const newValue = !store.blurNSFW;
    localStorage.setItem("blurNSFW", newValue.toString());
    setStore((currentStore) => ({ ...currentStore, blurNSFW: newValue }));
  };

  const toggleFiltersVisibility = () => {
    const newValue = !store.showFilters;
    localStorage.setItem("showFilters", newValue.toString());
    setStore((currentStore) => ({ ...currentStore, showFilters: newValue }));
  };

  // Authentication functions
  const setAuthTokens = (
    accessToken: string,
    refreshToken: string,
    expiresIn: number
  ) => {
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
  };

  const setUserProfile = (user: UserProfile) => {
    setStore((currentStore) => ({
      ...currentStore,
      auth: {
        ...currentStore.auth,
        user,
      },
    }));
  };

  const setAuthError = (error: string) => {
    setStore((currentStore) => ({
      ...currentStore,
      auth: {
        ...currentStore.auth,
        error,
        isLoading: false,
      },
    }));
  };

  const setAuthLoading = (isLoading: boolean) => {
    setStore((currentStore) => ({
      ...currentStore,
      auth: {
        ...currentStore.auth,
        isLoading,
      },
    }));
  };

  // Track ongoing refresh promise to prevent multiple simultaneous refreshes
  let refreshPromise: Promise<boolean> | null = null;

  // Handle OAuth code exchange and token refresh
  const handleCodeExchange = async (code: string): Promise<boolean> => {
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
    }
  };

  const refreshAuth = async (): Promise<boolean> => {
    if (refreshPromise) {
      // If a refresh is already in progress, return the same promise
      return refreshPromise;
    }
    const refreshToken = store.auth.refresh_token;
    if (!refreshToken) {
      setAuthError("No refresh token available");
      return false;
    }
    refreshPromise = (async () => {
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
        refreshPromise = null; // Reset promise after completion
      }
    })();
    return refreshPromise;
  };

  const checkTokenExpiration = async (): Promise<string | null> => {
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
  };

  const logout = () => {
    // Clear localStorage immediately to complete the logout
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("expires_at");

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
  };

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuthState = async () => {
      setAuthLoading(true);

      const accessToken = localStorage.getItem("access_token");
      const refreshToken = localStorage.getItem("refresh_token");
      const expiresAt = localStorage.getItem("expires_at");

      if (!accessToken || !refreshToken || !expiresAt) {
        setAuthLoading(false);
        return;
      }

      // Update store with saved tokens
      setStore((currentStore) => ({
        ...currentStore,
        auth: {
          ...currentStore.auth,
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: parseInt(expiresAt),
          isAuthenticated: true,
        },
      }));

      // Check if token is expired or will expire soon
      const expiresAtNum = parseInt(expiresAt);
      const isExpiringSoon = expiresAtNum < Date.now() + 5 * 60 * 1000;

      try {
        if (isExpiringSoon) {
          // Refresh the token if it's expiring soon
          await refreshAuth();
        } else {
          // Otherwise just fetch the user profile
          const userProfile = await authService.getUserProfile(accessToken);
          setUserProfile(userProfile);
          setAuthLoading(false);
        }
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
  }, []);

  return {
    store,
    setStore,
    // UI preferences
    changeTheme,
    changeLayout,
    changeSortBy,
    changeCompactness,
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

export const StoreProvider: FC<PropsWithChildren> = ({ children }) => {
  const [store, setStore] = useState<StoreProps>(initialStore);

  // Initialize UI preferences from localStorage
  useEffect(() => {
    const theme = localStorage.getItem("theme") as ThemeType | null;
    const layout = localStorage.getItem("layout") as Layout | null;
    const sortBy = localStorage.getItem("sortBy") as SortOption | null;
    const compactness = localStorage.getItem(
      "compactness"
    ) as Compactness | null;
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
      compactness: compactness || initialStore.compactness,
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
