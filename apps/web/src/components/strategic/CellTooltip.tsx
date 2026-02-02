/**
 * Cell Tooltip Component
 * 
 * Shows full content when hovering over truncated cells
 */

import { useState, useEffect, useRef } from 'react';

interface CellTooltipProps {
  content: string;
  children: React.ReactNode;
  delay?: number;
  showOnlyIfTruncated?: boolean;
}

export default function CellTooltip({ content, children, delay = 500, showOnlyIfTruncated = true }: CellTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isTruncated, setIsTruncated] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Check if content is truncated
    const checkTruncation = () => {
      if (containerRef.current && showOnlyIfTruncated) {
        const element = containerRef.current.querySelector('.truncate-check') || containerRef.current.firstChild;
        if (element instanceof HTMLElement) {
          const isOverflowing = element.scrollWidth > element.clientWidth || 
                               element.scrollHeight > element.clientHeight;
          setIsTruncated(isOverflowing);
        }
      } else {
        setIsTruncated(true); // Always show if not checking truncation
      }
    };
    
    checkTruncation();
    // Recheck on resize
    window.addEventListener('resize', checkTruncation);
    return () => window.removeEventListener('resize', checkTruncation);
  }, [content, showOnlyIfTruncated]);

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (!isTruncated && showOnlyIfTruncated) return;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setPosition({
          x: rect.left + rect.width / 2,
          y: rect.top - 8,
        });
        setShowTooltip(true);
      }
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setShowTooltip(false);
  };

  const colors = {
    bg: '#1F2937',
    text: '#F9FAFB',
    border: '#374151',
  };

  return (
    <>
      <div
        ref={containerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="w-full"
      >
        <div className="truncate-check w-full">
          {children}
        </div>
      </div>
      {showTooltip && (
        <div
          className="fixed z-50 px-2 py-1 rounded shadow-lg text-sm max-w-xs break-words"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            transform: 'translate(-50%, -100%)',
            backgroundColor: colors.bg,
            color: colors.text,
            border: `1px solid ${colors.border}`,
            pointerEvents: 'none',
            marginBottom: '4px',
          }}
        >
          {content}
          <div
            className="absolute left-1/2 top-full transform -translate-x-1/2"
            style={{
              width: 0,
              height: 0,
              borderLeft: '4px solid transparent',
              borderRight: '4px solid transparent',
              borderTop: `4px solid ${colors.bg}`,
            }}
          />
        </div>
      )}
    </>
  );
}
