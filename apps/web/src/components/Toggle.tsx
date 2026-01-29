import { useId } from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'danger';
  labelPosition?: 'left' | 'right';
  showLabels?: boolean; // Show ON/OFF labels inside toggle
  className?: string;
}

export default function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = 'md',
  variant = 'default',
  labelPosition = 'right',
  showLabels = false,
  className = '',
}: ToggleProps) {
  const id = useId();

  // Size configurations
  const sizes = {
    sm: {
      track: 'w-8 h-4',
      thumb: 'w-3 h-3',
      translate: 'translate-x-4',
      padding: 'p-0.5',
    },
    md: {
      track: 'w-11 h-6',
      thumb: 'w-5 h-5',
      translate: 'translate-x-5',
      padding: 'p-0.5',
    },
    lg: {
      track: 'w-14 h-7',
      thumb: 'w-6 h-6',
      translate: 'translate-x-7',
      padding: 'p-0.5',
    },
  };

  // Variant colors (when checked)
  const variants = {
    default: 'rgb(var(--color-primary-500))',
    success: 'rgb(var(--color-success))',
    warning: 'rgb(var(--color-warning))',
    danger: 'rgb(var(--color-error))',
  };

  const config = sizes[size];
  const activeColor = variants[variant];

  const toggle = (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`
        relative inline-flex items-center shrink-0 cursor-pointer rounded-full
        transition-all duration-200 ease-in-out
        focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
        focus-visible:ring-[rgb(var(--color-primary-500))]
        ${config.track} ${config.padding}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}
        ${className}
      `}
      style={{
        backgroundColor: checked ? activeColor : 'rgb(var(--color-bg-muted))',
        boxShadow: checked 
          ? `0 0 0 1px ${activeColor}, inset 0 1px 2px rgba(0,0,0,0.1)`
          : 'inset 0 1px 3px rgba(0,0,0,0.1), 0 0 0 1px rgb(var(--color-border))',
      }}
    >
      {/* ON/OFF Labels inside track */}
      {showLabels && size !== 'sm' && (
        <>
          <span 
            className={`absolute left-1.5 text-[9px] font-bold uppercase transition-opacity ${
              checked ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ color: 'white' }}
          >
            ON
          </span>
          <span 
            className={`absolute right-1 text-[9px] font-bold uppercase transition-opacity ${
              checked ? 'opacity-0' : 'opacity-100'
            }`}
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            OFF
          </span>
        </>
      )}
      
      {/* Thumb */}
      <span
        className={`
          pointer-events-none inline-block rounded-full bg-white shadow-lg
          transform transition-transform duration-200 ease-in-out
          ${config.thumb}
          ${checked ? config.translate : 'translate-x-0'}
        `}
        style={{
          boxShadow: '0 1px 3px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.1)',
        }}
      >
        {/* Inner highlight */}
        <span 
          className="absolute inset-0 rounded-full"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 100%)',
          }}
        />
      </span>
    </button>
  );

  // If no label, return just the toggle
  if (!label && !description) {
    return toggle;
  }

  // With label
  return (
    <label 
      htmlFor={id}
      className={`
        flex items-center gap-3 cursor-pointer
        ${disabled ? 'cursor-not-allowed' : ''}
        ${labelPosition === 'left' ? 'flex-row-reverse justify-end' : ''}
      `}
    >
      {toggle}
      <div className="flex flex-col">
        {label && (
          <span 
            className="text-sm font-medium"
            style={{ color: disabled ? 'rgb(var(--color-text-muted))' : 'rgb(var(--color-text))' }}
          >
            {label}
          </span>
        )}
        {description && (
          <span 
            className="text-xs"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            {description}
          </span>
        )}
      </div>
    </label>
  );
}

// Compact inline toggle for use in forms
interface InlineToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  leftLabel?: string;
  rightLabel?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export function InlineToggle({
  checked,
  onChange,
  leftLabel,
  rightLabel,
  disabled = false,
  size = 'md',
}: InlineToggleProps) {
  return (
    <div className="flex items-center gap-2">
      {leftLabel && (
        <span 
          className={`text-sm transition-colors ${!checked ? 'font-medium' : ''}`}
          style={{ color: !checked ? 'rgb(var(--color-text))' : 'rgb(var(--color-text-muted))' }}
        >
          {leftLabel}
        </span>
      )}
      <Toggle 
        checked={checked} 
        onChange={onChange} 
        disabled={disabled} 
        size={size}
      />
      {rightLabel && (
        <span 
          className={`text-sm transition-colors ${checked ? 'font-medium' : ''}`}
          style={{ color: checked ? 'rgb(var(--color-text))' : 'rgb(var(--color-text-muted))' }}
        >
          {rightLabel}
        </span>
      )}
    </div>
  );
}

// Toggle group for selecting between options
interface ToggleGroupOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string;
  disabled?: boolean;
}

interface ToggleGroupProps {
  options: ToggleGroupOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export function ToggleGroup({
  options,
  value,
  onChange,
  disabled = false,
  size = 'md',
  fullWidth = false,
}: ToggleGroupProps) {
  const sizes = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  return (
    <div 
      className={`inline-flex rounded-xl p-1 ${fullWidth ? 'w-full' : ''}`}
      style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
      role="radiogroup"
    >
      {options.map((option) => {
        const isSelected = value === option.value;
        const isOptionDisabled = disabled || option.disabled;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={isOptionDisabled}
            onClick={() => !isOptionDisabled && onChange(option.value)}
            className={`
              flex items-center justify-center gap-1.5 rounded-lg font-medium
              transition-all duration-200 ease-in-out
              ${sizes[size]}
              ${fullWidth ? 'flex-1' : ''}
              ${isOptionDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              ${isSelected 
                ? 'shadow-sm' 
                : isOptionDisabled ? '' : 'hover:bg-white/50 dark:hover:bg-white/10'
              }
            `}
            style={{
              backgroundColor: isSelected ? 'rgb(var(--color-surface))' : 'transparent',
              color: isSelected ? 'rgb(var(--color-text))' : 'rgb(var(--color-text-muted))',
              boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.1)' : undefined,
            }}
          >
            {option.icon}
            {option.label}
            {option.badge && (
              <span 
                className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-semibold"
                style={{ 
                  backgroundColor: 'rgb(var(--color-primary-500))',
                  color: 'white',
                }}
              >
                {option.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
