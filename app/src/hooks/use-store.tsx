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

type ThemeType = "dark" | "light";

type Layout = "grid" | "list";

type SortOption = "recent" | "upvotes" | "comments";

type Compactness = "compact" | "normal";

/* type SortOrder = "asc" | "desc";

type Language = "en" | "es" | "fr" | "de" | "it" | "pt" | "ru" | "zh" | "ja"; */

interface StoreProps {
  theme: ThemeType;
  access_token: string | null;
  refresh_token: string | null;
  layout: Layout;
  sortBy: SortOption;
  compactness: Compactness;
  //sortOrder: SortOrder;
  //language: Language;
}

const initialStore: StoreProps = {
  theme: "dark",
  access_token: "",
  refresh_token: "",
  layout: "grid",
  sortBy: "recent",
  compactness: "normal",
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

  // This useEffect initializes authentication state by retrieving access and refresh tokens
  // from localStorage on component mount. It runs only once.
  useEffect(() => {
    const initializeAuthState = () => {
      const accessToken = localStorage.getItem("access_token");
      const refreshToken = localStorage.getItem("refresh_token");

      setStore((currentStore) => ({
        ...currentStore,
        access_token: accessToken || null,
        refresh_token: refreshToken || null,
      }));
    };

    initializeAuthState();
  }, []);

  function changeTheme() {
    const newTheme = store.theme === "dark" ? "light" : "dark";
    document.body.classList.remove(store.theme);
    document.body.classList.add(newTheme);
    //document.documentElement.style.colorScheme = newTheme;
    localStorage.setItem("theme", newTheme);
    setStore((currentStore) => ({ ...currentStore, theme: newTheme }));
  }

  function changeLayout(layout: Layout) {
    localStorage.setItem("layout", layout);
    setStore((currentStore) => ({ ...currentStore, layout }));
  }

  function changeSortBy(sortBy: SortOption) {
    localStorage.setItem("sortBy", sortBy);
    setStore((currentStore) => ({ ...currentStore, sortBy }));
  }

  function changeCompactness(compactness: Compactness) {
    localStorage.setItem("compactness", compactness);
    setStore((currentStore) => ({ ...currentStore, compactness }));
  }

  function setAccessToken(token: string) {
    localStorage.setItem("access_token", token);
    setStore((currentStore) => ({ ...currentStore, access_token: token }));
  }

  function setRefreshToken(token: string) {
    localStorage.setItem("refresh_token", token);
    setStore((currentStore) => ({ ...currentStore, refresh_token: token }));
  }

  function getAccessToken() {
    return store.access_token;
  }

  return {
    store,
    setStore,
    changeTheme,
    changeLayout,
    changeSortBy,
    changeCompactness,
    setAccessToken,
    setRefreshToken,
    getAccessToken,
  };
};

export const StoreProvider: FC<PropsWithChildren> = ({ children }) => {
  const [store, setStore] = useState<StoreProps>(initialStore);

  // This useEffect initializes UI preferences (theme, layout, sortBy, compactness) by retrieving values
  // from localStorage on component mount. It also applies the theme to the document body.
  // It runs only once when the StoreProvider is mounted.
  useEffect(() => {
    const theme = localStorage.getItem("theme");
    const layout = localStorage.getItem("layout");
    const sortBy = localStorage.getItem("sortBy");
    const compactness = localStorage.getItem("compactness");

    if (theme) {
      document.body.classList.add(theme);
      setStore((currentStore) => ({
        ...currentStore,
        theme: theme as ThemeType,
      }));
      //document.documentElement.style.colorScheme = theme;
    } else {
      document.body.classList.add("dark");
      //localStorage.setItem("theme", "dark");
      //document.documentElement.style.colorScheme = "dark";
    }

    if (layout) {
      setStore((currentStore) => ({
        ...currentStore,
        layout: layout as Layout,
      }));
    }

    if (sortBy) {
      setStore((currentStore) => ({
        ...currentStore,
        sortBy: sortBy as SortOption,
      }));
    }

    if (compactness) {
      setStore((currentStore) => ({
        ...currentStore,
        compactness: compactness as Compactness,
      }));
    }
  }, []);

  return (
    <StoreContext.Provider value={{ store, setStore }}>
      {children}
    </StoreContext.Provider>
  );
};
