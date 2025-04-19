import { FC, useState, useMemo } from "react";
import { Post } from "../types/Post";
import { PostComponent } from "./Post";
import styles from "./PostsList.module.scss";
import { X } from "./icons/X";

interface PostsListProps {
  posts: Post[];
}

type SortOption = "recent" | "upvotes" | "comments";

export const PostsList: FC<PostsListProps> = ({ posts }) => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortOption>("recent");

  // Filter posts based on search term
  const filteredPosts = useMemo(() => {
    if (!searchTerm.trim()) return posts;

    const term = searchTerm.toLowerCase();
    return posts.filter(
      (post) =>
        post.title.toLowerCase().includes(term) ||
        post.description?.toLowerCase().includes(term)
    );
  }, [posts, searchTerm]);

  // Sort the filtered posts
  const sortedPosts = useMemo(() => {
    return [...filteredPosts].sort((a, b) => {
      switch (sortBy) {
        case "upvotes":
          return b.score - a.score;
        case "comments":
          return b.commentCount - a.commentCount;
        case "recent":
        default:
          return b.createdAt - a.createdAt;
      }
    });
  }, [filteredPosts, sortBy]);

  return (
    <div className={styles.root}>
      <div className={styles.controlsContainer}>
        <div className={styles.searchInputContainer}>
          <input
            type="text"
            placeholder="Filter by title or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
          {searchTerm && (
            <button
              className={`${styles.clearButton} btn-icon`}
              onClick={() => setSearchTerm("")}
              aria-label="Clear search"
            >
              <X />
            </button>
          )}
        </div>
        <div className={styles.sortBy}>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className={styles.sortSelect}
          >
            <option value="recent">Most recent saved</option>
            <option value="upvotes">Most Upvotes</option>
            <option value="comments">Most Comments</option>
          </select>
        </div>
      </div>
      {sortedPosts.map((post) => (
        <>
          <hr />
          <PostComponent key={post.id} post={post} />
        </>
      ))}
    </div>
  );
};
