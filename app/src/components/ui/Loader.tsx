import { FC } from "react";
import styles from "./Loader.module.scss";

interface LoaderProps {
  isVisible?: boolean;
}

export const Loader: FC<LoaderProps> = ({ isVisible = true }) => {
  if (!isVisible) return null;

  return (
    <div className={styles.root}>
      <div className={styles.loader}>
        <div className={styles["loader-wheel"]}></div>
        <div className={styles["loader-text"]}></div>
      </div>
    </div>
  );
};
