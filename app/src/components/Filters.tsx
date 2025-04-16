import React, { FC } from "react";
import styles from "./Filters.module.scss"; // Assuming a CSS module file exists

type SubredditCount = {
  subreddit: string;
  count: number;
};

type FiltersProps = {
  subredditCounts: SubredditCount[];
  typeCounts: { type: string; count: number }[]; // New property
};

export const Filters: FC<FiltersProps> = ({ subredditCounts, typeCounts }) => {
  return (
    <div className={styles.root}>
      <h3>Filters</h3>
      <ul>
        {subredditCounts.map(({ subreddit, count }) => (
          <li key={subreddit}>
            {subreddit}: {count}
          </li>
        ))}
      </ul>
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
