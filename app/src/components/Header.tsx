import { FC, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Header.module.scss";
import { Settings } from "./icons/Settings";
import { Filter } from "./icons/Filter";
import LOGO from "../assets/images/logo.svg";
import LOGO_WHITE from "../assets/images/logo_white.svg";
import { useStore } from "../hooks/useStore";

interface HeaderProps {
  onSettingsClick?: () => void;
  onFilterClick?: () => void;
}

export const Header: FC<HeaderProps> = ({ onSettingsClick, onFilterClick }) => {
  const { store, logout } = useStore();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState<boolean>(false);

  // Check for mobile screen size on mount and window resize
  useEffect(() => {
    const checkMobileView = () => {
      setIsMobile(window.innerWidth <= 480);
    };

    // Initial check
    checkMobileView();

    // Add event listener for window resize
    window.addEventListener("resize", checkMobileView);

    // Clean up
    return () => window.removeEventListener("resize", checkMobileView);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const openUserProfile = () => {
    window.open(
      `https://www.reddit.com/user/${store.auth.user?.name}`,
      "_blank"
    );
  };
  return (
    <header className={styles.root}>
      <div className={styles.logoContainer}>
        <img
          src={store.theme === "dark" ? LOGO_WHITE : LOGO}
          alt="Bookmarkeddit logo"
          className={styles.logo}
        />{" "}
      </div>{" "}
      {isMobile && onFilterClick && (
        <div className={styles.mobileFilterButton}>
          <button
            className={`btn-icon ${styles.filterButton}`}
            onClick={onFilterClick}
            aria-label="Filters"
          >
            <Filter />
          </button>
        </div>
      )}
      <div className={styles.userSection}>
        {store.auth.user && (
          <div
            className={styles.userInfo}
            onClick={openUserProfile}
            style={{ cursor: "pointer" }}
            title={`Open u/${store.auth.user.name}'s Reddit profile`}
          >
            {store.auth.user.icon_img && (
              <img
                src={store.auth.user.icon_img.split("?")[0]}
                alt={`${store.auth.user.name}'s profile`}
                className={styles.userAvatar}
              />
            )}
            <span className={styles.username}>u/{store.auth.user.name}</span>
          </div>
        )}{" "}
        <div className={styles.buttons}>
          <button
            id="settings"
            className="btn-icon"
            onClick={onSettingsClick}
            aria-label="Settings"
          >
            <Settings />
          </button>

          <button
            className={styles.logoutBtn}
            onClick={handleLogout}
            aria-label="Logout"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};
