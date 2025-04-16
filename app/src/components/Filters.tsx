import React, { FC, useState } from "react";
import styles from "./Filters.module.scss"; // Assuming a CSS module file exists
import { Up } from "./icons/Up";
import { Down } from "./icons/Down";

type SubredditCount = {
  subreddit: string;
  count: number;
};

type FiltersProps = {
  subredditCounts: SubredditCount[];
  typeCounts: { type: string; count: number }[];
};

export const Filters: FC<FiltersProps> = ({ subredditCounts, typeCounts }) => {
  const [showCommunities, setShowCommunities] = useState(true);
  const [showTypes, setShowTypes] = useState(true);

  return (
    <div className={styles.root}>
      <div>
        <div
          className={styles.header}
          onClick={() => setShowCommunities(!showCommunities)}
        >
          <p>Communities</p>
          {showCommunities ? <Up /> : <Down />}
        </div>

        {showCommunities && (
          <div>
            <input type="text" placeholder="Search communities" />
            {/* TODO implement filter */}

            {subredditCounts.map(({ subreddit, count }) => (
              <div className={styles.item} key={subreddit}>
                <h4>r/{subreddit}</h4>
                <p>{count}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <hr />

      <div>
        <div className={styles.header} onClick={() => setShowTypes(!showTypes)}>
          <p>Type</p>
          {showTypes ? <Up /> : <Down />}
        </div>

        {showTypes && (
          <div>
            {typeCounts.map(({ type, count }) => (
              <div className={styles.item} key={type}>
                <h4>{type}</h4>
                <p>{count}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
