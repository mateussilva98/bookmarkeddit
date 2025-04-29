export type MediaMetadata = {
  status: string;
  e: string;
  m: string;
  p: Array<{
    y: number;
    x: number;
    u?: string;
  }>;
  s?: {
    y: number;
    x: number;
    u?: string;
  };
};

export type Post = {
  id: string;
  subreddit: string;
  author: string;
  createdAt: number;
  title: string;
  description?: string;
  url: string;
  score: number;
  media_metadata?: { [key: string]: MediaMetadata };
  thumbnail?: string;
  type: string;
  nsfw: boolean;
  commentCount: number;
};
