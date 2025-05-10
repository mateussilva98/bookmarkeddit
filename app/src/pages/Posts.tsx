/**
 * Main Posts page component
 * Handles fetching, displaying, and filtering saved Reddit posts
 */
import { FC, useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../hooks/use-store";
import { Header } from "../components/Header";
import { Post, MediaMetadata, VideoInfo } from "../types/Post";
import { Filters, SelectedFilters } from "../components/Filters";
import { PostsList } from "../components/PostsList";
import { Loader } from "../components/ui/Loader";
import { RateLimitCountdown } from "../components/ui/RateLimitCountdown";
import { SettingsModal } from "../components/SettingsModal";
import { redditApi, ApiError } from "../api";
import styles from "./Posts.module.scss";

export const Posts: FC = () => {
  const { store, checkTokenExpiration, toggleFiltersVisibility } = useStore();
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
  // Using store.showFilters from global state instead of local state

  // Rate limiting state management
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [isWaitingToRetry, setIsWaitingToRetry] = useState<boolean>(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Refs to track fetch status
  const isFetchingRef = useRef<boolean>(false); // Prevent duplicate fetches
  const initialFetchDoneRef = useRef<boolean>(false); // Track initial data load

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
   */
  const handlePostUnsave = useCallback(
    (postId: string) => {
      setPosts((prevPosts) => {
        // Find the post that was unsaved
        const unsavedPost = prevPosts.find((post) => post.id === postId);
        const newPosts = prevPosts.filter((post) => post.id !== postId);

        // If we found the unsaved post and have active community filters
        if (unsavedPost && activeFilters.communities.length > 0) {
          const unsavedCommunity = unsavedPost.subreddit;

          // Check if this was the last post from this community
          const remainingPostsInCommunity = newPosts.filter(
            (post) => post.subreddit === unsavedCommunity
          ).length;

          // If this was the last post from this community and it was in our active filters
          if (
            remainingPostsInCommunity === 0 &&
            activeFilters.communities.includes(unsavedCommunity)
          ) {
            // Remove this community from active filters
            setActiveFilters((prev) => ({
              ...prev,
              communities: prev.communities.filter(
                (community) => community !== unsavedCommunity
              ),
            }));
          }
        }

        return newPosts;
      });
    },
    [activeFilters.communities]
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
   * Sets up automatic retry with countdown after rate limiting
   * @param seconds - Number of seconds to wait before retrying
   */
  const setupRetry = useCallback((seconds: number) => {
    cleanUpTimers();

    setRetryAfter(seconds);
    setRetryCountdown(seconds);
    setIsWaitingToRetry(true);

    // Set up countdown timer to update UI
    countdownIntervalRef.current = setInterval(() => {
      setRetryCountdown((prev) => {
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
      setRetryCountdown(null);
      fetchSavedPosts();
    }, seconds * 1000);
  }, []);

  /**
   * Cancels any active automatic retry
   */
  const cancelRetry = useCallback(() => {
    cleanUpTimers();
    setIsWaitingToRetry(false);
    setRetryAfter(null);
    setRetryCountdown(null);
  }, [cleanUpTimers]);

  /**
   * Fetches saved posts from Reddit API and processes them
   * Handles authentication, rate limiting, and data transformation
   */
  const fetchSavedPosts = useCallback(async () => {
    // Prevent multiple simultaneous requests
    if (isFetchingRef.current) {
      console.log("Fetch already in progress, skipping duplicate request");
      return;
    }

    try {
      isFetchingRef.current = true;
      setLoading(true);
      setError(null);

      // Check if token needs refreshing
      const validToken = await checkTokenExpiration();
      if (!validToken) {
        navigate("/");
        return;
      }

      console.log("Starting to fetch all saved posts incrementally");
      const data = await redditApi.getAllSavedPosts(validToken);
      console.log(
        `Successfully fetched all ${data.data.children.length} saved posts`
      );

      // Process the posts
      const processedPosts: Post[] = [];

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
        }

        // If no images were found but there's a thumbnail, add it
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
        }

        // Create standardized post object with needed properties
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
          thumbnail:
            post.data.thumbnail &&
            post.data.thumbnail !== "self" &&
            post.data.thumbnail !== "default"
              ? post.data.thumbnail
              : "",
          images: images.length > 0 ? images : undefined,
          video: videoInfo,
          type: post.kind === "t3" ? "Post" : "Comment",
          nsfw: post.data.over_18,
          commentCount: post.data.num_comments,
          fullname: post.kind + "_" + post.data.id,
        };

        processedPosts.push(postP);
      }

      initialFetchDoneRef.current = true;
      console.log(`Processed ${processedPosts.length} posts`);
      setPosts(processedPosts);
    } catch (error) {
      console.error("Error fetching saved posts:", error);

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
        setError(
          error instanceof Error
            ? error.message
            : "Failed to load your saved posts. Please try again."
        );
      }
    } finally {
      if (!isWaitingToRetry) {
        setLoading(false);
      }
      // Reset the fetching flag when done
      isFetchingRef.current = false;
    }
  }, [checkTokenExpiration, navigate, setupRetry, isWaitingToRetry]);

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
    fetchSavedPosts();
  }, [isWaitingToRetry, cancelRetry, fetchSavedPosts]);

  /**
   * Effect to handle initial fetch and authentication check
   * Also cleans up timers when component unmounts
   */
  useEffect(() => {
    // Redirect to home if not authenticated
    if (!store.auth.isLoading && !store.auth.isAuthenticated) {
      navigate("/");
      return;
    }

    // Only fetch on initial mount and when explicitly needed (not on every render)
    if (
      store.auth.isAuthenticated &&
      !isWaitingToRetry &&
      !initialFetchDoneRef.current
    ) {
      fetchSavedPosts();
    }

    // Clean up timers when component unmounts
    return () => {
      cleanUpTimers();
    };
  }, [
    store.auth.isAuthenticated,
    store.auth.isLoading,
    navigate,
    fetchSavedPosts,
    isWaitingToRetry,
    cleanUpTimers,
  ]);

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
              setRetryCountdown(null);
              fetchSavedPosts();
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
          {store.showFilters ? (
            <div className={styles.filters}>
              <Filters
                subredditCounts={subredditCounts}
                typeCounts={typeCounts}
                nsfwCounts={nsfwCounts}
                onFilterChange={handleFilterChange}
                totalPosts={posts.length}
                onRefresh={handleRetry}
                onToggleVisibility={toggleFiltersVisibility}
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
        </main>
      )}

      <SettingsModal isOpen={isSettingsOpen} onClose={handleCloseSettings} />
    </>
  );
};
