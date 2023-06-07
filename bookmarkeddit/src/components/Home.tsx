import { FC } from "react";
import styles from "./Home.module.scss";
import { Sun } from "./icons/Sun";
import { useStore } from "../hooks/use-store";
import { Moon } from "./icons/Moon";
import LOGO from "../assets/images/logo.svg";
import LOGO_WHITE from "../assets/images/logo_white.svg";

export const Home: FC = () => {
  const { store, changeTheme } = useStore();
  return (
    <>
      <div className={styles.icon}>
        <button id="theme" className="btn-icon" onClick={changeTheme}>
          {store.theme == "dark" ? <Sun /> : <Moon />}
        </button>
      </div>
      <div className={styles.main}>
        <img src={store.theme == "dark" ? LOGO_WHITE : LOGO} />
        <h1>Modern tool to organize your Reddit saved posts and comments</h1>
        <button>LOGIN</button>
      </div>
    </>
  );
};
