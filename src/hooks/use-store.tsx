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

interface StoreProps {
  theme: ThemeType;
  access_token: string;
  refresh_token: string;
}

const initialStore: StoreProps = {
  theme: "dark",
  access_token: "",
  refresh_token: "",
};

export const StoreContext = createContext<{
  store: StoreProps;
  setStore: Dispatch<SetStateAction<StoreProps>>;
}>({ store: initialStore, setStore: () => {} });

export const useStore = () => {
  const { store, setStore } = useContext(StoreContext);

  function changeTheme() {
    const newTheme = store.theme === "dark" ? "light" : "dark";
    document.body.classList.remove(store.theme);
    document.body.classList.add(newTheme);
    //document.documentElement.style.colorScheme = newTheme;
    localStorage.setItem("theme", newTheme);
    setStore((currentStore) => ({ ...currentStore, theme: newTheme }));
  }

  function setAccessToken(token: string) {
    localStorage.setItem("access_token", token);
    setStore((currentStore) => ({ ...currentStore, access_token: token }));
  }

  function setRefreshToken(token: string) {
    localStorage.setItem("refresh_token", token);
    setStore((currentStore) => ({ ...currentStore, refresh_token: token }));
  }

  return {
    store,
    setStore,
    changeTheme,
    setAccessToken,
    setRefreshToken,
  };
};

export const StoreProvider: FC<PropsWithChildren> = ({ children }) => {
  const [store, setStore] = useState<StoreProps>(initialStore);

  useEffect(() => {
    const theme = localStorage.getItem("theme");

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
  }, []);

  return (
    <StoreContext.Provider value={{ store, setStore }}>
      {children}
    </StoreContext.Provider>
  );
};
