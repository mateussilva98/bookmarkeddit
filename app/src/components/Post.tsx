import { FC } from "react";
import { Post } from "../types/Post";
import styles from "./Post.module.scss"; // Assuming a CSS module file exists
import { Warning } from "./icons/Warning";
import { Ups } from "./icons/Ups";
import { Comment } from "./icons/Comment";
import { Open } from "./icons/Open";

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
            href={"https://www.reddit.com/r/" + post.subreddit}
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

      <h3>{post.title}</h3>
      <p className={styles.description}>{post.description}</p>

      {/* TODO add images in case you have. check thumbnail dimentions */}

      <div className={styles.bottom}>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <Ups />
            {post.score}
          </div>
          <div className={styles.stat}>
            <Comment />
            {post.commentCount}
          </div>
        </div>
        <div className={styles.open}>
          <a href={post.url} target="_blank" rel="noopener noreferrer">
            <Open />
          </a>
        </div>
      </div>
      {/* <a href={post.url} target="_blank" rel="noopener noreferrer">
        Read more
      </a> */}
    </div>
  );
};
