import { FC, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Home.module.scss";
import { Sun } from "../components/icons/Sun";
import { useStore } from "../hooks/useStore";
import { Moon } from "../components/icons/Moon";
import { Search } from "../components/icons/Search";
import { Refresh } from "../components/icons/Refresh";
import { Chart } from "../components/icons/Chart";
import { Lock } from "../components/icons/Lock";
import LOGO from "../assets/images/logo.svg";
import LOGO_WHITE from "../assets/images/logo_white.svg";
import MOCKUP_DESKTOP from "../assets/demo/mockup_desktop.png";
import MOCKUP_MOBILE from "../assets/demo/mockup_mobile.png";
import { authService } from "../api";
import { FeatureCard } from "../components/ui/FeatureCard";

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
    <div className={styles.container}>
      <div className={styles.icon}>
        <button id="theme" className="btn-icon" onClick={changeTheme}>
          {store.theme == "dark" ? <Sun /> : <Moon />}
        </button>
      </div>

      <div className={styles.main}>
        <div className={styles.heroSection}>
          <img
            src={store.theme == "dark" ? LOGO_WHITE : LOGO}
            alt="Bookmarkeddit logo"
            className={styles.logo}
          />
          <h1 className={styles.title}>
            Reddit's missing save manager: Finally organize what matters to you
          </h1>
          <p className={styles.subtitle}>
            Organize, filter, and rediscover your saved Reddit content with ease
          </p>

          <button onClick={handleLogin} className={styles.loginButton}>
            LOGIN WITH REDDIT
          </button>
        </div>

        <div className={styles.featuresSection}>
          <h2>Key Features</h2>
          <div className={styles.featuresGrid}>
            <FeatureCard
              icon={<Search />}
              title="Smart Search"
              description="Find anything in your saved content with powerful search capabilities"
            />
            <FeatureCard
              icon={<Refresh />}
              title="Sync & Organize"
              description="Keep your Reddit saves organized and easily accessible"
            />
            <FeatureCard
              icon={<Chart />}
              title="Smart Filters"
              description="Filter by subreddit, post type, or content to find exactly what you need"
            />
            <FeatureCard
              icon={<Lock />}
              title="Privacy First"
              description="Your data never leaves your browser - complete privacy guaranteed"
            />
          </div>
        </div>

        <div className={styles.appPreviewSection}>
          <h2>App Preview</h2>
          <div className={styles.appPreviewImages}>
            <img
              src={MOCKUP_DESKTOP}
              alt="Desktop preview of Bookmarkeddit showing saved Reddit posts"
              className={styles.desktopPreview}
            />
            <img
              src={MOCKUP_MOBILE}
              alt="Mobile preview of Bookmarkeddit interface displaying organized Reddit saves"
              className={styles.mobilePreview}
            />
          </div>
          <div className={styles.appPreviewLinks}>
            <a
              href="https://imgur.com/a/5c7KBQm"
              target="_blank"
              rel="noopener noreferrer"
            >
              Desktop Video Demo
            </a>
            <a
              href="https://imgur.com/a/GQWOYfW"
              target="_blank"
              rel="noopener noreferrer"
            >
              Mobile Video Demo
            </a>
          </div>
        </div>

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

        <footer className={styles.footer}>
          <p>
            Created by{" "}
            <a
              href="https://github.com/mateussilva98/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Mateus Silva
            </a>{" "}
            •
            <a
              href="https://github.com/mateussilva98/bookmarkeddit"
              target="_blank"
              rel="noopener noreferrer"
            >
              {" "}
              Source Code
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
};
