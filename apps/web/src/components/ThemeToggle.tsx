import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface ThemeToggleProps {
  showLabel?: boolean;
  variant?: 'icon' | 'dropdown';
}

export default function ThemeToggle({ showLabel = false, variant = 'icon' }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();

  if (variant === 'icon') {
    return (
      <button
        onClick={toggleTheme}
        className="icon-btn"
        aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
      >
        {resolvedTheme === 'dark' ? (
          <Sun className="w-5 h-5" />
        ) : (
          <Moon className="w-5 h-5" />
        )}
        {showLabel && (
          <span className="ml-2 text-sm">
            {resolvedTheme === 'dark' ? 'Mode clair' : 'Mode sombre'}
          </span>
        )}
      </button>
    );
  }

  // Dropdown variant for settings
  return (
    <div className="flex gap-2">
      <ThemeButton
        active={theme === 'light'}
        onClick={() => setTheme('light')}
        icon={<Sun className="w-4 h-4" />}
        label="Clair"
      />
      <ThemeButton
        active={theme === 'dark'}
        onClick={() => setTheme('dark')}
        icon={<Moon className="w-4 h-4" />}
        label="Sombre"
      />
    </div>
  );
}

interface ThemeButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function ThemeButton({ active, onClick, icon, label }: ThemeButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        active
          ? 'bg-[rgb(var(--color-primary-800))] text-white dark:bg-[rgb(var(--color-primary-200))] dark:text-[rgb(var(--color-text-inverted))]'
          : 'border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-secondary))] hover:border-[rgb(var(--color-border-strong))]'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
