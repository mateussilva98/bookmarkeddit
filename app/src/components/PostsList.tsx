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
  const [visibleCount, setVisibleCount] = useState(50); // For infinite scroll

  // Update local posts when parent posts change
  useEffect(() => {
    const currentIds = new Set(localPosts.map((post) => post.id));
    const incomingIds = new Set(posts.map((post) => post.id));

    const hasNewPosts = posts.some((post) => !currentIds.has(post.id));
    const hasRemovedPosts = localPosts.some(
      (post) => !incomingIds.has(post.id) && incomingIds.size > 0
    );

    if (posts.length !== localPosts.length || hasNewPosts || hasRemovedPosts) {
      setLocalPosts(posts);
    }
  }, [posts, localPosts]);

  // Reset visibleCount and scroll to top when posts, search, or sort changes
  useEffect(() => {
    setVisibleCount(50);
    if (postsListRef.current) {
      postsListRef.current.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [searchTerm, posts, store.sortBy, store.layout]);

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
        setLocalPosts((prev) => {
          const newPosts = prev.filter((post) => post.id !== postId);
          return newPosts;
        });

        if (onPostUnsave) {
          onPostUnsave(postId);
        }

        addToast("Post unsaved successfully", "success");
      } else {
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

      const thumbnail = content.querySelector<HTMLImageElement>(".thumbnail");
      const video = content.querySelector<HTMLVideoElement>("video");

      const calculateRowSpan = () => {
        const contentHeight = content.getBoundingClientRect().height;
        const rowSpan = Math.ceil(
          (contentHeight + rowGap) / (rowHeight + rowGap)
        );
        item.style.gridRowEnd = `span ${rowSpan}`;

        pendingCalculations--;
        if (pendingCalculations === 0) {
          setIsGridCalculating(false);
        }
      };

      if (thumbnail && !thumbnail.complete) {
        thumbnail.onload = () => {
          calculateRowSpan();
        };
        thumbnail.onerror = () => {
          calculateRowSpan();
        };
      } else if (video && video.readyState < 1) {
        // Wait for video metadata to load
        const onLoadedMetadata = () => {
          calculateRowSpan();
          video.removeEventListener("loadedmetadata", onLoadedMetadata);
        };
        video.addEventListener("loadedmetadata", onLoadedMetadata);
      } else {
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

  // Infinite scroll handler
  useEffect(() => {
    const handleScroll = () => {
      if (!postsListRef.current) return;
      const el = postsListRef.current;
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) {
        setVisibleCount((prev) => {
          if (prev < sortedPosts.length) {
            return Math.min(prev + 20, sortedPosts.length);
          }
          return prev;
        });
      }
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
  }, [sortedPosts.length]);

  // Effect for resizing grid items on posts change, layout change, or settings change that affect post dimensions
  useEffect(() => {
    if (store.layout === "grid") {
      setIsGridCalculating(true);
    } else {
      setIsGridCalculating(false);
    }

    resizeGridItems();

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

  // Recalculate grid sizes when more posts are loaded (infinite scroll)
  useEffect(() => {
    if (store.layout === "grid") {
      resizeGridItems();
    }
  }, [visibleCount, store.layout, resizeGridItems]);

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
      if (e.ctrlKey && e.key === "f") {
        e.preventDefault();
        scrollToTopAndFocusSearch();
      }

      if (e.ctrlKey && e.key === "r" && onRefresh) {
        e.preventDefault();
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
      {sortedPosts.length > 0 ? (
        <div
          className={`${styles.postsContainer} ${styles[store.layout]} ${
            isGridCalculating && store.layout === "grid"
              ? styles.calculating
              : ""
          }`}
          ref={postsContainerRef}
        >
          {sortedPosts.slice(0, visibleCount).map((post) => (
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
          {/* Loader for infinite scroll */}
          {visibleCount < sortedPosts.length && (
            <div className={styles.infiniteScrollLoader}>
              Loading more posts...
            </div>
          )}
        </div>
      ) : (
        <div className={styles.noResults}>
          No posts match your search criteria
        </div>
      )}

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

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
};
