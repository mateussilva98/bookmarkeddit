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
  nsfwCounts: { nsfw: string; count: number }[]; // Add nsfwCounts to the props
};

export const Filters: FC<FiltersProps> = ({
  subredditCounts,
  typeCounts,
  nsfwCounts,
}) => {
  const [showCommunities, setShowCommunities] = useState(true);
  const [showTypes, setShowTypes] = useState(true);
  const [showNSFW, setShowNSFW] = useState(true);

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
          <div
            className={`${styles.itemContainer} ${
              showCommunities ? styles.fadeIn : styles.fadeOut
            }`}
          >
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

      <hr
        /* not sure why do i need this */
        style={{
          margin: "10px 0",
          border: "1px solid var(--border-color)!important",
        }}
      />

      <div>
        <div className={styles.header} onClick={() => setShowTypes(!showTypes)}>
          <p>Type</p>
          {showTypes ? <Up /> : <Down />}
        </div>

        {showTypes && (
          <div
            className={`${styles.itemContainer} ${
              showTypes ? styles.fadeIn : styles.fadeOut
            }`}
          >
            {typeCounts.map(({ type, count }) => (
              <div className={styles.item} key={type}>
                <h4>{type}</h4>
                <p>{count}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <hr
        /* not sure why do i need this */
        style={{
          margin: "10px 0",
          border: "1px solid var(--border-color)!important",
        }}
      />

      <div>
        <div className={styles.header} onClick={() => setShowNSFW(!showNSFW)}>
          <p>NSFW</p>
          {showNSFW ? <Up /> : <Down />}
        </div>

        {showNSFW && (
          <div
            className={`${styles.itemContainer} ${
              showNSFW ? styles.fadeIn : styles.fadeOut
            }`}
          >
            {nsfwCounts.map(({ nsfw, count }) => (
              <div className={styles.item} key={nsfw}>
                <h4>{nsfw}</h4>
                <p>{count}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <button className={styles.clearFilters}>Clear filters</button>
    </div>
  );
};
