import { FC, useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Post } from "../types/Post";
import { PostComponent } from "./Post";
import styles from "./PostsList.module.scss";
import { X } from "./icons/X";
import { Up } from "./icons/Up";
import { List } from "./icons/List";
import { Grid } from "./icons/Grid";
import { useStore } from "../hooks/useStore";
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
  const [isGridCalculating, setIsGridCalculating] = useState(false);
  const { store, changeLayout, changeSortBy } = useStore();
  const [localPosts, setLocalPosts] = useState<Post[]>(posts);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [visibleCount, setVisibleCount] = useState(50); // For infinite scroll
  const [isMobile, setIsMobile] = useState<boolean>(false);

  // Check for mobile screen size on mount and window resize
  useEffect(() => {
    const checkMobileView = () => {
      setIsMobile(window.innerWidth <= 480);
    };

    // Initial check
    checkMobileView();

    // Add event listener for window resize
    window.addEventListener("resize", checkMobileView);

    // Clean up
    return () => window.removeEventListener("resize", checkMobileView);
  }, []);

  // Force list layout on mobile
  useEffect(() => {
    if (isMobile && store.layout !== "list") {
      changeLayout("list");
    }
  }, [isMobile, store.layout, changeLayout]);

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
  ); // Resize grid items for masonry layout
  const resizeGridItems = useCallback(() => {
    // Don't perform grid calculations on mobile
    if (isMobile || store.layout !== "grid" || !postsContainerRef.current) {
      setIsGridCalculating(false);
      return;
    }

    setIsGridCalculating(true);

    // We'll use a single safety timeout that's cleared when calculation completes
    const safetyTimeout = setTimeout(() => {
      // If we're still calculating after 2 seconds, force items to show
      if (postsContainerRef.current) {
        const allItems =
          postsContainerRef.current.querySelectorAll<HTMLElement>(
            ":scope > div"
          );
        allItems.forEach((item) => {
          item.style.opacity = "1";
          item.style.visibility = "visible";
        });

        // Force a reflow/repaint to ensure the grid renders correctly
        postsContainerRef.current.offsetHeight;
      }
      setIsGridCalculating(false);
    }, 2000);

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
      clearTimeout(safetyTimeout);
      return;
    }

    // Helper function to show all items and complete calculation
    const finishCalculation = () => {
      if (postsContainerRef.current) {
        const allItems =
          postsContainerRef.current.querySelectorAll<HTMLElement>(
            ":scope > div"
          );
        allItems.forEach((gridItem) => {
          gridItem.style.opacity = "1";
          gridItem.style.visibility = "visible";
        });

        // Force a reflow/repaint to ensure the grid renders correctly
        postsContainerRef.current.offsetHeight;
      }
      setIsGridCalculating(false);
      clearTimeout(safetyTimeout);
    };

    items.forEach((item) => {
      const content = item.querySelector<HTMLElement>(":scope > .post-content");
      if (!content) {
        pendingCalculations--;
        if (pendingCalculations === 0) {
          finishCalculation();
        }
        return;
      }
      const images = content.querySelectorAll<HTMLImageElement>("img");
      const video = content.querySelector<HTMLVideoElement>("video");
      const calculateRowSpan = () => {
        // Ensure we can get an accurate measurement by temporarily making the content visible
        // but keeping it visually hidden using visibility
        item.style.opacity = "0";
        item.style.visibility = "hidden";

        // Force a reflow to ensure the browser updates the layout
        postsContainerRef.current?.offsetHeight;

        // Now get an accurate height measurement
        const contentHeight = content.getBoundingClientRect().height;
        const rowSpan = Math.ceil(
          (contentHeight + rowGap) / (rowHeight + rowGap)
        );
        item.style.gridRowEnd = `span ${rowSpan}`;

        pendingCalculations--;
        if (pendingCalculations === 0) {
          // Only reveal all items when all calculations are done
          finishCalculation();
        }
      }; // Check images within the post content
      if (images.length > 0) {
        // For each image in the post, ensure we recalculate when it loads
        images.forEach((img, index) => {
          // If image is already loaded
          if (img.complete) {
            if (index === 0) calculateRowSpan();
          } else {
            img.onload = () => {
              // Only trigger calculation on first image
              if (index === 0) calculateRowSpan();
              // If this isn't the first image, force a resize after it loads
              // This helps with the case where posts shift after all images load
              else if (item.style.opacity === "1") {
                const currentHeight = content.getBoundingClientRect().height;
                const newRowSpan = Math.ceil(
                  (currentHeight + rowGap) / (rowHeight + rowGap)
                );
                item.style.gridRowEnd = `span ${newRowSpan}`;

                // Force a reflow/repaint to apply changes
                postsContainerRef.current?.offsetHeight;
              }
            };

            img.onerror = () => {
              if (index === 0) calculateRowSpan();
            };
          }
        });
      } else if (video && video.readyState < 1) {
        // Wait for video metadata to load with a timeout to prevent getting stuck
        const onLoadedMetadata = () => {
          calculateRowSpan();
          video.removeEventListener("loadedmetadata", onLoadedMetadata);
          video.removeEventListener("error", onVideoError);
          clearTimeout(metadataTimeout);
        };

        const onVideoError = () => {
          calculateRowSpan();
          video.removeEventListener("loadedmetadata", onLoadedMetadata);
          video.removeEventListener("error", onVideoError);
          clearTimeout(metadataTimeout);
        };

        // Set a timeout to prevent getting stuck waiting for metadata
        const metadataTimeout = setTimeout(() => {
          calculateRowSpan();
          video.removeEventListener("loadedmetadata", onLoadedMetadata);
          video.removeEventListener("error", onVideoError);
        }, 2000); // 2 seconds timeout

        video.addEventListener("loadedmetadata", onLoadedMetadata);
        video.addEventListener("error", onVideoError);
      } else {
        calculateRowSpan();
      }
    });

    // Return the cleanup function to clear the safety timeout
    return () => clearTimeout(safetyTimeout);
  }, [store.layout, isMobile]);

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
  }, [sortedPosts.length]); // Effect for resizing grid items on posts change, layout change, or settings change that affect post dimensions
  useEffect(() => {
    if (!isMobile && store.layout === "grid") {
      setIsGridCalculating(true);

      // Allow the grid calculation to run completely via the resizeGridItems function
      // which has its own safety timeout that will be cleared when calculation completes
      const calculationResult = resizeGridItems();

      // No need for additional safety timer as resizeGridItems handles this
      return calculationResult;
    } else {
      setIsGridCalculating(false);
    }
    const resizeObserver = new ResizeObserver((entries) => {
      if (store.layout === "grid" && !isMobile) {
        // If any observed element changes size, we may need to recalculate
        if (entries.length > 0) {
          // Check if we're currently calculating to avoid redundant calculations
          if (!isGridCalculating) {
            // Debounce the grid recalculation
            const recalcTimer = setTimeout(() => {
              resizeGridItems();
            }, 100);

            return () => clearTimeout(recalcTimer);
          }
        }
      }
    });

    if (postsContainerRef.current) {
      const postElements =
        postsContainerRef.current.querySelectorAll<HTMLElement>(":scope > div");

      // Observe both the container and each post element
      resizeObserver.observe(postsContainerRef.current);
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
    isMobile,
  ]); // Recalculate grid sizes when more posts are loaded (infinite scroll)
  useEffect(() => {
    if (!isMobile && store.layout === "grid") {
      resizeGridItems();
    }
  }, [visibleCount, store.layout, resizeGridItems, isMobile]);

  // Add an effect to handle document load completion - this ensures all images are properly loaded
  useEffect(() => {
    if (!isMobile && store.layout === "grid") {
      // When the window is fully loaded (including all resources)
      const handleLoad = () => {
        // Short delay to allow any final rendering to complete
        setTimeout(() => {
          if (postsContainerRef.current) {
            // Force a recalculation once everything is fully loaded
            resizeGridItems();
          }
        }, 300);
      };

      // Add event listener for window load
      window.addEventListener("load", handleLoad);

      // Also add a failsafe timeout to recalculate after a delay
      const recalculateTimeout = setTimeout(() => {
        if (postsContainerRef.current) {
          resizeGridItems();
        }
      }, 1000);

      return () => {
        window.removeEventListener("load", handleLoad);
        clearTimeout(recalculateTimeout);
      };
    }
  }, [isMobile, store.layout, resizeGridItems]);

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
          )}{" "}
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
        {!isMobile && (
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
        )}
      </div>{" "}
      {sortedPosts.length > 0 ? (
        <div
          className={`${styles.postsContainer} ${
            styles[isMobile ? "list" : store.layout]
          } ${
            isGridCalculating && store.layout === "grid" && !isMobile
              ? styles.calculating
              : ""
          }`}
          ref={postsContainerRef}
        >
          {" "}
          {sortedPosts.slice(0, visibleCount).map((post) => (
            <div
              key={post.id}
              className={
                isGridCalculating && store.layout === "grid" && !isMobile
                  ? styles.hiddenContent
                  : ""
              }
              style={{
                opacity: store.layout === "grid" ? 0 : 1, // Start with opacity 0 for grid layout
                visibility: store.layout === "grid" ? "hidden" : "visible", // Start hidden for grid layout
              }}
            >
              <div className="post-content">
                <PostComponent
                  post={post}
                  onUnsave={handlePostUnsave}
                  addToast={addToast}
                />
              </div>
              <hr />
            </div>
          ))}{" "}
          {/* Loader for infinite scroll */}
          {visibleCount < sortedPosts.length && (
            <div className={styles.infiniteScrollLoader}>
              Loading more posts...
            </div>
          )}
          {/* Show the arranging posts overlay during grid calculation */}
          {isGridCalculating && store.layout === "grid" && !isMobile && (
            <div className={styles.calculatingOverlay}>
              <div className={styles.calculatingSpinner}></div>
              <p>Arranging posts...</p>
            </div>
          )}
        </div>
      ) : (
        <div className={styles.noResults}>
          No posts match your search criteria
        </div>
      )}{" "}
      {showScrollToTop && (
        <button
          className={`${styles.scrollToTopButton}`}
          onClick={scrollToTop}
          aria-label="Scroll to top"
        >
          <Up />
        </button>
      )}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
};
