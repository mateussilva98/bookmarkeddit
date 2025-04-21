import { FC, useEffect, useState, useMemo } from "react";
import { useStore } from "../hooks/use-store";
import { Header } from "../components/Header";
import { Post } from "../types/Post";
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
            title: post.data.title
              ? post.data.title
              : post.data.link_title
              ? post.data.link_title
              : "",
            description: post.data.selftext
              ? post.data.selftext
              : post.data.body
              ? post.data.body
              : "",
            url: post.data.url,
            score: post.data.score,
            mediaMetadata: post.data.media_metadata
              ? post.data.media_metadata
              : [],
            thumbnail: post.data.thumbnail ? post.data.thumbnail : "",
            type: post.kind == "t3" ? "Post" : "Comment",
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

  // Calculate distinct subreddits and their counts, ordered by count descending
  const subredditCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    posts.forEach((post) => {
      counts[post.subreddit] = (counts[post.subreddit] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([subreddit, count]) => ({
        subreddit,
        count,
      }))
      .sort((a, b) => b.count - a.count); // Sort by count descending
  }, [posts]);

  // Calculate distinct types and their counts, ordered by count descending
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    posts.forEach((post) => {
      counts[post.type] = (counts[post.type] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([type, count]) => ({
        type,
        count,
      }))
      .sort((a, b) => b.count - a.count); // Sort by count descending
  }, [posts]);

  // Calculate distinct NSFW counts, categorized as "Only NSFW posts" or "Only non-NSFW posts", ordered by count descending. Send empty array if no posts are found.
  const nsfwCounts = useMemo(() => {
    if (posts.length === 0) {
      return [];
    }
    const counts: Record<string, number> = {
      "Only NSFW posts": 0,
      "Only non-NSFW posts": 0,
    };
    posts.forEach((post) => {
      const key = post.nsfw ? "Only NSFW posts" : "Only non-NSFW posts";
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([nsfw, count]) => ({
        nsfw,
        count,
      }))
      .sort((a, b) => b.count - a.count); // Sort by count descending
  }, [posts]);

  // Handle filter change from Filters component
  const handleFilterChange = (filters: SelectedFilters) => {
    setActiveFilters(filters);
  };

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
