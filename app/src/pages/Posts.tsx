import { FC, useEffect, useState, useMemo } from "react";
import { useStore } from "../hooks/use-store";
import { Header } from "../components/Header";
import { Post } from "../types/Post";
import { Filters } from "../components/Filters";
import { PostsList } from "../components/PostsList";
import styles from "./Posts.module.scss";

export const Posts: FC = () => {
  const { store } = useStore(); // Access token from the store

  // TODO : add loading state to show a spinner or loading message
  const [loading, setLoading] = useState<boolean>(true); // Loading state to manage UI during fetch
  const [posts, setPosts] = useState<Post[]>([]); // State to hold fetched posts

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

  // Calculate distinct subreddits and their counts
  const subredditCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    posts.forEach((post) => {
      counts[post.subreddit] = (counts[post.subreddit] || 0) + 1;
    });
    return Object.entries(counts).map(([subreddit, count]) => ({
      subreddit,
      count,
    }));
  }, [posts]);

  // Calculate distinct types and their counts
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    posts.forEach((post) => {
      counts[post.type] = (counts[post.type] || 0) + 1;
    });
    return Object.entries(counts).map(([type, count]) => ({
      type,
      count,
    }));
  }, [posts]);

  return (
    <>
      <Header />
      <main className={styles.root}>
        <div className={styles.filters}>
          <Filters subredditCounts={subredditCounts} typeCounts={typeCounts} />
        </div>
        <div className={styles.postsList}>
          {/* TODO: send filtered posts */}
          <PostsList posts={posts} />
        </div>
      </main>
    </>
  );
};
