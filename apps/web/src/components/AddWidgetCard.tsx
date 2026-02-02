/**
 * Add Widget Card Component
 * 
 * Displays a card that allows users to add custom widgets to the dashboard.
 * Opens Chart Gallery modal when clicked.
 */

import { Plus } from 'lucide-react';
import { useI18n } from '../lib/i18n';

interface AddWidgetCardProps {
  onClick: () => void;
  className?: string;
}

export default function AddWidgetCard({ onClick, className = '' }: AddWidgetCardProps) {
  const { language } = useI18n();
  const isEn = language === 'en';

  return (
    <button
      onClick={onClick}
      className={`
        w-full rounded-lg sm:rounded-xl p-4 sm:p-6
        border-2 border-dashed transition-all
        hover:border-solid hover:shadow-md
        flex flex-col items-center justify-center gap-3
        group
        ${className}
      `}
      style={{
        backgroundColor: 'rgb(var(--color-surface))',
        borderColor: 'rgb(var(--color-border))',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgb(var(--color-primary-500))';
        e.currentTarget.style.backgroundColor = 'rgb(var(--color-primary-500) / 0.02)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgb(var(--color-border))';
        e.currentTarget.style.backgroundColor = 'rgb(var(--color-surface))';
      }}
    >
      <div
        className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
        style={{
          backgroundColor: 'rgb(var(--color-primary-500) / 0.1)',
        }}
      >
        <Plus
          className="w-6 h-6 sm:w-7 sm:h-7 transition-colors"
          style={{ color: 'rgb(var(--color-primary-500))' }}
        />
      </div>
      <div className="text-center">
        <p
          className="text-sm sm:text-base font-semibold mb-1"
          style={{ color: 'rgb(var(--color-text))' }}
        >
          {isEn ? 'Add Widget' : 'Ajouter un widget'}
        </p>
        <p
          className="text-xs sm:text-sm"
          style={{ color: 'rgb(var(--color-text-muted))' }}
        >
          {isEn
            ? 'Choose a chart to add to your dashboard'
            : 'Choisissez un graphique à ajouter à votre tableau de bord'}
        </p>
      </div>
    </button>
  );
}