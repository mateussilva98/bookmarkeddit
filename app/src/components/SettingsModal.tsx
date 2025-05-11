import { FC, useEffect, useRef } from "react";
import { X } from "./icons/X";
import { Sun } from "./icons/Sun";
import { Moon } from "./icons/Moon";
import styles from "./SettingsModal.module.scss";
import { useStore } from "../hooks/useStore";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    store,
    changeTheme,
    toggleCompactText,
    toggleShowImages,
    toggleBlurNSFW,
  } = useStore();

  const modalRef = useRef<HTMLDivElement>(null);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Handle click outside modal
  const handleOverlayClick = (event: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal} ref={modalRef}>
        <div className={styles.header}>
          <h2>Settings</h2>
          <button className="btn-icon" onClick={onClose}>
            <X />
          </button>
        </div>
        <div className={styles.content}>
          <div className={styles.settingItem}>
            <div className={styles.settingInfo}>
              <div className={styles.settingTitle}>Enable Dark Mode</div>
              <div className={styles.settingDescription}>
                Change the appearance of the app
              </div>
            </div>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={store.theme === "dark"}
                onChange={changeTheme}
              />
              <span className={styles.slider}>
                {store.theme === "dark" ? <Moon /> : <Sun />}
              </span>
            </label>
          </div>

          <div className={styles.settingItem}>
            <div className={styles.settingInfo}>
              <div className={styles.settingTitle}>Compact Text</div>
              <div className={styles.settingDescription}>
                Display text in a more compact format
              </div>
            </div>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={store.compactText}
                onChange={toggleCompactText}
              />
              <span className={styles.slider}></span>
            </label>
          </div>

          <div className={styles.settingItem}>
            <div className={styles.settingInfo}>
              <div className={styles.settingTitle}>Show Images</div>
              <div className={styles.settingDescription}>
                Display images in posts
              </div>
            </div>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={store.showImages}
                onChange={toggleShowImages}
              />
              <span className={styles.slider}></span>
            </label>
          </div>

          <div className={styles.settingItem}>
            <div className={styles.settingInfo}>
              <div className={styles.settingTitle}>Blur NSFW Images</div>
              <div className={styles.settingDescription}>
                Blur images marked as not safe for work
              </div>
            </div>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={store.blurNSFW}
                onChange={toggleBlurNSFW}
              />
              <span className={styles.slider}></span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
