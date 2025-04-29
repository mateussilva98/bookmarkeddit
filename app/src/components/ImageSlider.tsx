import { FC, useState, useEffect, useRef } from "react";
import styles from "./ImageSlider.module.scss";

interface ImageSliderProps {
  images: string[];
}

export const ImageSlider: FC<ImageSliderProps> = ({ images }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [containerHeight, setContainerHeight] = useState<number | null>(null);
  const firstImageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    // Reset container height when images change
    setContainerHeight(null);
    setCurrentImageIndex(0);
  }, [images]);

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

  if (!images || images.length === 0) {
    return null;
  }

  // Show just the image if there's only one
  if (images.length === 1) {
    return (
      <div className={styles.singleImage}>
        <img src={images[0]} alt="Post content" loading="lazy" />
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
    <div className={styles.slider}>
      <div
        className={styles.sliderContent}
        style={containerHeight ? { height: `${containerHeight}px` } : undefined}
      >
        <img
          ref={currentImageIndex === 0 ? firstImageRef : null}
          src={images[currentImageIndex]}
          alt={`Image ${currentImageIndex + 1} of ${images.length}`}
          loading="lazy"
          onLoad={handleImageLoad}
        />

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
      </div>
    </div>
  );
};
