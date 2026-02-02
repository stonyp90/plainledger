/**
 * Dynamic Dashboard Layout Component
 * 
 * Renders dashboard sections in an adaptive grid that automatically adjusts
 * to available content without showing white space or empty placeholders.
 * Supports custom ordering when customOrder is provided.
 */

import { ReactNode } from 'react';

export interface DashboardSection {
  id: string;
  component: ReactNode;
  priority: number; // Lower numbers render first (used as fallback)
  gridSpan?: 'full' | 'half' | 'third' | 'two-thirds';
}

interface DynamicDashboardLayoutProps {
  sections: DashboardSection[];
  className?: string;
  customOrder?: string[]; // Array of section IDs in desired order
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
  className = '',
  customOrder,
}: DynamicDashboardLayoutProps) {
  // Filter out null/empty sections
  let availableSections = sections.filter(
    section => section.component !== null && section.component !== undefined
  );

  // Sort by custom order if provided, otherwise by priority
  if (customOrder && customOrder.length > 0) {
    const orderMap = new Map(customOrder.map((id, index) => [id, index]));
    availableSections.sort((a, b) => {
      const aIndex = orderMap.get(a.id) ?? a.priority;
      const bIndex = orderMap.get(b.id) ?? b.priority;
      return aIndex - bIndex;
    });
  } else {
    availableSections.sort((a, b) => a.priority - b.priority);
  }

  // If no sections, return null (parent handles empty state)
  if (availableSections.length === 0) {
    return null;
  }

  return (
    <div 
      className={`grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-3 lg:gap-4 auto-rows-min ${className}`}
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
