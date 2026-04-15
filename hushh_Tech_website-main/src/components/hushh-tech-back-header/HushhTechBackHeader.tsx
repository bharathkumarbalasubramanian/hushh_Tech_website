/**
 * HushhTechBackHeader — Reusable sticky header with back button
 * Left: square back arrow button.
 * Right: configurable — "label" (e.g. FAQs) OR "hamburger" (black ≡ opens nav drawer).
 *
 * Usage:
 *   <HushhTechBackHeader onBackClick={() => navigate(-1)} rightLabel="FAQs" />
 *   <HushhTechBackHeader onBackClick={() => navigate(-1)} rightType="hamburger" />
 *   <HushhTechBackHeader onBackClick={() => navigate(-1)} showRightButton={false} />
 */
import React, { useState } from "react";
import HushhTechNavDrawer from "../hushh-tech-nav-drawer/HushhTechNavDrawer";
import HushhTechFaqSheet from "../hushh-tech-faq-sheet/HushhTechFaqSheet";

interface HushhTechBackHeaderProps {
  /** Callback when back arrow is clicked */
  onBackClick?: () => void;
  /** Right button type: "label" shows text, "hamburger" shows ≡ icon */
  rightType?: "label" | "hamburger";
  /** Label for the right-side button (only used when rightType="label") */
  rightLabel?: string;
  /** Callback when right button is clicked (only used when rightType="label") */
  onRightClick?: () => void;
  /** Whether to show the right button (default: true) */
  showRightButton?: boolean;
  /** Extra classes on the root container */
  className?: string;
}

const HushhTechBackHeader: React.FC<HushhTechBackHeaderProps> = ({
  onBackClick,
  rightType = "label",
  rightLabel = "FAQs",
  onRightClick,
  showRightButton = true,
  className = "",
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isFaqOpen, setIsFaqOpen] = useState(false);

  return (
    <>
      <header
        className={`px-6 py-6 flex justify-between items-center sticky top-0 bg-white/95 backdrop-blur-md z-40 max-w-5xl mx-auto w-full ${className}`}
      >
        {/* Back button */}
        <button
          onClick={onBackClick}
          className="w-10 h-10 border border-black flex items-center justify-center hover:bg-gray-50 transition-colors"
          aria-label="Go back"
          tabIndex={0}
        >
          <span className="material-symbols-outlined text-gray-900 text-[20px] font-light">
            west
          </span>
        </button>

        {/* Right action button */}
        {showRightButton && rightType === "hamburger" && (
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="w-10 h-10 rounded-full bg-black flex items-center justify-center hover:bg-black/80 transition-colors"
            aria-label="Open menu"
            tabIndex={0}
          >
            <span className="material-symbols-outlined text-white !text-[1.2rem]">
              menu
            </span>
          </button>
        )}

        {showRightButton && rightType === "label" && (
          <button
            onClick={onRightClick ?? (rightLabel?.toLowerCase() === "faqs" ? () => setIsFaqOpen(true) : undefined)}
            className="h-10 px-5 border border-black text-[11px] font-bold tracking-widest uppercase text-gray-900 hover:bg-black hover:text-white transition-colors flex items-center justify-center"
            aria-label={rightLabel}
            tabIndex={0}
          >
            {rightLabel}
          </button>
        )}
      </header>

      {/* Nav Drawer — only rendered when hamburger type */}
      {rightType === "hamburger" && (
        <HushhTechNavDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
        />
      )}

      {/* FAQ Bottom Sheet — auto-wired when rightLabel is "FAQs" */}
      <HushhTechFaqSheet
        isOpen={isFaqOpen}
        onClose={() => setIsFaqOpen(false)}
      />
    </>
  );
};

export default HushhTechBackHeader;
