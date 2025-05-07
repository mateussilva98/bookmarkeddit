export interface RedditUserResponse {
  name: string;
  id: string;
  icon_img?: string;
  [key: string]: any; // Allow for other properties
}

export interface RedditApiResponse {
  kind: string;
  data: {
    after: string | null;
    before: string | null;
    children: any[];
    dist: number;
    modhash: string;
  };
}
