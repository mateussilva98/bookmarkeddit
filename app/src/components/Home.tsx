import { FC, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Home.module.scss";
import { Sun } from "./icons/Sun";
import { useStore } from "../hooks/use-store";
import { Moon } from "./icons/Moon";
import LOGO from "../assets/images/logo.svg";
import LOGO_WHITE from "../assets/images/logo_white.svg";
import { authService } from "../api";

export const Home: FC = () => {
  const { store, changeTheme } = useStore();
  const navigate = useNavigate();

  // Redirect to posts page if already authenticated
  useEffect(() => {
    if (store.auth.isAuthenticated && !store.auth.isLoading) {
      navigate("/posts");
    }
  }, [store.auth.isAuthenticated, store.auth.isLoading, navigate]);

  const handleLogin = () => {
    const loginUrl = authService.getLoginUrl();
    window.location.href = loginUrl;
  };

  // Show loading spinner while checking auth status
  if (store.auth.isLoading) {
    return (
      <div className={styles.main}>
        <div className={styles.loader}></div>
      </div>
    );
  }

  return (
    <>
      <div className={styles.icon}>
        <button id="theme" className="btn-icon" onClick={changeTheme}>
          {store.theme == "dark" ? <Sun /> : <Moon />}
        </button>
      </div>
      <div className={styles.main}>
        <img
          src={store.theme == "dark" ? LOGO_WHITE : LOGO}
          alt="Bookmarkeddit logo"
        />
        <h1>Modern tool to organize your Reddit saved posts and comments</h1>

        <div className={styles.features}>
          <ul>
            <li>Safely connect to your Reddit account</li>
            <li>Search for anything using our smart search</li>
            <li>Filter by subreddit, post type, or content</li>
            <li>Unsave no longer necessary posts</li>
          </ul>
        </div>

        <button onClick={handleLogin} className={styles.loginButton}>
          LOGIN WITH REDDIT
        </button>

        <div className={styles.permissions}>
          <h3>Required Permissions</h3>
          <div className={styles.permissionsList}>
            <div className={styles.permissionItem}>
              <span className={styles.permissionName}>identity</span>
              <span className={styles.permissionDesc}>
                To see your username and profile picture
              </span>
            </div>
            <div className={styles.permissionItem}>
              <span className={styles.permissionName}>history</span>
              <span className={styles.permissionDesc}>
                To access your saved posts
              </span>
            </div>
            <div className={styles.permissionItem}>
              <span className={styles.permissionName}>save</span>
              <span className={styles.permissionDesc}>
                To unsave posts when requested
              </span>
            </div>
          </div>
          <p className={styles.privacyNote}>
            Your data never leaves your browser. We don't store any of your
            Reddit information on our servers.
          </p>
        </div>
      </div>
    </>
  );
};
