import { FC } from "react";
import { Filters, SelectedFilters } from "./Filters";
import styles from "./MobileFilters.module.scss";
import { X } from "./icons/X";

type MobileFiltersProps = {
  isVisible: boolean;
  onClose: () => void;
  subredditCounts: { subreddit: string; count: number }[];
  typeCounts: { type: string; count: number }[];
  nsfwCounts: { nsfw: string; count: number }[];
  onFilterChange: (filters: SelectedFilters) => void;
  totalPosts: number;
  onRefresh: () => void;
  currentFilters?: SelectedFilters;
};

/**
 * MobileFilters component
 * Wrapper for the Filters component that provides mobile-specific UI
 * Handles the sliding sidebar and backdrop overlay
 */
export const MobileFilters: FC<MobileFiltersProps> = ({
  isVisible,
  onClose,
  subredditCounts,
  typeCounts,
  nsfwCounts,
  onFilterChange,
  totalPosts,
  onRefresh,
  currentFilters,
}) => {
  return (
    <div
      className={`${styles.mobileFilterContainer} ${
        isVisible ? styles.visible : ""
      }`}
    >
      {" "}
      {/* Backdrop overlay */}
      <div
        className={styles.mobileFilterBackdrop}
        onClick={onClose}
        aria-hidden="true"
      >
        {" "}
        <button
          className={`btn-icon ${styles.closeButton}`}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label="Close filters"
        >
          <X />
        </button>
      </div>
      {/* Sliding sidebar */}
      <div className={styles.mobileFilterSidebar}>
        <div className={styles.mobileFilterContent}>
          <Filters
            subredditCounts={subredditCounts}
            typeCounts={typeCounts}
            nsfwCounts={nsfwCounts}
            onFilterChange={onFilterChange}
            totalPosts={totalPosts}
            onRefresh={onRefresh}
            onToggleVisibility={onClose}
            currentFilters={currentFilters}
            isMobileVisible={true}
          />
        </div>
      </div>
    </div>
  );
};
