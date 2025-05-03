import { FC, useState, useRef, useEffect } from "react";
import styles from "./VideoPlayer.module.scss";
import { VideoInfo } from "../types/Post";
import { Reveal } from "./icons/Reveal";

interface VideoPlayerProps {
  video: VideoInfo;
  shouldBlur?: boolean;
}

export const VideoPlayer: FC<VideoPlayerProps> = ({
  video,
  shouldBlur = false,
}) => {
  const [isBlurred, setIsBlurred] = useState(shouldBlur);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Reset blur state when shouldBlur prop changes
  useEffect(() => {
    setIsBlurred(shouldBlur);
  }, [shouldBlur]);

  const handleRevealClick = () => {
    setIsBlurred(false);
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Choose the best video URL based on what's available
  const videoUrl =
    video.url || video.fallbackUrl || video.hlsUrl || video.dashUrl;

  // Early return if no valid video URL
  if (!videoUrl) {
    return null;
  }

  return (
    <div
      className={`${styles.container} ${isBlurred ? styles.blurContainer : ""}`}
      ref={containerRef}
    >
      <video
        ref={videoRef}
        className={isBlurred ? styles.blurredVideo : ""}
        controls={!isBlurred}
        loop={video.isGif}
        muted={video.isGif}
        autoPlay={video.isGif && !isBlurred}
        playsInline
        onClick={togglePlayPause}
        poster={video.thumbnail}
        width="100%"
      >
        <source src={videoUrl} type="video/mp4" />
        {video.fallbackUrl && video.fallbackUrl !== videoUrl && (
          <source src={video.fallbackUrl} type="video/mp4" />
        )}
        {video.dashUrl && (
          <source src={video.dashUrl} type="application/dash+xml" />
        )}
        {video.hlsUrl && (
          <source src={video.hlsUrl} type="application/x-mpegURL" />
        )}
        Your browser does not support the video tag.
      </video>

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
            <span className={styles.tooltip}>Click to reveal NSFW content</span>
          </div>
        </div>
      )}
    </div>
  );
};
