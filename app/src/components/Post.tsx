import { FC } from "react";
import { Post } from "../types/Post";
import styles from "./Post.module.scss"; // Assuming a CSS module file exists

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

      <h3>{post.title}</h3>
      <p className={styles.description}>{post.description}</p>
      {/* <a href={post.url} target="_blank" rel="noopener noreferrer">
        Read more
      </a> */}
    </div>
  );
};
