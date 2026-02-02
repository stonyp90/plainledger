/**
 * DrillDownBreadcrumbs Component
 * 
 * Displays breadcrumb navigation for drill-down state.
 * Allows users to navigate back up the hierarchy.
 */

import { ChevronRight, Home } from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { DrillState } from '../../hooks/useDrillDown';

interface DrillDownBreadcrumbsProps {
  drillState: DrillState | null;
  onDrillUp: (level: number) => void;
  onReset: () => void;
}

export function DrillDownBreadcrumbs({
  drillState,
  onDrillUp,
  onReset,
}: DrillDownBreadcrumbsProps) {
  const { language } = useI18n();
  const isEn = language === 'en';

  if (!drillState || drillState.path.length === 0) {
    return null;
  }

  return (
    <div
      className="flex items-center gap-2 px-4 py-2 rounded-lg"
      style={{ backgroundColor: 'rgb(var(--color-surface))' }}
    >
      <button
        onClick={onReset}
        className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-800 transition-colors"
        style={{ color: 'rgb(var(--color-text-muted))' }}
        title={isEn ? 'Reset drill-down' : 'Réinitialiser le drill-down'}
      >
        <Home className="w-4 h-4" />
        <span className="text-sm">{isEn ? 'All' : 'Tout'}</span>
      </button>

      {drillState.path.map((label, index) => (
        <div key={index} className="flex items-center gap-2">
          <ChevronRight className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
          <button
            onClick={() => onDrillUp(index)}
            className={`px-2 py-1 rounded text-sm transition-colors ${
              index === drillState.path.length - 1
                ? 'font-semibold'
                : 'hover:bg-gray-800'
            }`}
            style={{
              color:
                index === drillState.path.length - 1
                  ? 'rgb(var(--color-primary-500))'
                  : 'rgb(var(--color-text))',
            }}
          >
            {label}
          </button>
        </div>
      ))}
    </div>
  );
}

export default DrillDownBreadcrumbs;
