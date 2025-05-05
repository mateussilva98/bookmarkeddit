import { FC, useState } from "react";
import { Post } from "../types/Post";
import styles from "./Post.module.scss";
import { Warning } from "./icons/Warning";
import { Ups } from "./icons/Ups";
import { Comment } from "./icons/Comment";
import { Open } from "./icons/Open";
import { Bookmark } from "./icons/Bookmark";
import { Share } from "./icons/Share";
import { ImageSlider } from "./ImageSlider";
import { VideoPlayer } from "./VideoPlayer";
import { useStore } from "../hooks/use-store";
import { Tooltip } from "./ui/Tooltip";
import { ConfirmModal } from "./ui/ConfirmModal";
import { redditApi, ApiError } from "../api";

interface PostProps {
  post: Post;
  onUnsave?: (
    postId: string,
    succeeded: boolean,
    errorMessage?: string
  ) => void;
}

// Calculate data text - 1 day ago, 4 days ago, 1 motnh ago, etc.
const calculateTimeAgo = (timestamp: number): string => {
  const now = new Date();
  const postDate = new Date(timestamp * 1000); // Convert to milliseconds
  const diffInSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000);

  const intervals: { [key: string]: number } = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
    second: 1,
  };

  for (const [unit, seconds] of Object.entries(intervals)) {
    const count = Math.floor(diffInSeconds / seconds);
    if (count > 0) {
      return `${count} ${unit}${count > 1 ? "s" : ""} ago`;
    }
  }

  return "just now";
};

export const PostComponent: FC<PostProps> = ({ post, onUnsave }) => {
  const { store } = useStore();
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isUnsaving, setIsUnsaving] = useState(false);

  const share = (url: string) => {
    if (navigator.share) {
      navigator
        .share({
          title: post.title,
          text: post.description,
          url: url,
        })
        .then(() => console.log("Post shared successfully"))
        .catch((error) => console.error("Error sharing post:", error));
    } else {
      // Fallback for browsers that don't support the Web Share API - copy to clipboard
      navigator.clipboard.writeText(url).then(() => {
        console.log("Post URL copied to clipboard:", url);
        alert("Post URL copied to clipboard: " + url);
      });
    }
  };

  const handleUnsaveClick = () => {
    setIsConfirmModalOpen(true);
  };

  const handleConfirmUnsave = async () => {
    if (!store.auth.access_token || isUnsaving) return;

    setIsUnsaving(true);

    try {
      // Call the API to unsave the post
      await redditApi.unsaveItem(store.auth.access_token, post.fullname);

      // Notify parent component of successful unsave
      if (onUnsave) {
        onUnsave(post.id, true);
      }
    } catch (error) {
      console.error("Error unsaving post:", error);

      const errorMessage =
        error instanceof ApiError
          ? error.message
          : "Failed to unsave the post. Please try again.";

      // Notify parent component of failed unsave
      if (onUnsave) {
        onUnsave(post.id, false, errorMessage);
      }
    } finally {
      setIsUnsaving(false);
      setIsConfirmModalOpen(false);
    }
  };

  const handleCancelUnsave = () => {
    setIsConfirmModalOpen(false);
  };

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <h5>
          <a
            href={"https://www.reddit.com/r/" + post.subreddit}
            target="_blank"
            rel="noopener noreferrer"
          >
            r/{post.subreddit} •{" "}
          </a>
          <span>{calculateTimeAgo(post.createdAt)}</span>
        </h5>
        <h6>
          <a
            href={"https://www.reddit.com/u/" + post.subreddit}
            target="_blank"
            rel="noopener noreferrer"
          >
            u/{post.author}
          </a>
        </h6>
      </div>

      {post.nsfw && (
        <div className={styles.nsfw}>
          <div className={styles.warningIcon}>
            <Warning />
          </div>
          <span>NSFW</span>
        </div>
      )}

      <h3 className={store.compactText ? styles.compactTitle : ""}>
        {post.title}
      </h3>
      <div className={styles.descriptionContainer}>
        {post.type == "Comment" && (
          <div className={styles.commentLine}>
            <div /* className={styles.commentLineTopLeft} */></div>
            <div className={styles.commentLineTopRight}></div>
            <div /* className={styles.commentLineBottomLeft} */></div>
            <div /* className={styles.commentLineBottomRight} */></div>
          </div>
        )}
        <p
          className={`${styles.description} ${
            store.compactText ? styles.compactDescription : ""
          }`}
        >
          {post.description}
        </p>
      </div>

      {/* Display media content with video taking priority over images */}
      {store.showImages && (
        <>
          {post.video ? (
            <VideoPlayer
              video={post.video}
              shouldBlur={store.blurNSFW && post.nsfw}
            />
          ) : post.images && post.images.length > 0 ? (
            <ImageSlider
              images={post.images}
              shouldBlur={store.blurNSFW && post.nsfw}
            />
          ) : null}
        </>
      )}

      <div className={styles.bottom}>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <div className={styles.icon}>
              <Ups />
            </div>
            <span>{post.score}</span>
          </div>
          <div className={styles.stat}>
            <div className={styles.icon}>
              <Comment />
            </div>
            <span>{post.commentCount}</span>
          </div>
        </div>
        <div className={styles.options}>
          <Tooltip text="Unsave post">
            <button
              className={`${styles.unsave} btn-icon`}
              onClick={handleUnsaveClick}
              disabled={isUnsaving}
            >
              <Bookmark />
            </button>
          </Tooltip>

          <Tooltip text="Share post">
            <button className="btn-icon" onClick={() => share(post.url)}>
              <Share />
            </button>
          </Tooltip>

          <Tooltip text="Open in new tab">
            <a href={post.url} target="_blank" rel="noopener noreferrer">
              <button className="btn-icon">
                <Open />
              </button>
            </a>
          </Tooltip>
        </div>
      </div>

      <ConfirmModal
        isOpen={isConfirmModalOpen}
        title="Unsave Post"
        message="Are you sure you want to unsave this post? This action cannot be undone."
        confirmText="Unsave"
        cancelText="Cancel"
        onConfirm={handleConfirmUnsave}
        onCancel={handleCancelUnsave}
      />
    </div>
  );
};
