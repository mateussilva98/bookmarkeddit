import { FC, ReactNode } from "react";
import styles from "./Tooltip.module.scss";

export type TooltipPosition = "top" | "bottom" | "left" | "right";

interface TooltipProps {
  children: ReactNode;
  text: string;
  position?: TooltipPosition;
}

export const Tooltip: FC<TooltipProps> = ({
  children,
  text,
  position = "top",
}) => {
  return (
    <div className={styles.tooltipWrapper}>
      {children}
      <span className={`${styles.tooltip} ${styles[position]}`}>{text}</span>
    </div>
  );
};
