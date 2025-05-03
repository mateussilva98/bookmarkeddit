import { FC, useState, useEffect, useRef } from "react";
import styles from "./ImageSlider.module.scss";
import { Reveal } from "./icons/Reveal";

interface ImageSliderProps {
  images: string[];
  shouldBlur?: boolean;
}

export const ImageSlider: FC<ImageSliderProps> = ({
  images,
  shouldBlur = false,
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [containerHeight, setContainerHeight] = useState<number | null>(null);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set([0]));
  const [isVisible, setIsVisible] = useState(false);
  const [isBlurred, setIsBlurred] = useState(shouldBlur);

  const firstImageRef = useRef<HTMLImageElement | null>(null);
  const sliderRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Reset when images change
    setContainerHeight(null);
    setCurrentImageIndex(0);
    setLoadedImages(new Set([0]));
  }, [images]);

  // Reset blur state when shouldBlur prop changes
  useEffect(() => {
    setIsBlurred(shouldBlur);
  }, [shouldBlur]);

  useEffect(() => {
    // Initialize Intersection Observer
    if (sliderRef.current && !observerRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            setIsVisible(true);
          } else {
            setIsVisible(false);
          }
        },
        {
          threshold: 0.1, // Trigger when at least 10% of the slider is visible
        }
      );

      observerRef.current.observe(sliderRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    // When first image loads, set its height as the container height
    if (
      currentImageIndex === 0 &&
      firstImageRef.current &&
      firstImageRef.current.complete
    ) {
      setContainerHeight(firstImageRef.current.offsetHeight);
    }
  }, [currentImageIndex, firstImageRef.current?.complete]);

  useEffect(() => {
    // Preload current image and adjacent images when slider is visible
    if (isVisible && images.length > 0) {
      const imagesToLoad = new Set<number>([currentImageIndex]);

      // Preload previous image if available
      if (currentImageIndex > 0) {
        imagesToLoad.add(currentImageIndex - 1);
      } else if (images.length > 1) {
        imagesToLoad.add(images.length - 1);
      }

      // Preload next image if available
      if (currentImageIndex < images.length - 1) {
        imagesToLoad.add(currentImageIndex + 1);
      } else if (images.length > 1) {
        imagesToLoad.add(0);
      }

      setLoadedImages((prev) => {
        const newSet = new Set(prev);
        imagesToLoad.forEach((idx) => newSet.add(idx));
        return newSet;
      });
    }
  }, [currentImageIndex, isVisible, images.length]);

  if (!images || images.length === 0) {
    return null;
  }

  const handleRevealClick = () => {
    setIsBlurred(false);
  };

  // Show just the image if there's only one
  if (images.length === 1) {
    return (
      <div
        className={`${styles.singleImage} ${
          isBlurred ? styles.blurContainer : ""
        }`}
      >
        <img
          src={images[0]}
          alt="Post content"
          loading="lazy"
          className={isBlurred ? styles.blurredImage : ""}
        />
        {isBlurred && (
          <div className={styles.revealOverlay}>
            <div className={styles.tooltipWrapper}>
              <button
                className="btn-icon"
                onClick={handleRevealClick}
                aria-label="Reveal NSFW content"
              >
                <Reveal />
              </button>
              <span className={styles.tooltip}>
                Click to reveal NSFW content
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  const goToPrevious = () => {
    setCurrentImageIndex((prevIndex) =>
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
  };

  const goToNext = () => {
    setCurrentImageIndex((prevIndex) =>
      prevIndex === images.length - 1 ? 0 : prevIndex + 1
    );
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    // If this is the first image and we don't have a container height yet
    if (currentImageIndex === 0 && !containerHeight) {
      setContainerHeight(e.currentTarget.offsetHeight);
    }
  };

  return (
    <div
      className={`${styles.slider} ${isBlurred ? styles.blurContainer : ""}`}
      ref={sliderRef}
    >
      <div
        className={styles.sliderContent}
        style={containerHeight ? { height: `${containerHeight}px` } : undefined}
      >
        {/* Only render image elements for images that should be loaded */}
        {images.map(
          (src, index) =>
            loadedImages.has(index) && (
              <img
                key={index}
                ref={index === 0 ? firstImageRef : null}
                src={src}
                alt={`Image ${index + 1} of ${images.length}`}
                loading="lazy"
                onLoad={handleImageLoad}
                className={isBlurred ? styles.blurredImage : ""}
                style={{
                  display: index === currentImageIndex ? "block" : "none",
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }}
              />
            )
        )}

        <button
          className={`${styles.navigationButton} ${styles.prevButton}`}
          onClick={goToPrevious}
          aria-label="Previous image"
        >
          &#10094;
        </button>

        <button
          className={`${styles.navigationButton} ${styles.nextButton}`}
          onClick={goToNext}
          aria-label="Next image"
        >
          &#10095;
        </button>

        <div className={styles.paginationIndicator}>
          {currentImageIndex + 1} / {images.length}
        </div>

        {isBlurred && (
          <div className={styles.revealOverlay}>
            <div className={styles.tooltipWrapper}>
              <button
                className="btn-icon"
                onClick={handleRevealClick}
                aria-label="Reveal NSFW content"
              >
                <Reveal />
              </button>
              <span className={styles.tooltip}>
                Click to reveal NSFW content
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
