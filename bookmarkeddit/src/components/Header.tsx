import { FC } from "react";
import { useStore } from "../hooks/use-store";
import styles from "./Header.module.scss";
import { Sun } from "./icons/Sun";
import { Moon } from "./icons/Moon";
import LOGO from "../assets/images/logo.svg";
import LOGO_WHITE from "../assets/images/logo_white.svg";

export const Header: FC = () => {
  const { store, changeTheme } = useStore();

  return (
    <header className={styles.root}>
      <img src={store.theme == "dark" ? LOGO_WHITE : LOGO} />
      <button id="theme" className="btn-icon" onClick={changeTheme}>
        {store.theme == "dark" ? <Sun /> : <Moon />}
      </button>
    </header>
  );
};
