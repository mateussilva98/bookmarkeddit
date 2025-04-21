import { FC } from "react";
import styles from "./Header.module.scss";
import { Sun } from "./icons/Sun";
import { Moon } from "./icons/Moon";
import { Settings } from "./icons/Settings";
import LOGO from "../assets/images/logo.svg";
import LOGO_WHITE from "../assets/images/logo_white.svg";
import { useStore } from "../hooks/use-store";

interface HeaderProps {
  onSettingsClick?: () => void;
}

export const Header: FC<HeaderProps> = ({ onSettingsClick }) => {
  const { store, changeTheme } = useStore();

  return (
    <header className={styles.root}>
      <img src={store.theme == "dark" ? LOGO_WHITE : LOGO} />
      <div className={styles.buttons}>
        <button id="settings" className="btn-icon" onClick={onSettingsClick}>
          <Settings />
        </button>
        <button id="theme" className="btn-icon" onClick={changeTheme}>
          {store.theme == "dark" ? <Sun /> : <Moon />}
        </button>
      </div>
    </header>
  );
};
