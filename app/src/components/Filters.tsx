import React, { FC, useState } from "react";
import styles from "./Filters.module.scss"; // Assuming a CSS module file exists
import { Up } from "./icons/Up";
import { Down } from "./icons/Down";
import { Refresh } from "./icons/Refresh";
import { Tooltip } from "./ui/Tooltip";
import { useStore } from "../hooks/use-store";

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
  onFilterChange: (filters: SelectedFilters) => void; // Callback for when filters change
  totalPosts: number; // Total number of saved posts
  onRefresh: () => void; // Callback to refresh posts
  onToggleVisibility?: () => void; // Optional for backward compatibility
};

export const Filters: FC<FiltersProps> = ({
  subredditCounts,
  typeCounts,
  nsfwCounts,
  onFilterChange,
  totalPosts,
  onRefresh,
  onToggleVisibility,
}) => {
  const { toggleFiltersVisibility } = useStore();

  const [showCommunities, setShowCommunities] = useState(true);
  const [showTypes, setShowTypes] = useState(true);
  const [showNSFW, setShowNSFW] = useState(true);
  const [communitySearch, setCommunitySearch] = useState(""); // New state for search term

  // State to track selected filters
  const [selectedCommunities, setSelectedCommunities] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedNSFW, setSelectedNSFW] = useState<string | null>(null);

  // Handle community selection (multiple can be selected)
  const handleCommunityClick = (subreddit: string) => {
    setSelectedCommunities((prev) => {
      const newSelection = prev.includes(subreddit)
        ? prev.filter((item) => item !== subreddit) // Remove if already selected
        : [...prev, subreddit]; // Add if not selected

      // Update parent component with new filters
      onFilterChange({
        communities: newSelection,
        type: selectedType,
        nsfw: selectedNSFW,
      });

      return newSelection;
    });
  };

  // Handle type selection (only one can be selected)
  const handleTypeClick = (type: string) => {
    setSelectedType((prev) => {
      const newSelection = prev === type ? null : type; // Toggle selection

      // Update parent component with new filters
      onFilterChange({
        communities: selectedCommunities,
        type: newSelection,
        nsfw: selectedNSFW,
      });

      return newSelection;
    });
  };

  // Handle NSFW selection (only one can be selected)
  const handleNSFWClick = (nsfw: string) => {
    setSelectedNSFW((prev) => {
      const newSelection = prev === nsfw ? null : nsfw; // Toggle selection

      // Update parent component with new filters
      onFilterChange({
        communities: selectedCommunities,
        type: selectedType,
        nsfw: newSelection,
      });

      return newSelection;
    });
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
    setCommunitySearch(""); // Reset community search input

    // Update parent component that filters were cleared
    onFilterChange({
      communities: [],
      type: null,
      nsfw: null,
    });
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
