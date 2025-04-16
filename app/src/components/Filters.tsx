import React, { FC } from "react";
import styles from "./Filters.module.scss"; // Assuming a CSS module file exists

type SubredditCount = {
  subreddit: string;
  count: number;
};

type FiltersProps = {
  subredditCounts: SubredditCount[];
  typeCounts: { type: string; count: number }[];
};

export const Filters: FC<FiltersProps> = ({ subredditCounts, typeCounts }) => {
  return (
    <div className={styles.root}>
      <div>
        <div className={styles.headercomunities}>
          <p>Communities</p>
          {/* icon and hover effect and show/hide communities bases on variable */}
        </div>

        <input type="text" placeholder="Search communities" />
        {/* TODO implement filter */}
        {subredditCounts.map(({ subreddit, count }) => (
          <li key={subreddit}>
            {subreddit}: {count}
          </li>
        ))}
      </div>

      <h4>Types</h4>
      <ul>
        {typeCounts.map(({ type, count }) => (
          <li key={type}>
            {type}: {count}
          </li>
        ))}
      </ul>
    </div>
  );
};
