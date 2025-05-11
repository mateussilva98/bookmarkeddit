/**
 * Settings store for Bookmarkeddit
 * Manages UI preferences like theme, layout, and display options
 */
import { useCallback, useContext } from "react";
import { StoreContext } from "./StoreContext.tsx";

// Type definitions for store properties
export type ThemeType = "dark" | "light";
export type Layout = "grid" | "list";
export type SortOption = "recent" | "upvotes" | "comments";

/**
 * Settings state interface
 */
export interface SettingsState {
  theme: ThemeType;
  layout: Layout;
  sortBy: SortOption;
  showImages: boolean;
  compactText: boolean;
  blurNSFW: boolean;
  showFilters: boolean; // Controls filters visibility
}

// Initial settings state
export const initialSettingsState: SettingsState = {
  theme: "dark",
  layout: "grid",
  sortBy: "recent",
  showImages: true,
  compactText: true,
  blurNSFW: true,
  showFilters: true, // Default to showing filters
};

/**
 * Custom hook for managing UI settings and preferences
 */
export const useSettingsStore = () => {
  const { store, setStore } = useContext(StoreContext);

  /**
   * Toggle between light and dark theme
   */
  const changeTheme = useCallback(() => {
    const newTheme = store.theme === "dark" ? "light" : "dark";
    document.body.classList.remove(store.theme);
    document.body.classList.add(newTheme);
    localStorage.setItem("theme", newTheme);
    setStore((currentStore) => ({ ...currentStore, theme: newTheme }));
  }, [store.theme, setStore]);

  /**
   * Change layout between grid and list views
   */
  const changeLayout = useCallback(
    (layout: Layout) => {
      localStorage.setItem("layout", layout);
      setStore((currentStore) => ({ ...currentStore, layout }));
    },
    [setStore]
  );

  /**
   * Change sort order for posts
   */
  const changeSortBy = useCallback(
    (sortBy: SortOption) => {
      localStorage.setItem("sortBy", sortBy);
      setStore((currentStore) => ({ ...currentStore, sortBy }));
    },
    [setStore]
  );

  /**
   * Toggle image display on/off
   */
  const toggleShowImages = useCallback(() => {
    const newValue = !store.showImages;
    localStorage.setItem("showImages", newValue.toString());
    setStore((currentStore) => ({ ...currentStore, showImages: newValue }));
  }, [store.showImages, setStore]);

  /**
   * Toggle compact text display on/off
   */
  const toggleCompactText = useCallback(() => {
    const newValue = !store.compactText;
    localStorage.setItem("compactText", newValue.toString());
    setStore((currentStore) => ({ ...currentStore, compactText: newValue }));
  }, [store.compactText, setStore]);

  /**
   * Toggle NSFW content blurring on/off
   */
  const toggleBlurNSFW = useCallback(() => {
    const newValue = !store.blurNSFW;
    localStorage.setItem("blurNSFW", newValue.toString());
    setStore((currentStore) => ({ ...currentStore, blurNSFW: newValue }));
  }, [store.blurNSFW, setStore]);

  /**
   * Toggle filters sidebar visibility
   */
  const toggleFiltersVisibility = useCallback(() => {
    const newValue = !store.showFilters;
    localStorage.setItem("showFilters", newValue.toString());
    setStore((currentStore) => ({ ...currentStore, showFilters: newValue }));
  }, [store.showFilters, setStore]);

  // Return the settings and related methods
  return {
    // Settings properties
    theme: store.theme,
    layout: store.layout,
    sortBy: store.sortBy,
    showImages: store.showImages,
    compactText: store.compactText,
    blurNSFW: store.blurNSFW,
    showFilters: store.showFilters,

    // Methods
    changeTheme,
    changeLayout,
    changeSortBy,
    toggleShowImages,
    toggleCompactText,
    toggleBlurNSFW,
    toggleFiltersVisibility,
  };
};
