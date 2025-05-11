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

export type VideoInfo = {
  url: string;
  width?: number;
  height?: number;
  fallbackUrl?: string;
  dashUrl?: string;
  hlsUrl?: string;
  isGif?: boolean;
  duration?: number;
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
  images?: string[]; // Array to store multiple image URLs
  video?: VideoInfo; // Information for video content
  type: string;
  nsfw: boolean;
  commentCount: number;
  fullname: string;
};
