import { FC, ReactNode, useEffect, useRef } from "react";
import styles from "./FeatureCard.module.scss";

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
}

export const FeatureCard: FC<FeatureCardProps> = ({
  icon,
  title,
  description,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Calculate the position relative to the center of the card (in %)
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Reduced max tilt to 7 degrees for a more subtle effect
      const percentX = ((x - centerX) / centerX) * 7;
      const percentY = ((y - centerY) / centerY) * -7;

      // Apply the transform
      card.style.transform = `perspective(1000px) rotateX(${percentY}deg) rotateY(${percentX}deg) scale3d(1.01, 1.01, 1.01)`;
    };

    const handleMouseLeave = () => {
      // Reset the transform when mouse leaves
      card.style.transform =
        "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
    };

    card.addEventListener("mousemove", handleMouseMove);
    card.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      card.removeEventListener("mousemove", handleMouseMove);
      card.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <div className={styles.featureCard} ref={cardRef}>
      <div className={styles.shine}></div>
      <span className={styles.featureIcon}>{icon}</span>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
};
