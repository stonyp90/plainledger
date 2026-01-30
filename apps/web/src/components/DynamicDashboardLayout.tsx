/**
 * Dynamic Dashboard Layout Component
 * 
 * Renders dashboard sections in an adaptive grid that automatically adjusts
 * to available content without showing white space or empty placeholders.
 */

import { ReactNode } from 'react';

export interface DashboardSection {
  id: string;
  component: ReactNode;
  priority: number; // Lower numbers render first
  gridSpan?: 'full' | 'half' | 'third' | 'two-thirds';
}

interface DynamicDashboardLayoutProps {
  sections: DashboardSection[];
  className?: string;
}

/**
 * Get CSS grid class based on span preference
 */
function getGridClass(gridSpan?: DashboardSection['gridSpan']): string {
  switch (gridSpan) {
    case 'full':
      return 'col-span-1 lg:col-span-2 xl:col-span-3';
    case 'two-thirds':
      return 'col-span-1 lg:col-span-2';
    case 'half':
      return 'col-span-1 lg:col-span-1';
    case 'third':
      return 'col-span-1 lg:col-span-1 xl:col-span-1';
    default:
      return 'col-span-1 lg:col-span-1';
  }
}

export default function DynamicDashboardLayout({ 
  sections, 
  className = '' 
}: DynamicDashboardLayoutProps) {
  // Filter out null/empty sections and sort by priority
  const availableSections = sections
    .filter(section => section.component !== null && section.component !== undefined)
    .sort((a, b) => a.priority - b.priority);

  // If no sections, return null (parent handles empty state)
  if (availableSections.length === 0) {
    return null;
  }

  return (
    <div 
      className={`grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 auto-rows-min ${className}`}
    >
      {availableSections.map(section => (
        <div 
          key={section.id}
          className={getGridClass(section.gridSpan)}
        >
          {section.component}
        </div>
      ))}
    </div>
  );
}
