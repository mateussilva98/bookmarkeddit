/**
 * Main Posts page component
 * Handles fetching, displaying, and filtering saved Reddit posts
 */
import { FC, useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../hooks/useStore";
import { Header } from "../components/Header";
import { Post, MediaMetadata, VideoInfo } from "../types/Post";
import { Filters, SelectedFilters } from "../components/Filters";
import { PostsList } from "../components/PostsList";
import { Loader } from "../components/ui/Loader";
import { RateLimitCountdown } from "../components/ui/RateLimitCountdown";
import { SettingsModal } from "../components/SettingsModal";
import { ToastContainer, ToastType } from "../components/ui/Toast";
import { redditApi, ApiError } from "../api";
import { v4 as uuidv4 } from "uuid";
import styles from "./Posts.module.scss";

// localStorage key constants
const POSTS_STORAGE_KEY = "bookmarkeddit_posts";
const POSTS_TIMESTAMP_KEY = "bookmarkeddit_posts_timestamp";

export const Posts: FC = () => {
  const {
    store,
    checkTokenExpiration,
    toggleFiltersVisibility,
    handleAuthError,
  } = useStore();
  const navigate = useNavigate();

  // UI state management
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [activeFilters, setActiveFilters] = useState<SelectedFilters>({
    communities: [],
    type: null,
    nsfw: null,
  });

  // New state for background fetching and updates
  const [backgroundFetching, setBackgroundFetching] = useState<boolean>(false);
  const [toasts, setToasts] = useState<
    { id: string; message: string; type: ToastType }[]
  >([]);

  // Rate limiting state management
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [isWaitingToRetry, setIsWaitingToRetry] = useState<boolean>(false);

  // Refs for timers and state tracking
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isFetchingRef = useRef<boolean>(false); // Prevent duplicate fetches
  const initialFetchDoneRef = useRef<boolean>(false); // Track initial data load
  const fetchSavedPostsRef = useRef<
    ((backgroundFetch?: boolean) => Promise<void>) | null
  >(null);
  // Ref to track previous authentication state for detecting logout
  const wasAuthenticatedRef = useRef<boolean>(false);
  /**
   * Save posts to localStorage
   */
  const savePostsToLocalStorage = useCallback((postsToSave: Post[]) => {
    try {
      localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(postsToSave));
      localStorage.setItem(POSTS_TIMESTAMP_KEY, Date.now().toString());
    } catch (error) {
      console.error("Error saving posts to localStorage:", error);
    }
  }, []);

  /**
   * Clears posts-related data from localStorage
   * Called when user logs out
   */ const clearPostsFromLocalStorage = useCallback(() => {
    try {
      // Clearing posts data when user logs out to maintain privacy
      localStorage.removeItem(POSTS_STORAGE_KEY);
      localStorage.removeItem(POSTS_TIMESTAMP_KEY);
    } catch (error) {
      console.error("Error clearing posts from localStorage:", error);
    }
  }, []);

  /**
   * Get posts from localStorage
   * @returns Array of posts or null if not found/invalid
   */
  const getPostsFromLocalStorage = useCallback((): {
    posts: Post[] | null;
    timestamp: number | null;
  } => {
    try {
      const postsJson = localStorage.getItem(POSTS_STORAGE_KEY);
      const timestamp = localStorage.getItem(POSTS_TIMESTAMP_KEY);

      if (!postsJson) return { posts: null, timestamp: null };

      const parsedPosts = JSON.parse(postsJson) as Post[];
      const parsedTimestamp = timestamp ? parseInt(timestamp) : null;

      return {
        posts: Array.isArray(parsedPosts) ? parsedPosts : null,
        timestamp: parsedTimestamp,
      };
    } catch (error) {
      console.error("Error retrieving posts from localStorage:", error);
      return { posts: null, timestamp: null };
    }
  }, []);

  /**
   * Compare stored posts with fresh posts from API
   * @returns Information about differences
   */
  const comparePostsWithStored = useCallback(
    (storedPosts: Post[], freshPosts: Post[]) => {
      const storedIds = new Set(storedPosts.map((post) => post.id));
      const freshIds = new Set(freshPosts.map((post) => post.id));

      // Find new posts that aren't in stored posts
      const newPosts = freshPosts.filter((post) => !storedIds.has(post.id));

      // Find deleted posts that are in stored but not in fresh
      const deletedPosts = storedPosts.filter((post) => !freshIds.has(post.id));

      return {
        hasChanges: newPosts.length > 0 || deletedPosts.length > 0,
        newCount: newPosts.length,
        deletedCount: deletedPosts.length,
        completelyNew: storedPosts.length === 0,
      };
    },
    []
  );

  /**
   * Remove a toast notification by ID
   */
  const removeToast = useCallback((id: string) => {
    setToasts((currentToasts) =>
      currentToasts.filter((toast) => toast.id !== id)
    );
  }, []);

  /**
   * Add a toast notification
   */
  const addToast = useCallback(
    (message: string, type: ToastType) => {
      const id = uuidv4();
      setToasts((currentToasts) => [...currentToasts, { id, message, type }]);
      // Automatically remove toast after 5 seconds
      setTimeout(() => {
        removeToast(id);
      }, 5000);
    },
    [removeToast]
  );

  /**
   * Cleans up timer references to prevent memory leaks
   */
  const cleanUpTimers = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  /**
   * Cancels any active automatic retry
   */
  const cancelRetry = useCallback(() => {
    cleanUpTimers();
    setIsWaitingToRetry(false);
    setRetryAfter(null);
  }, [cleanUpTimers]);

  /**
   * Sets up automatic retry with countdown after rate limiting
   * Uses fetchSavedPostsRef to avoid circular dependency
   * @param seconds - Number of seconds to wait before retrying
   */
  const setupRetry = useCallback(
    (seconds: number) => {
      cleanUpTimers();

      setRetryAfter(seconds);
      setIsWaitingToRetry(true);

      // Set up countdown timer to update UI
      countdownIntervalRef.current = setInterval(() => {
        setRetryAfter((prev) => {
          if (prev !== null && prev > 0) {
            return prev - 1;
          } else {
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
            }
            return 0;
          }
        });
      }, 1000);

      // Set up automatic retry after countdown finishes
      retryTimeoutRef.current = setTimeout(() => {
        setIsWaitingToRetry(false);
        setRetryAfter(null);
        // Use the ref to avoid circular dependency
        if (fetchSavedPostsRef.current) {
          fetchSavedPostsRef.current();
        }
      }, seconds * 1000);
    },
    [cleanUpTimers]
  );

  /**
   * Fetches saved posts from Reddit API and processes them
   * Handles authentication, rate limiting, and data transformation
   * If backgroundFetch is true, will fetch in background without showing main loader
   */
  const fetchSavedPosts = useCallback(
    async (backgroundFetch = false) => {
      // Prevent multiple simultaneous requests
      if (isFetchingRef.current) {
        return;
      }

      try {
        isFetchingRef.current = true;
        if (!backgroundFetch) {
          setLoading(true);
        } else {
          setBackgroundFetching(true);
        }
        setError(null);

        // Check if token needs refreshing
        // Validating authentication token before making API calls
        const validToken = await checkTokenExpiration();
        if (!validToken) {
          console.error("No valid token available, redirecting to login");
          navigate("/");
          return;
        }
        // Token validation successful

        // Try to load cached posts first if this is not a background fetch
        if (!backgroundFetch) {
          const { posts: storedPosts, timestamp } = getPostsFromLocalStorage();

          // If we have stored posts and they're not too old (less than 24 hours), use them first
          const MAX_POSTS_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
          const isStoredPostsRecent =
            timestamp && Date.now() - timestamp < MAX_POSTS_AGE_MS;

          if (storedPosts && storedPosts.length > 0 && isStoredPostsRecent) {
            // Using cached posts from local storage since they're recent enough
            setPosts(storedPosts);
            setLoading(false);

            // Continue with background fetch to update data
            // Schedule background fetch to refresh data while displaying cached posts
            setTimeout(() => {
              if (fetchSavedPostsRef.current) {
                fetchSavedPostsRef.current(true);
              }
            }, 100);
            return;
          } else {
            // Cache is not available or too old
            if (storedPosts) {
              // Found outdated posts in local storage
            } else {
              // No cached posts found in local storage
            }
          }
        }

        // No valid cache, fetching all saved posts from Reddit API
        const data = await redditApi.getAllSavedPosts(validToken);
        // Successfully retrieved saved posts from Reddit API

        // Process the posts
        const processedPosts: Post[] = [];
        // Starting to transform raw Reddit API data into application-specific Post objects

        for (const post of data.data.children) {
          // Function to decode HTML entities in URLs
          const decodeHtmlEntities = (url: string): string => {
            const doc = new DOMParser().parseFromString(url, "text/html");
            return doc.documentElement.textContent || url;
          };

          // Extract images from media_metadata if available
          const images: string[] = [];
          if (
            post.data.media_metadata &&
            typeof post.data.media_metadata === "object"
          ) {
            Object.values(
              post.data.media_metadata as Record<string, MediaMetadata>
            ).forEach((media) => {
              // Try to get the best quality image
              if (media.s && media.s.u) {
                images.push(decodeHtmlEntities(media.s.u));
              } else if (media.p && media.p.length > 0) {
                // Get the largest preview if s.u is not available
                const largestPreview = media.p[media.p.length - 1];
                if (largestPreview.u) {
                  images.push(decodeHtmlEntities(largestPreview.u));
                }
              }
            });
          } // If no images were found but there's a valid thumbnail, use it as an image
          if (
            images.length === 0 &&
            post.data.thumbnail &&
            post.data.thumbnail !== "self" &&
            post.data.thumbnail !== "default"
          ) {
            images.push(post.data.thumbnail);
          }

          // Extract video information if available
          let videoInfo: VideoInfo | undefined = undefined;

          // Check for Reddit hosted videos
          if (post.data.media && post.data.media.reddit_video) {
            const redditVideo = post.data.media.reddit_video;
            videoInfo = {
              url: decodeHtmlEntities(redditVideo.fallback_url),
              width: redditVideo.width,
              height: redditVideo.height,
              duration: redditVideo.duration,
              isGif: redditVideo.is_gif || false,
              dashUrl: redditVideo.dash_url
                ? decodeHtmlEntities(redditVideo.dash_url)
                : undefined,
              hlsUrl: redditVideo.hls_url
                ? decodeHtmlEntities(redditVideo.hls_url)
                : undefined,
              fallbackUrl: redditVideo.fallback_url
                ? decodeHtmlEntities(redditVideo.fallback_url)
                : undefined,
            };
          }
          // Check for external videos from trusted sources like YouTube, Vimeo, etc.
          else if (post.data.media && post.data.media.oembed) {
            const oembed = post.data.media.oembed;
            if (oembed.type === "video" && oembed.html) {
              // Extract the iframe src URL from the HTML embed code if possible
              const srcMatch = oembed.html.match(/src="([^"]+)"/);
              if (srcMatch && srcMatch[1]) {
                videoInfo = {
                  url: decodeHtmlEntities(srcMatch[1]),
                  width: oembed.width,
                  height: oembed.height,
                };
              }
            }
          }
          // Check for gfycat and gifv links
          else if (
            post.data.url &&
            (post.data.url.includes("gfycat.com") ||
              post.data.url.includes(".gifv") ||
              post.data.url.includes(".mp4"))
          ) {
            let videoUrl = post.data.url;
            // Convert Imgur .gifv to .mp4
            if (videoUrl.endsWith(".gifv")) {
              videoUrl = videoUrl.replace(".gifv", ".mp4");
            }

            videoInfo = {
              url: decodeHtmlEntities(videoUrl),
              isGif: videoUrl.includes(".gif") || videoUrl.includes("gfycat"),
            };
          } // Create standardized post object with needed properties
          const postP: Post = {
            id: post.data.id,
            subreddit: post.data.subreddit,
            author: post.data.author,
            createdAt: post.data.created,
            title: post.data.title || post.data.link_title || "",
            description: post.data.selftext || post.data.body || "",
            url: post.data.url || post.data.link_url || "",
            score: post.data.score,
            media_metadata: post.data.media_metadata,
            images: images.length > 0 ? images : undefined,
            video: videoInfo,
            type: post.kind === "t3" ? "Post" : "Comment",
            nsfw: post.data.over_18,
            commentCount: post.data.num_comments,
            fullname: post.kind + "_" + post.data.id,
          };

          processedPosts.push(postP);
        }

        // Processing of posts completed
        // Mark initial fetch as done
        initialFetchDoneRef.current = true;
        // Successfully processed all posts

        // If this was a background fetch, compare with current posts
        if (backgroundFetch) {
          // Compare with current posts
          const comparison = comparePostsWithStored(posts, processedPosts);

          // Save to localStorage
          // Saving updated posts to local storage after background fetch
          savePostsToLocalStorage(processedPosts); // Only show notification if there are actual changes
          if (comparison.hasChanges) {
            // Changes detected in background fetch

            // Automatically apply new posts to update state
            setPosts(processedPosts);

            // Display different toasts based on what changed
            if (comparison.newCount > 0 && comparison.deletedCount > 0) {
              // Both additions and deletions
              addToast(
                `Updated: ${comparison.newCount} new, ${comparison.deletedCount} removed posts`,
                "success"
              );
            } else if (comparison.newCount > 0) {
              // Only additions
              addToast(
                `Loaded ${comparison.newCount} new post${
                  comparison.newCount > 1 ? "s" : ""
                }`,
                "success"
              );
            } else if (comparison.deletedCount > 0) {
              // Only deletions
              addToast(
                `Removed ${comparison.deletedCount} unsaved post${
                  comparison.deletedCount > 1 ? "s" : ""
                }`,
                "info"
              );
            }

            // Reset active filters if they reference subreddits that no longer exist
            if (
              comparison.deletedCount > 0 &&
              activeFilters.communities.length > 0
            ) {
              // Get all current subreddits after the update
              const availableSubreddits = new Set(
                processedPosts.map((post) => post.subreddit)
              );

              // Filter out communities that no longer exist in the updated posts
              const validCommunities = activeFilters.communities.filter(
                (community) => availableSubreddits.has(community)
              );

              // If some communities were removed from the filter, update the filter
              if (
                validCommunities.length !== activeFilters.communities.length
              ) {
                setActiveFilters((prev) => ({
                  ...prev,
                  communities: validCommunities,
                }));
              }
            }
          } else {
            // Background fetch completed with no changes detected
            addToast("Your saved posts are up to date", "info");
          }
        } else {
          // Initial fetch - set posts directly and save to localStorage

          setPosts(processedPosts);
          savePostsToLocalStorage(processedPosts);
        }
      } catch (error) {
        console.error("Error fetching saved posts:", error); // Handle authentication errors (401/403)
        if (error instanceof ApiError && error.isAuthError) {
          // Authentication error detected, redirecting to login page
          handleAuthError();
          return;
        }

        // Handle rate limiting
        if (
          error instanceof ApiError &&
          error.status === 429 &&
          error.retryAfter
        ) {
          setError(
            `Reddit rate limit reached. Automatically retrying in ${error.retryAfter} seconds...`
          );
          setupRetry(error.retryAfter);
        } else {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Failed to load your saved posts. Please try again.";
          console.error(`Setting error state: ${errorMessage}`);
          setError(errorMessage);
        }
      } finally {
        if (!backgroundFetch) {
          // Foreground operation finished - UI loading indicator can be removed
          setLoading(false);
        } else {
          // Background operation finished - update state accordingly
          setBackgroundFetching(false);
        }
        // Reset the fetching flag when done
        isFetchingRef.current = false;
        // Post retrieval and processing workflow completed
      }
    },
    [
      checkTokenExpiration,
      navigate,
      setupRetry,
      getPostsFromLocalStorage,
      savePostsToLocalStorage,
      comparePostsWithStored,
      posts,
      addToast,
      activeFilters,
      handleAuthError,
    ]
  );

  // Store the fetchSavedPosts function in a ref to avoid circular dependencies
  useEffect(() => {
    fetchSavedPostsRef.current = fetchSavedPosts;
  }, [fetchSavedPosts]);

  /**
   * Force refresh posts
   * Can be called programmatically when needed
   */
  const forceRefreshPosts = useCallback(() => {
    // Manual refresh triggered - fetching fresh posts from Reddit
    if (store.auth.isAuthenticated) {
      // Reset the fetch flag to ensure a fresh fetch
      initialFetchDoneRef.current = false;
      // Clear any pending retries
      if (isWaitingToRetry) {
        cancelRetry();
      }
      // Trigger a fresh fetch using the ref to avoid circular dependency
      if (fetchSavedPostsRef.current) {
        fetchSavedPostsRef.current();
      }
    } else {
      // Refresh attempt blocked - user must be authenticated first
    }
  }, [store.auth.isAuthenticated, cancelRetry, isWaitingToRetry]);

  /**
   * Handles manual retry button click
   * Cancels any ongoing automatic retry and forces a new fetch
   */
  const handleRetry = useCallback(() => {
    setError(null);
    if (isWaitingToRetry) {
      // If we're waiting for a rate-limit retry, cancel it and force a retry now
      cancelRetry();
    }
    // Use the ref to avoid circular dependency
    if (fetchSavedPostsRef.current) {
      fetchSavedPostsRef.current();
    }
  }, [isWaitingToRetry, cancelRetry]);

  /**
   * Opens the settings modal
   */
  const handleSettingsClick = () => {
    setIsSettingsOpen(true);
  };

  /**
   * Closes the settings modal
   */
  const handleCloseSettings = () => {
    setIsSettingsOpen(false);
  };

  /**
   * Updates active filters when filter selections change
   */
  const handleFilterChange = useCallback((newFilters: SelectedFilters) => {
    setActiveFilters(newFilters);
  }, []);
  /**
   * Handles post unsave action from PostsList
   * Updates posts array and manages community filters if a community has no more posts
   */ const handlePostUnsave = useCallback(
    (postId: string) => {
      // Processing post unsave action with tracking ID
      // Checking active community filters for potential updates

      setPosts((prevPosts) => {
        // Find the post that was unsaved
        const unsavedPost = prevPosts.find((post) => post.id === postId);
        const newPosts = prevPosts.filter((post) => post.id !== postId);

        if (unsavedPost) {
          // Post identified for tracking community filter updates
        }

        // If we found the unsaved post and have active community filters
        if (unsavedPost && activeFilters.communities.length > 0) {
          const unsavedCommunity = unsavedPost.subreddit;

          // Check if this was the last post from this community
          const remainingPostsInCommunity = newPosts.filter(
            (post) => post.subreddit === unsavedCommunity
          ).length;

          // Tracking number of remaining posts from this subreddit community
          // Checking if this community is in active filters for potential cleanup

          // If this was the last post from this community and it was in our active filters
          if (
            remainingPostsInCommunity === 0 &&
            activeFilters.communities.includes(unsavedCommunity)
          ) {
            // Last post from community unsaved - removing from filters since no more content exists

            // Remove this community from active filters
            setActiveFilters((prev) => {
              const updatedCommunities = prev.communities.filter(
                (community) => community !== unsavedCommunity
              );

              // Community filter updated after removing empty subreddit

              // Show notification when a subreddit is completely removed
              addToast(
                `No more posts from r/${unsavedCommunity}, removed from filters`,
                "info"
              );

              return {
                ...prev,
                communities: updatedCommunities,
              };
            });
          }
        }

        // Also update localStorage
        savePostsToLocalStorage(newPosts);

        // Show toast notification for the unsaved post
        if (unsavedPost) {
          addToast(
            `Post "${unsavedPost.title.substring(0, 30)}${
              unsavedPost.title.length > 30 ? "..." : ""
            }" removed`,
            "info"
          );
        }

        return newPosts;
      });
    },
    [savePostsToLocalStorage, addToast, activeFilters, setActiveFilters]
  );

  /**
   * Effect to handle logout - clears posts data from localStorage
   */
  useEffect(() => {
    // If previously authenticated but now not authenticated (logout)
    if (
      wasAuthenticatedRef.current &&
      !store.auth.isLoading &&
      !store.auth.isAuthenticated
    ) {
      // User has logged out - removing cached posts data for security/privacy
      clearPostsFromLocalStorage();
    }

    // Update the ref with current authentication state
    wasAuthenticatedRef.current = store.auth.isAuthenticated;
  }, [
    store.auth.isAuthenticated,
    store.auth.isLoading,
    clearPostsFromLocalStorage,
  ]);

  /**
   * Effect to handle authentication state changes
   * Specifically monitors for authentication completion
   */
  useEffect(() => {
    // If the auth state changed from loading to authenticated, trigger post fetch
    if (!store.auth.isLoading && store.auth.isAuthenticated) {
      // Special case when auth just completed (no initial fetch done yet)
      if (!initialFetchDoneRef.current && !isFetchingRef.current) {
        forceRefreshPosts();
      }
    }
  }, [store.auth.isLoading, store.auth.isAuthenticated, forceRefreshPosts]);

  /**
   * Effect to handle initial fetch and authentication check
   * Also cleans up timers when component unmounts
   */
  useEffect(() => {
    // Redirect to home if not authenticated
    if (!store.auth.isLoading && !store.auth.isAuthenticated) {
      // Authentication required - redirecting unauthenticated user to login page
      navigate("/");
      return;
    }

    // Only fetch posts when auth is complete and we haven't fetched yet
    if (
      !store.auth.isLoading &&
      store.auth.isAuthenticated &&
      !isWaitingToRetry &&
      !initialFetchDoneRef.current &&
      fetchSavedPostsRef.current
    ) {
      // Authentication successful - starting initial post data retrieval
      fetchSavedPostsRef.current();
    }

    // Clean up timers when component unmounts
    return () => {
      cleanUpTimers();
    };
  }, [
    store.auth.isAuthenticated,
    store.auth.isLoading,
    navigate,
    isWaitingToRetry,
    cleanUpTimers,
  ]);

  /**
   * Error boundary effect to catch and report any errors
   * Helps identify issues in the authentication and post loading flow
   */
  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error(
        "Unhandled error in Posts component:",
        error.error || error.message
      );
      // You could also send this to an error reporting service
    };

    window.addEventListener("error", handleError);

    return () => {
      window.removeEventListener("error", handleError);
    };
  }, []);

  /**
   * Generate counts of posts by subreddit for filtering
   */
  const subredditCounts = useMemo(() => {
    const counts = posts.reduce((acc, post) => {
      const subreddit = post.subreddit;
      acc[subreddit] = (acc[subreddit] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts).map(([subreddit, count]) => ({
      subreddit,
      count,
    }));
  }, [posts]);

  /**
   * Generate counts of posts by type (Post/Comment) for filtering
   */
  const typeCounts = useMemo(() => {
    const counts = posts.reduce((acc, post) => {
      const type = post.type;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts).map(([type, count]) => ({
      type,
      count,
    }));
  }, [posts]);

  /**
   * Generate counts of NSFW vs non-NSFW posts for filtering
   */
  const nsfwCounts = useMemo(() => {
    let nsfwCount = 0;
    let nonNsfwCount = 0;

    posts.forEach((post) => {
      if (post.nsfw) {
        nsfwCount++;
      } else {
        nonNsfwCount++;
      }
    });

    return [
      { nsfw: "Only NSFW posts", count: nsfwCount },
      { nsfw: "Only non-NSFW posts", count: nonNsfwCount },
    ];
  }, [posts]);
  /**
   * Apply active filters to the posts
   */
  const filteredPosts = useMemo(() => {
    // Applying active filter criteria (communities, types, NSFW) to post collection
    return posts.filter((post) => {
      // Filter by communities (if any are selected)
      if (
        activeFilters.communities.length > 0 &&
        !activeFilters.communities.includes(post.subreddit)
      ) {
        return false;
      }

      // Filter by type (if selected)
      if (activeFilters.type && post.type !== activeFilters.type) {
        return false;
      }

      // Filter by NSFW status (if selected)
      if (activeFilters.nsfw) {
        if (activeFilters.nsfw === "Only NSFW posts" && !post.nsfw) {
          return false;
        } else if (activeFilters.nsfw === "Only non-NSFW posts" && post.nsfw) {
          return false;
        }
      }

      return true;
    });
  }, [posts, activeFilters]);

  return (
    <>
      <Header onSettingsClick={handleSettingsClick} />

      {loading && !isWaitingToRetry && <Loader isVisible={true} />}

      {isWaitingToRetry && retryAfter && (
        <div className={styles.retryContainer}>
          <RateLimitCountdown
            retryAfter={retryAfter}
            onComplete={() => {
              setIsWaitingToRetry(false);
              setRetryAfter(null);
              if (fetchSavedPostsRef.current) {
                fetchSavedPostsRef.current();
              }
            }}
          />
          <div className={styles.retryButtons}>
            <button onClick={handleRetry} className={styles.retryNowButton}>
              Retry Now
            </button>
            <button
              onClick={() => navigate("/")}
              className={styles.cancelButton}
            >
              Return to Home
            </button>
          </div>
        </div>
      )}

      {error && !loading && !isWaitingToRetry && (
        <div className={styles.errorContainer}>
          <p className={styles.errorMessage}>{error}</p>
          <button onClick={handleRetry} className={styles.retryButton}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && !isWaitingToRetry && posts.length === 0 && (
        <div className={styles.emptyState}>
          <h2>No saved posts found</h2>
          <p>Start saving posts on Reddit to see them here!</p>
        </div>
      )}

      {!loading && !error && !isWaitingToRetry && posts.length > 0 && (
        <main className={styles.root}>
          {/* Show background fetching indicator */}
          {backgroundFetching && (
            <div className={styles.notificationBar}>
              <div className={styles.backgroundFetching}>
                <span className={styles.fetchingSpinner}></span>
                Updating posts in background...
              </div>
            </div>
          )}

          {/* Toast container for notifications */}
          <ToastContainer toasts={toasts} removeToast={removeToast} />

          <div className={styles.mainContent}>
            {store.showFilters ? (
              <div className={styles.filters}>
                {" "}
                <Filters
                  subredditCounts={subredditCounts}
                  typeCounts={typeCounts}
                  nsfwCounts={nsfwCounts}
                  onFilterChange={handleFilterChange}
                  totalPosts={posts.length}
                  onRefresh={handleRetry}
                  onToggleVisibility={toggleFiltersVisibility}
                  currentFilters={activeFilters}
                />
              </div>
            ) : (
              <div className={styles.filtersToggle}>
                <button
                  className="btn-icon"
                  onClick={toggleFiltersVisibility}
                  aria-label="Show filters"
                >
                  <span className={styles.toggleIcon}>⟩</span>
                </button>
              </div>
            )}
            <div className={styles.postsList}>
              <PostsList
                posts={filteredPosts}
                onRefresh={handleRetry}
                onPostUnsave={handlePostUnsave}
              />
            </div>
          </div>
        </main>
      )}

      <SettingsModal isOpen={isSettingsOpen} onClose={handleCloseSettings} />
    </>
  );
};
