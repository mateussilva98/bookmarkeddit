import { FC, useRef } from "react";
import { Post } from "../types/Post";
import styles from "./Post.module.scss"; // Assuming a CSS module file exists
import { Warning } from "./icons/Warning";
import { Ups } from "./icons/Ups";
import { Comment } from "./icons/Comment";
import { Open } from "./icons/Open";
import { Bookmark } from "./icons/Bookmark";
import { Share } from "./icons/Share";
import { ImageSlider } from "./ImageSlider";
import { useStore } from "../hooks/use-store";

interface PostProps {
  post: Post;
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

export const PostComponent: FC<PostProps> = ({ post }) => {
  const { store } = useStore();

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
        // todo a custom toast message
        alert("Post URL copied to clipboard: " + url);
      });
    }
  };

  // Function to properly decode HTML entities in URLs
  const decodeHtmlEntities = (url: string): string => {
    // Create a temporary element to use the browser's built-in HTML entity decoding
    const doc = new DOMParser().parseFromString(url, "text/html");
    return doc.documentElement.textContent || url;
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

      {/* Display image slider if we have multiple images, or a single image if we just have one */}
      {post.images && post.images.length > 0 && (
        <ImageSlider images={post.images} />
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
          <div className={styles.tooltipWrapper}>
            <button className={`${styles.unsave} btn-icon`}>
              <Bookmark />
            </button>
            <span className={styles.tooltip}>Unsave post</span>
          </div>

          <div className={styles.tooltipWrapper}>
            <button className="btn-icon" onClick={() => share(post.url)}>
              <Share />
            </button>
            <span className={styles.tooltip}>Share post</span>
          </div>

          <div className={styles.tooltipWrapper}>
            <a href={post.url} target="_blank" rel="noopener noreferrer">
              <button className="btn-icon">
                <Open />
              </button>
            </a>
            <span className={styles.tooltip}>Open in new tab</span>
          </div>
        </div>
      </div>
    </div>
  );
};
