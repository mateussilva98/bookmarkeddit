import { FC, useEffect, useState } from "react";
import styles from "./RateLimitCountdown.module.scss";

interface RateLimitCountdownProps {
  retryAfter: number; // seconds
  onComplete?: () => void;
}

export const RateLimitCountdown: FC<RateLimitCountdownProps> = ({
  retryAfter,
  onComplete,
}) => {
  const [timeLeft, setTimeLeft] = useState(retryAfter);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Reset timer when retryAfter changes
    setTimeLeft(retryAfter);
    setProgress(0);
  }, [retryAfter]);

  useEffect(() => {
    if (timeLeft <= 0) {
      if (onComplete) {
        onComplete();
      }
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(prev - 1, 0));
      setProgress(((retryAfter - timeLeft + 1) / retryAfter) * 100);
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft, retryAfter, onComplete]);

  return (
    <div className={styles.rateLimitContainer}>
      <div className={styles.message}>
        <h3>Reddit Rate Limit Reached</h3>
        <p>
          Reddit limits how frequently we can request data. Retrying
          automatically in <span className={styles.countdown}>{timeLeft}</span>{" "}
          seconds...
        </p>
      </div>
      <div className={styles.progressBarContainer}>
        <div
          className={styles.progressBar}
          style={{ width: `${progress}%` }}
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          role="progressbar"
        ></div>
      </div>
    </div>
  );
};
