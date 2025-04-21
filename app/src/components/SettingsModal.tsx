import { FC } from "react";
import { X } from "./icons/X";
import styles from "./SettingsModal.module.scss";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Settings</h2>
          <button className="btn-icon" onClick={onClose}>
            <X />
          </button>
        </div>
        <div className={styles.content}>
          {/* Add your settings options here */}
          <p>Settings options coming soon...</p>
        </div>
      </div>
    </div>
  );
};
