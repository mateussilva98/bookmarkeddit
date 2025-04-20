import { FC, useState, useMemo, useEffect, useRef } from "react";
import { Post } from "../types/Post";
import { PostComponent } from "./Post";
import styles from "./PostsList.module.scss";
import { X } from "./icons/X";
import { Up } from "./icons/Up";

interface PostsListProps {
  posts: Post[];
}

type SortOption = "recent" | "upvotes" | "comments";

export const PostsList: FC<PostsListProps> = ({ posts }) => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const postsListRef = useRef<HTMLDivElement>(null);

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

  // Handle scroll events to show/hide the scroll to top button
  useEffect(() => {
    const handleScroll = () => {
      if (!postsListRef.current) return;

      // Show button when scrolled down 300px
      setShowScrollToTop(postsListRef.current.scrollTop > 300);
    };

    const listElement = postsListRef.current;
    if (listElement) {
      listElement.addEventListener("scroll", handleScroll);
    }

    return () => {
      if (listElement) {
        listElement.removeEventListener("scroll", handleScroll);
      }
    };
  }, []);

  // Function to scroll back to top
  const scrollToTop = () => {
    if (postsListRef.current) {
      postsListRef.current.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className={styles.root} ref={postsListRef}>
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

      {showScrollToTop && (
        <button
          className={`${styles.scrollToTopButton}`}
          onClick={scrollToTop}
          aria-label="Scroll to top"
        >
          <Up />
        </button>
      )}
    </div>
  );
};
