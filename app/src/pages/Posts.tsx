import { FC, useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../hooks/use-store";
import { Header } from "../components/Header";
import { Post, MediaMetadata, VideoInfo } from "../types/Post";
import { Filters, SelectedFilters } from "../components/Filters";
import { PostsList } from "../components/PostsList";
import { Loader } from "../components/ui/Loader";
import { SettingsModal } from "../components/SettingsModal";
import { redditApi, ApiError } from "../api";
import styles from "./Posts.module.scss";

export const Posts: FC = () => {
  const { store, checkTokenExpiration } = useStore();
  const navigate = useNavigate();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [activeFilters, setActiveFilters] = useState<SelectedFilters>({
    communities: [],
    type: null,
    nsfw: null,
  });

  // Rate limiting state
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [isWaitingToRetry, setIsWaitingToRetry] = useState<boolean>(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Track if a fetch is already in progress to prevent duplicates
  const isFetchingRef = useRef<boolean>(false);
  // Track if initial fetch was completed
  const initialFetchDoneRef = useRef<boolean>(false);

  // Handle settings button click
  const handleSettingsClick = () => {
    setIsSettingsOpen(true);
  };

  // Handle closing the settings modal
  const handleCloseSettings = () => {
    setIsSettingsOpen(false);
  };

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: SelectedFilters) => {
    setActiveFilters(newFilters);
  }, []);

  // Clean up timers when component unmounts or on retry
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

  // Set up automatic retry based on rate limit info
  const setupRetry = useCallback((seconds: number) => {
    cleanUpTimers();

    setRetryAfter(seconds);
    setRetryCountdown(seconds);
    setIsWaitingToRetry(true);

    // Set up countdown timer
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

    // Set up retry timer
    retryTimeoutRef.current = setTimeout(() => {
      setIsWaitingToRetry(false);
      setRetryAfter(null);
      setRetryCountdown(null);
      fetchSavedPosts();
    }, seconds * 1000);
  }, []);

  // Cancel automatic retry
  const cancelRetry = useCallback(() => {
    cleanUpTimers();
    setIsWaitingToRetry(false);
    setRetryAfter(null);
    setRetryCountdown(null);
  }, [cleanUpTimers]);

  // Fetch saved posts from Reddit - we're memoizing this function to prevent recreation
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

      console.log("Starting to fetch saved posts");
      const data = await redditApi.getSavedPosts(validToken);
      console.log("Successfully fetched saved posts");
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
        };

        processedPosts.push(postP);
      }

      initialFetchDoneRef.current = true;
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

  // Handle manual retry button click
  const handleRetry = useCallback(() => {
    setError(null);
    if (isWaitingToRetry) {
      // If we're waiting for a rate-limit retry, cancel it and force a retry now
      cancelRetry();
    }
    fetchSavedPosts();
  }, [isWaitingToRetry, cancelRetry, fetchSavedPosts]);

  // Effect to handle initial fetch and cleanup
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

  // Generate filter data from posts
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

  // Apply filters to posts
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

      {isWaitingToRetry && (
        <div className={styles.retryContainer}>
          <div className={styles.retryMessage}>
            <h3>Reddit Rate Limit Reached</h3>
            <p>
              Reddit limits how frequently we can request data.
              {retryCountdown !== null &&
                retryCountdown > 0 &&
                ` Retrying automatically in ${retryCountdown} second${
                  retryCountdown !== 1 ? "s" : ""
                }...`}
            </p>
            <div className={styles.retryProgress}>
              <div
                className={styles.retryProgressBar}
                style={{
                  width: `${
                    retryCountdown !== null && retryAfter !== null
                      ? ((retryAfter - retryCountdown) / retryAfter) * 100
                      : 0
                  }%`,
                }}
              ></div>
            </div>
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
          <div className={styles.filters}>
            <Filters
              subredditCounts={subredditCounts}
              typeCounts={typeCounts}
              nsfwCounts={nsfwCounts}
              onFilterChange={handleFilterChange}
              totalPosts={posts.length}
              onRefresh={handleRetry}
            />
          </div>
          <div className={styles.postsList}>
            <PostsList posts={filteredPosts} />
          </div>
        </main>
      )}

      <SettingsModal isOpen={isSettingsOpen} onClose={handleCloseSettings} />
    </>
  );
};
