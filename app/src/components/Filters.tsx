import React, { FC, useState, useEffect } from "react";
import styles from "./Filters.module.scss";
import { Up } from "./icons/Up";
import { Down } from "./icons/Down";
import { Refresh } from "./icons/Refresh";
import { Tooltip } from "./ui/Tooltip";
import { useStore } from "../hooks/useStore";

type SubredditCount = {
  subreddit: string;
  count: number;
};

// Define the filter types that will be passed to parent component
export type SelectedFilters = {
  communities: string[];
  type: string | null;
  nsfw: string | null;
};

type FiltersProps = {
  subredditCounts: SubredditCount[];
  typeCounts: { type: string; count: number }[];
  nsfwCounts: { nsfw: string; count: number }[];
  onFilterChange: (filters: SelectedFilters) => void;
  totalPosts: number;
  onRefresh: () => void;
  onToggleVisibility?: () => void;
  currentFilters?: SelectedFilters;
};

export const Filters: FC<FiltersProps> = ({
  subredditCounts,
  typeCounts,
  nsfwCounts,
  onFilterChange,
  totalPosts,
  onRefresh,
  onToggleVisibility,
  currentFilters,
}) => {
  const { toggleFiltersVisibility } = useStore();

  const [showCommunities, setShowCommunities] = useState(true);
  const [showTypes, setShowTypes] = useState(true);
  const [showNSFW, setShowNSFW] = useState(true);
  const [communitySearch, setCommunitySearch] = useState("");

  // State to track selected filters
  const [selectedCommunities, setSelectedCommunities] = useState<string[]>(
    currentFilters?.communities || []
  );
  const [selectedType, setSelectedType] = useState<string | null>(
    currentFilters?.type || null
  );
  const [selectedNSFW, setSelectedNSFW] = useState<string | null>(
    currentFilters?.nsfw || null
  );
  // Update selected filters when currentFilters prop changes
  useEffect(() => {
    if (currentFilters) {
      setSelectedCommunities(currentFilters.communities);
      setSelectedType(currentFilters.type);
      setSelectedNSFW(currentFilters.nsfw);
    }
  }, [currentFilters]);

  // Update parent component whenever filters change
  useEffect(() => {
    onFilterChange({
      communities: selectedCommunities,
      type: selectedType,
      nsfw: selectedNSFW,
    });
  }, [selectedCommunities, selectedType, selectedNSFW, onFilterChange]);

  // Handle community selection (multiple can be selected)
  const handleCommunityClick = (subreddit: string) => {
    setSelectedCommunities((prev) => {
      if (prev.includes(subreddit)) {
        return prev.filter((item) => item !== subreddit);
      } else {
        return [...prev, subreddit];
      }
    });
  };

  // Handle type selection (only one can be selected)
  const handleTypeClick = (type: string) => {
    setSelectedType((prev) => (prev === type ? null : type));
  };

  // Handle NSFW selection (only one can be selected)
  const handleNSFWClick = (nsfw: string) => {
    setSelectedNSFW((prev) => (prev === nsfw ? null : nsfw));
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCommunitySearch(e.target.value);
  };

  // Filter communities based on search term and sort by count in descending order
  const filteredSubreddits = subredditCounts
    .filter(({ subreddit }) =>
      subreddit.toLowerCase().includes(communitySearch.toLowerCase())
    )
    .sort((a, b) => b.count - a.count);

  // Sort type counts by count in descending order
  const sortedTypeCounts = [...typeCounts].sort((a, b) => b.count - a.count);

  // Sort NSFW counts by count in descending order
  const sortedNSFWCounts = [...nsfwCounts].sort((a, b) => b.count - a.count);

  // Clear all filters
  const handleClearFilters = () => {
    setSelectedCommunities([]);
    setSelectedType(null);
    setSelectedNSFW(null);
    setCommunitySearch("");
  };

  // Use the callback from props if provided, otherwise use the one from the store
  const handleToggleVisibility = () => {
    if (onToggleVisibility) {
      onToggleVisibility();
    } else {
      toggleFiltersVisibility();
    }
  };

  return (
    <div className={styles.root}>
      <div className={styles.totalPosts}>
        <div className={styles.totalPostsInfo}>
          <span className={styles.totalPostsCount}>{totalPosts}</span>
          <span className={styles.totalPostsLabel}>saved posts</span>
        </div>
        <Tooltip text="Refresh saved posts" position="left">
          <button
            className="btn-icon"
            onClick={onRefresh}
            aria-label="Refresh saved posts"
          >
            <div className={styles.refreshIcon}>
              <Refresh />
            </div>
          </button>
        </Tooltip>
      </div>

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
            <input
              type="text"
              placeholder="Search communities"
              value={communitySearch}
              onChange={handleSearchChange}
            />

            {filteredSubreddits.map(({ subreddit, count }) => (
              <div
                className={styles.item}
                key={subreddit}
                onClick={() => handleCommunityClick(subreddit)}
                style={{
                  backgroundColor: selectedCommunities.includes(subreddit)
                    ? "var(--btn-hover-color)"
                    : undefined,
                }}
              >
                <h4>r/{subreddit}</h4>
                <p>{count}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <hr
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
            {sortedTypeCounts.map(({ type, count }) => (
              <div
                className={styles.item}
                key={type}
                onClick={() => handleTypeClick(type)}
                style={{
                  backgroundColor:
                    selectedType === type
                      ? "var(--btn-hover-color)"
                      : undefined,
                }}
              >
                <h4>{type}</h4>
                <p>{count}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <hr
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
            {sortedNSFWCounts.map(({ nsfw, count }) => (
              <div
                className={styles.item}
                key={nsfw}
                onClick={() => handleNSFWClick(nsfw)}
                style={{
                  backgroundColor:
                    selectedNSFW === nsfw
                      ? "var(--btn-hover-color)"
                      : undefined,
                }}
              >
                <h4>{nsfw}</h4>
                <p>{count}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className={styles.actionButtons}>
        <button className={styles.clearFilters} onClick={handleClearFilters}>
          Clear filters
        </button>
        <button className={styles.hideButton} onClick={handleToggleVisibility}>
          Hide filters
        </button>
      </div>
    </div>
  );
};
