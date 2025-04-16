import { FC, useEffect } from "react";
import { Header } from "./Header";
import { useStore } from "../hooks/use-store";

export const Posts: FC = () => {
  const { store } = useStore(); // Access token from the store

  useEffect(() => {
    const accessToken = store.access_token;

    const fetchSavedPosts = async () => {
      try {
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
        console.log("Fetched saved posts:", data); // Handle the fetched posts as needed
      } catch (error) {
        console.error("Error fetching saved posts:", error);
      }
    };

    fetchSavedPosts();
  }, [store.access_token]); // Re-run effect if token changes

  return (
    <>
      <Header />
      <div>POSTS</div>
    </>
  );
};
