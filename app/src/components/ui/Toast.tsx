import { FC, useEffect, useState } from "react";
import styles from "./Toast.module.scss";

export type ToastType = "success" | "error" | "info";

interface ToastProps {
  message: string;
  type: ToastType;
  duration?: number;
  onClose: () => void;
}

export const Toast: FC<ToastProps> = ({
  message,
  type,
  duration = 3000,
  onClose,
}) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300); // Wait for fade out animation before removing
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      className={`${styles.toast} ${styles[type]} ${
        visible ? styles.visible : styles.hidden
      }`}
    >
      <div className={styles.message}>{message}</div>
      <button
        className={styles.closeButton}
        onClick={() => {
          setVisible(false);
          setTimeout(onClose, 300); // Wait for fade out animation
        }}
      >
        ×
      </button>
    </div>
  );
};

// Toast Container Component
interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContainerProps {
  toasts: ToastItem[];
  removeToast: (id: string) => void;
}

export const ToastContainer: FC<ToastContainerProps> = ({
  toasts,
  removeToast,
}) => {
  return (
    <div className={styles.toastContainer}>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};
