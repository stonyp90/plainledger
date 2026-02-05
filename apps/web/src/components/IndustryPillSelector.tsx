/**
 * Industry Pill Selector Component
 * Unified component for industry selection with responsive inverted pyramid layout
 * Optimized for mobile, tablet, and desktop
 * Used in both Landing page Hero section and IndustryKPISection
 */

import { useState, useEffect } from 'react';
import { type LucideIcon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export interface IndustryOption {
  id: string;
  name: string;
  icon: LucideIcon;
}

interface IndustryPillSelectorProps {
  industries: IndustryOption[];
  selected: string | number;
  onSelect: (id: string | number) => void;
  isEn?: boolean;
}

export default function IndustryPillSelector({
  industries,
  selected,
  onSelect,
  isEn = true,
}: IndustryPillSelectorProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  // Detect screen size for responsive layout
  useEffect(() => {
    const checkSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 640); // sm breakpoint
      setIsTablet(width >= 640 && width < 1024); // sm to lg
    };
    
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  // Determine if selected is string ID or numeric index
  const getSelectedId = (): string => {
    if (typeof selected === 'number') {
      return industries[selected]?.id || industries[0]?.id || '';
    }
    return selected;
  };

  const selectedId = getSelectedId();

  // Responsive pyramid layout:
  // Mobile (<640px): 2-2-1 (more compact)
  // Tablet (640-1024px): 3-2 (balanced)
  // Desktop (>=1024px): 3-2 (spacious)
  const getLayout = () => {
    if (isMobile && industries.length === 5) {
      // Mobile: 2-2-1 layout
      return {
        firstRow: industries.slice(0, 2),
        secondRow: industries.slice(2, 4),
        thirdRow: industries.slice(4),
      };
    }
    // Tablet/Desktop: 3-2 layout
    return {
      firstRow: industries.slice(0, 3),
      secondRow: industries.slice(3),
      thirdRow: [],
    };
  };

  const { firstRow, secondRow, thirdRow } = getLayout();

  const renderButton = (industry: IndustryOption) => {
    const isActive =
      typeof selected === 'number'
        ? industries.indexOf(industry) === selected
        : industry.id === selectedId;
    const Icon = industry.icon;

    return (
      <button
        key={industry.id}
        onClick={() =>
          onSelect(typeof selected === 'number' ? industries.indexOf(industry) : industry.id)
        }
        className={`
          inline-flex items-center justify-center
          gap-1 sm:gap-1.5
          px-2.5 sm:px-3 md:px-3.5
          py-2 sm:py-1.5 md:py-2
          min-h-[36px] sm:min-h-[32px] md:min-h-[36px]
          rounded-lg md:rounded-xl
          text-[11px] sm:text-xs md:text-sm
          font-medium
          transition-all duration-200
          active:scale-[0.98] sm:active:scale-[0.99]
          touch-manipulation
          ${isActive ? 'shadow-lg scale-[1.02]' : 'hover:scale-[1.02] sm:hover:scale-[1.02]'}
        `}
        style={{
          backgroundColor: isActive
            ? `rgb(var(--color-accent-${isDark ? '500' : '600'}))`
            : isDark
              ? 'rgba(51, 65, 85, 0.5)'
              : 'rgba(241, 245, 249, 0.9)',
          color: isActive
            ? '#ffffff'
            : isDark
              ? 'rgb(203, 213, 225)'
              : 'rgb(71, 85, 105)',
          border: isActive
            ? 'none'
            : `1px solid ${isDark ? 'rgba(71, 85, 105, 0.3)' : 'rgba(203, 213, 225, 0.6)'}`,
          boxShadow: isActive
            ? `0 4px 14px rgba(var(--color-accent-500), 0.4)`
            : 'none',
        }}
      >
        <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-4 md:h-4 flex-shrink-0" />
        <span className="whitespace-nowrap">{industry.name}</span>
      </button>
    );
  };

  return (
    <div className="flex flex-col items-center gap-1.5 sm:gap-2 md:gap-2.5 w-full px-2 sm:px-0">
      {/* First row */}
      {firstRow.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 md:gap-2.5 w-full">
          {firstRow.map(renderButton)}
        </div>
      )}

      {/* Second row */}
      {secondRow.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 md:gap-2.5 w-full">
          {secondRow.map(renderButton)}
        </div>
      )}

      {/* Third row (mobile only for 5 items) */}
      {thirdRow.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 md:gap-2.5 w-full">
          {thirdRow.map(renderButton)}
        </div>
      )}
    </div>
  );
}
