/**
 * Store Context for Bookmarkeddit
 * Central point for global state management based on React Context API
 */
import {
  createContext,
  Dispatch,
  FC,
  PropsWithChildren,
  SetStateAction,
  useEffect,
  useState,
} from "react";
import { initialAuthState, AuthState } from "./useAuthStore";
import {
  initialSettingsState,
  SettingsState,
  ThemeType,
  Layout,
  SortOption,
} from "./useSettingsStore";

/**
 * Main store interface combining all application state
 */
export interface StoreProps extends SettingsState {
  auth: AuthState;
}

// Initial default store values
export const initialStore: StoreProps = {
  ...initialSettingsState,
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
    const compactnessStr = localStorage.getItem("compactness");

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
      layout: layout || initialSettingsState.layout,
      sortBy: sortBy || initialSettingsState.sortBy,
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
