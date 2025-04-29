import { FC, useEffect, useState, useMemo, useCallback } from "react";
import { useStore } from "../hooks/use-store";
import { Header } from "../components/Header";
import { Post, MediaMetadata } from "../types/Post";
import { Filters, SelectedFilters } from "../components/Filters";
import { PostsList } from "../components/PostsList";
import { Loader } from "../components/ui/Loader";
import { SettingsModal } from "../components/SettingsModal";
import styles from "./Posts.module.scss";

export const Posts: FC = () => {
  const { store } = useStore(); // Access token from the store

  const [loading, setLoading] = useState<boolean>(true); // Loading state to manage UI during fetch
  const [posts, setPosts] = useState<Post[]>([]); // State to hold fetched posts
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false); // State to control settings modal visibility
  const [activeFilters, setActiveFilters] = useState<SelectedFilters>({
    communities: [],
    type: null,
    nsfw: null,
  });

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

  useEffect(() => {
    const accessToken = store.access_token;

    const fetchSavedPosts = async () => {
      try {
        setPosts([]); // Clear posts before fetching new ones
        const apiUrl = "http://localhost:5000/reddit/saved"; // Use backend proxy URL

        const response = await fetch(apiUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Failed to fetch saved posts:", errorData.error);
          return;
        }

        const data = await response.json();
        console.log("Fetched saved posts:", data);

        for (const post of data.data.children) {
          const postP: Post = {
            id: post.data.id,
            subreddit: post.data.subreddit,
            author: post.data.author,
            createdAt: post.data.created,
            title: post.data.title || post.data.link_title || "",
            description: post.data.selftext || post.data.body || "",
            url: post.data.url || post.data.link_url || "",
            score: post.data.score,
            /* mediaMetadata: post.data.media_metadata || [], */
            thumbnail:
              post.data.media_metadata &&
              typeof post.data.media_metadata === "object"
                ? Object.values(
                    post.data.media_metadata as Record<string, MediaMetadata>
                  )[0]?.p?.at(-1)?.u || ""
                : "",
            type: post.kind === "t3" ? "Post" : "Comment",
            nsfw: post.data.over_18,
            commentCount: post.data.num_comments,
          };

          setPosts((prevPosts) => [...prevPosts, postP]);
        }
        setLoading(false); // Set loading to false after fetching posts
      } catch (error) {
        console.error("Error fetching saved posts:", error);
      }
    };

    fetchSavedPosts();
  }, [store.access_token]); // Re-run effect if token changes

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
      <Loader isVisible={loading} />
      {!loading && (
        <main className={styles.root}>
          <div className={styles.filters}>
            <Filters
              subredditCounts={subredditCounts}
              typeCounts={typeCounts}
              nsfwCounts={nsfwCounts}
              onFilterChange={handleFilterChange}
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
