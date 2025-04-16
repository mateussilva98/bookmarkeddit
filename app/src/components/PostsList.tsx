import { FC } from "react";
import { Post } from "../types/Post";
import { PostComponent } from "./Post";
import styles from "./PostsList.module.scss"; // Assuming a CSS module file exists

interface PostsListProps {
  posts: Post[];
}

export const PostsList: FC<PostsListProps> = ({ posts }) => {
  return (
    <div className={styles.root}>
      {posts.map((post) => (
        <>
          <hr />
          <PostComponent key={post.id} post={post} />
        </>
      ))}
    </div>
  );
};
