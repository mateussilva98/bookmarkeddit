export type Post = {
  id: string;
  subreddit: string;
  author: string;
  createdAt: number;
  title: string;
  description?: string;
  url: string;
  score: number;
  mediaMetadata?: Array<{ [key: string]: any }>;
  thumbnail?: string;
  type: string;
  nsfw: boolean;
  commentCount: number;
};
