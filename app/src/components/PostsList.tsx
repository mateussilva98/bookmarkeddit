import { FC, useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Post } from "../types/Post";
import { PostComponent } from "./Post";
import styles from "./PostsList.module.scss";
import { X } from "./icons/X";
import { Up } from "./icons/Up";
import { List } from "./icons/List";
import { Grid } from "./icons/Grid";
import { useStore } from "../hooks/use-store";
import { ToastContainer, ToastType } from "./ui/Toast";
import { v4 as uuidv4 } from "uuid";

interface PostsListProps {
  posts: Post[];
  onRefresh?: () => void; // Add callback for refresh
  onPostUnsave?: (postId: string) => void; // Add prop for parent component notification
}

type SortOption = "recent" | "upvotes" | "comments";

// Toast item interface
interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

export const PostsList: FC<PostsListProps> = ({
  posts,
  onRefresh,
  onPostUnsave,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const postsListRef = useRef<HTMLDivElement>(null);
  const postsContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [isGridCalculating, setIsGridCalculating] = useState(true);
  const { store, changeLayout, changeSortBy } = useStore();
  const [localPosts, setLocalPosts] = useState<Post[]>(posts);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Update local posts when parent posts change
  useEffect(() => {
    // Always update local posts when the filter criteria change
    // We can detect filter changes when the array length changes in either direction
    // or when incoming posts have different IDs than current localPosts
    const currentIds = new Set(localPosts.map((post) => post.id));
    const incomingIds = new Set(posts.map((post) => post.id));

    // Check if any incoming post ID isn't in current posts
    const hasNewPosts = posts.some((post) => !currentIds.has(post.id));
    // Check if any current post ID isn't in incoming posts (was filtered out)
    const hasRemovedPosts = localPosts.some(
      (post) => !incomingIds.has(post.id) && incomingIds.size > 0
    );

    // If there's a difference in posts count or post IDs, update the local state
    if (posts.length !== localPosts.length || hasNewPosts || hasRemovedPosts) {
      setLocalPosts(posts);
    }
  }, [posts, localPosts]);

  // Function to add a toast notification
  const addToast = useCallback((message: string, type: ToastType) => {
    const newToast = {
      id: uuidv4(),
      message,
      type,
    };
    setToasts((prev) => [...prev, newToast]);
  }, []);

  // Function to remove a toast
  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Function to handle post unsave
  const handlePostUnsave = useCallback(
    (postId: string, succeeded: boolean, errorMessage?: string) => {
      if (succeeded) {
        // Remove the post from local state
        setLocalPosts((prev) => {
          const newPosts = prev.filter((post) => post.id !== postId);
          return newPosts;
        });

        // Notify parent component to update its state
        if (onPostUnsave) {
          onPostUnsave(postId);
        }

        // Show success toast
        addToast("Post unsaved successfully", "success");
      } else {
        // Show error toast
        addToast(errorMessage || "Failed to unsave post", "error");
      }
    },
    [addToast, onPostUnsave]
  );

  // Resize grid items for masonry layout
  const resizeGridItems = useCallback(() => {
    if (store.layout !== "grid" || !postsContainerRef.current) {
      setIsGridCalculating(false);
      return;
    }

    // Set grid calculating to true whenever we start calculating positions
    setIsGridCalculating(true);

    const grid = postsContainerRef.current;
    const rowHeight = parseInt(
      window.getComputedStyle(grid).getPropertyValue("grid-auto-rows")
    );
    const rowGap = parseInt(
      window.getComputedStyle(grid).getPropertyValue("grid-row-gap") || "0"
    );

    const items = grid.querySelectorAll<HTMLElement>(":scope > div");
    let pendingCalculations = items.length;

    if (pendingCalculations === 0) {
      setIsGridCalculating(false);
      return;
    }

    items.forEach((item) => {
      const content = item.querySelector<HTMLElement>(":scope > .post-content");
      if (!content) {
        pendingCalculations--;
        if (pendingCalculations === 0) {
          setIsGridCalculating(false);
        }
        return;
      }

      // Wait for any images to load so we get accurate height calculations
      const thumbnail = content.querySelector<HTMLImageElement>(".thumbnail");

      const calculateRowSpan = () => {
        const contentHeight = content.getBoundingClientRect().height;
        const rowSpan = Math.ceil(
          (contentHeight + rowGap) / (rowHeight + rowGap)
        );
        item.style.gridRowEnd = `span ${rowSpan}`;

        // Decrement pending calculations counter
        pendingCalculations--;
        if (pendingCalculations === 0) {
          // All calculations are done, update state
          setIsGridCalculating(false);
        }
      };

      if (thumbnail && !thumbnail.complete) {
        // If thumbnail exists and is not loaded yet, wait for it to load
        thumbnail.onload = () => {
          calculateRowSpan();
        };
        // Also set a fallback in case the image fails to load
        thumbnail.onerror = () => {
          calculateRowSpan();
        };
      } else {
        // No thumbnail or thumbnail already loaded
        calculateRowSpan();
      }
    });
  }, [store.layout]);

  // Filter posts based on search term
  const filteredPosts = useMemo(() => {
    if (!searchTerm.trim()) return localPosts;

    const term = searchTerm.toLowerCase();
    return localPosts.filter(
      (post) =>
        post.title.toLowerCase().includes(term) ||
        post.description?.toLowerCase().includes(term)
    );
  }, [localPosts, searchTerm]);

  // Sort the filtered posts
  const sortedPosts = useMemo(() => {
    return [...filteredPosts].sort((a, b) => {
      switch (store.sortBy) {
        case "upvotes":
          return b.score - a.score;
        case "comments":
          return b.commentCount - a.commentCount;
        case "recent":
        default:
          return b.createdAt - a.createdAt;
      }
    });
  }, [filteredPosts, store.sortBy]);

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

  // Effect for resizing grid items on posts change, layout change, or settings change that affect post dimensions
  useEffect(() => {
    // Start a new grid calculation process
    if (store.layout === "grid") {
      setIsGridCalculating(true);
    } else {
      setIsGridCalculating(false);
    }

    resizeGridItems();

    // Use ResizeObserver to monitor changes in post sizes
    const resizeObserver = new ResizeObserver(() => {
      if (store.layout === "grid") {
        resizeGridItems();
      }
    });

    if (postsContainerRef.current) {
      const postElements =
        postsContainerRef.current.querySelectorAll<HTMLElement>(":scope > div");
      postElements.forEach((el) => resizeObserver.observe(el));
    }

    // Add window resize listener
    window.addEventListener("resize", resizeGridItems);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", resizeGridItems);
    };
  }, [
    sortedPosts,
    store.layout,
    store.compactText,
    store.showImages,
    resizeGridItems,
  ]);

  // Function to scroll back to top and focus search input
  const scrollToTopAndFocusSearch = useCallback(() => {
    if (postsListRef.current) {
      postsListRef.current.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }
  }, []);

  // Function to scroll back to top only
  const scrollToTop = useCallback(() => {
    if (postsListRef.current) {
      postsListRef.current.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+F: Scroll to top and focus search input
      if (e.ctrlKey && e.key === "f") {
        e.preventDefault(); // Prevent browser's default find behavior
        scrollToTopAndFocusSearch();
      }

      // Ctrl+R: Refresh posts
      if (e.ctrlKey && e.key === "r" && onRefresh) {
        e.preventDefault(); // Prevent browser's default refresh behavior
        onRefresh();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [scrollToTopAndFocusSearch, onRefresh]);

  return (
    <div className={styles.root} ref={postsListRef}>
      <div className={styles.controlsContainer}>
        <div className={styles.searchInputContainer}>
          <input
            ref={searchInputRef}
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
            value={store.sortBy}
            onChange={(e) => changeSortBy(e.target.value as SortOption)}
            className={styles.sortSelect}
          >
            <option value="recent">Most recent saved</option>
            <option value="upvotes">Most Upvotes</option>
            <option value="comments">Most Comments</option>
          </select>
        </div>
        <div className={styles.layoutSelect}>
          <button
            className={`btn-icon ${
              store.layout === "grid" ? styles.active : ""
            }`}
            onClick={() => changeLayout("grid")}
            aria-label="Grid view"
          >
            <Grid />
          </button>
          <button
            className={`btn-icon ${
              store.layout === "list" ? styles.active : ""
            }`}
            onClick={() => changeLayout("list")}
            aria-label="List view"
          >
            <List />
          </button>
        </div>
      </div>
      <div
        className={`${styles.postsContainer} ${styles[store.layout]} ${
          isGridCalculating && store.layout === "grid" ? styles.calculating : ""
        }`}
        ref={postsContainerRef}
      >
        {sortedPosts.map((post) => (
          <div
            key={post.id}
            className={
              isGridCalculating && store.layout === "grid"
                ? styles.hiddenContent
                : ""
            }
          >
            <div className="post-content">
              <PostComponent post={post} onUnsave={handlePostUnsave} />
            </div>
            <hr />
          </div>
        ))}
      </div>

      {showScrollToTop && (
        <button
          className={`${styles.scrollToTopButton}`}
          onClick={scrollToTop}
          aria-label="Scroll to top"
        >
          <Up />
        </button>
      )}

      {isGridCalculating && store.layout === "grid" && (
        <div className={styles.calculatingOverlay}>
          <div className={styles.calculatingSpinner}></div>
          <p>Arranging posts...</p>
        </div>
      )}

      {/* Add Toast Container */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
};
