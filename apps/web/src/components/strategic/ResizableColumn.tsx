/**
 * Resizable Column Header Component
 * 
 * Column header with resize handle
 */

import { useState, useRef, useEffect } from 'react';

interface ResizableColumnProps {
  width: number;
  minWidth?: number;
  maxWidth?: number;
  onResize: (newWidth: number) => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export default function ResizableColumn({
  width,
  minWidth = 80,
  maxWidth = 500,
  onResize,
  children,
  style,
}: ResizableColumnProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [currentWidth, setCurrentWidth] = useState(width);
  const headerRef = useRef<HTMLTableCellElement>(null);

  useEffect(() => {
    setCurrentWidth(width);
  }, [width]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!headerRef.current) return;
      const rect = headerRef.current.getBoundingClientRect();
      const newWidth = e.clientX - rect.left;
      const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      setCurrentWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      onResize(currentWidth);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, currentWidth, minWidth, maxWidth, onResize]);

  const colors = {
    border: {
      default: '#E5E7EB',
      hover: '#3B82F6',
    },
  };

  return (
    <th
      ref={headerRef}
      style={{
        ...style,
        width: `${currentWidth}px`,
        minWidth: `${currentWidth}px`,
        maxWidth: `${currentWidth}px`,
        position: 'relative',
      }}
    >
      {children}
      <div
        className="absolute top-0 right-0 w-1 h-full cursor-col-resize z-10"
        style={{
          backgroundColor: isResizing ? colors.border.hover : 'transparent',
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsResizing(true);
        }}
        onMouseEnter={(e) => {
          if (!isResizing) {
            e.currentTarget.style.backgroundColor = colors.border.hover;
            e.currentTarget.style.opacity = '0.5';
          }
        }}
        onMouseLeave={(e) => {
          if (!isResizing) {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.opacity = '1';
          }
        }}
      />
    </th>
  );
}
