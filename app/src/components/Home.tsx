import { FC, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Home.module.scss";
import { Sun } from "./icons/Sun";
import { useStore } from "../hooks/use-store";
import { Moon } from "./icons/Moon";
import { Search } from "./icons/Search";
import { Refresh } from "./icons/Refresh";
import { Chart } from "./icons/Chart";
import { Lock } from "./icons/Lock";
import LOGO from "../assets/images/logo.svg";
import LOGO_WHITE from "../assets/images/logo_white.svg";
import { authService } from "../api";

export const Home: FC = () => {
  const { store, changeTheme } = useStore();
  const navigate = useNavigate();
  const featureCardsRef = useRef<(HTMLDivElement | null)[]>([]);

  // Redirect to posts page if already authenticated
  useEffect(() => {
    if (store.auth.isAuthenticated && !store.auth.isLoading) {
      navigate("/posts");
    }
  }, [store.auth.isAuthenticated, store.auth.isLoading, navigate]);

  // Handle the 3D tilt effect for feature cards
  useEffect(() => {
    const cards = featureCardsRef.current.filter((card) => card !== null);
    const eventHandlers = new Map();

    const handleMouseMove = (e: MouseEvent, card: HTMLDivElement) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left; // x position within the element
      const y = e.clientY - rect.top; // y position within the element

      // Calculate the position relative to the center of the card (in %)
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Reduced max tilt to 7 degrees for a more subtle effect
      const percentX = ((x - centerX) / centerX) * 7;
      const percentY = ((y - centerY) / centerY) * -7;

      // Apply the transform
      card.style.transform = `perspective(1000px) rotateX(${percentY}deg) rotateY(${percentX}deg) scale3d(1.01, 1.01, 1.01)`;
    };

    const handleMouseLeave = (card: HTMLDivElement) => {
      // Reset the transform when mouse leaves
      card.style.transform =
        "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
    };

    // Add event listeners to each card
    cards.forEach((card) => {
      if (card) {
        // Create unique handlers for this card and store references
        const moveHandler = (e: Event) =>
          handleMouseMove(e as MouseEvent, card);
        const leaveHandler = () => handleMouseLeave(card);

        // Store handlers in the Map so we can remove them later
        eventHandlers.set(card, { moveHandler, leaveHandler });

        card.addEventListener("mousemove", moveHandler);
        card.addEventListener("mouseleave", leaveHandler);
      }
    });

    // Clean up event listeners
    return () => {
      cards.forEach((card) => {
        if (card && eventHandlers.has(card)) {
          const { moveHandler, leaveHandler } = eventHandlers.get(card);
          card.removeEventListener("mousemove", moveHandler);
          card.removeEventListener("mouseleave", leaveHandler);
        }
      });
    };
  }, []);

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
            <div
              className={styles.featureCard}
              ref={(el) => (featureCardsRef.current[0] = el)}
            >
              <div className={styles.shine}></div>
              <span className={styles.featureIcon}>
                <Search />
              </span>
              <h3>Smart Search</h3>
              <p>
                Find anything in your saved content with powerful search
                capabilities
              </p>
            </div>
            <div
              className={styles.featureCard}
              ref={(el) => (featureCardsRef.current[1] = el)}
            >
              <div className={styles.shine}></div>
              <span className={styles.featureIcon}>
                <Refresh />
              </span>
              <h3>Sync & Organize</h3>
              <p>Keep your Reddit saves organized and easily accessible</p>
            </div>
            <div
              className={styles.featureCard}
              ref={(el) => (featureCardsRef.current[2] = el)}
            >
              <div className={styles.shine}></div>
              <span className={styles.featureIcon}>
                <Chart />
              </span>
              <h3>Smart Filters</h3>
              <p>
                Filter by subreddit, post type, or content to find exactly what
                you need
              </p>
            </div>
            <div
              className={styles.featureCard}
              ref={(el) => (featureCardsRef.current[3] = el)}
            >
              <div className={styles.shine}></div>
              <span className={styles.featureIcon}>
                <Lock />
              </span>
              <h3>Privacy First</h3>
              <p>
                Your data never leaves your browser - complete privacy
                guaranteed
              </p>
            </div>
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
      </div>
    </div>
  );
};
