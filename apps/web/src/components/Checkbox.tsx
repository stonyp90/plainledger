import { useId } from 'react';
import { Check, Minus } from 'lucide-react';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  description?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'danger';
  indeterminate?: boolean;
  error?: boolean;
  className?: string;
  id?: string;
}

export default function Checkbox({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = 'md',
  variant = 'default',
  indeterminate = false,
  error = false,
  className = '',
  id: providedId,
}: CheckboxProps) {
  const generatedId = useId();
  const id = providedId || generatedId;

  // Size configurations
  const sizes = {
    sm: {
      box: 'w-4 h-4',
      icon: 'w-3 h-3',
      rounded: 'rounded',
      labelText: 'text-sm',
      descText: 'text-xs',
    },
    md: {
      box: 'w-5 h-5',
      icon: 'w-3.5 h-3.5',
      rounded: 'rounded-md',
      labelText: 'text-sm',
      descText: 'text-xs',
    },
    lg: {
      box: 'w-6 h-6',
      icon: 'w-4 h-4',
      rounded: 'rounded-md',
      labelText: 'text-base',
      descText: 'text-sm',
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
  const activeColor = error ? 'rgb(var(--color-error))' : variants[variant];
  const isCheckedOrIndeterminate = checked || indeterminate;

  const checkbox = (
    <button
      type="button"
      role="checkbox"
      id={id}
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={typeof label === 'string' ? label : undefined}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`
        relative inline-flex items-center justify-center shrink-0
        transition-all duration-200 ease-out
        focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
        focus-visible:ring-[rgb(var(--color-primary-500))]
        ${config.box} ${config.rounded}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      style={{
        backgroundColor: isCheckedOrIndeterminate ? activeColor : 'transparent',
        border: isCheckedOrIndeterminate 
          ? `2px solid ${activeColor}` 
          : `2px solid ${error ? 'rgb(var(--color-error))' : 'rgb(var(--color-border))'}`,
        boxShadow: isCheckedOrIndeterminate 
          ? `0 1px 2px rgba(0,0,0,0.1)`
          : 'none',
      }}
    >
      {/* Check icon with animation */}
      <span
        className={`
          transform transition-all duration-200 ease-out
          ${isCheckedOrIndeterminate ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}
        `}
      >
        {indeterminate ? (
          <Minus className={config.icon} style={{ color: 'white' }} strokeWidth={3} />
        ) : (
          <Check className={config.icon} style={{ color: 'white' }} strokeWidth={3} />
        )}
      </span>

      {/* Hover/focus ring effect */}
      {!disabled && (
        <span
          className={`
            absolute inset-0 ${config.rounded}
            transition-all duration-200
            pointer-events-none
          `}
          style={{
            boxShadow: `0 0 0 0px ${activeColor}30`,
          }}
        />
      )}
    </button>
  );

  // If no label, return just the checkbox
  if (!label && !description) {
    return checkbox;
  }

  // With label
  return (
    <label
      htmlFor={id}
      className={`
        inline-flex items-start gap-3 cursor-pointer select-none
        ${disabled ? 'cursor-not-allowed' : ''}
      `}
    >
      <span className="pt-0.5">{checkbox}</span>
      <span className="flex flex-col">
        {label && (
          <span
            className={`${config.labelText} font-medium leading-tight`}
            style={{ color: disabled ? 'rgb(var(--color-text-muted))' : 'rgb(var(--color-text-secondary))' }}
          >
            {label}
          </span>
        )}
        {description && (
          <span
            className={`${config.descText} mt-0.5`}
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            {description}
          </span>
        )}
      </span>
    </label>
  );
}

// Checkbox Group for multiple options
interface CheckboxOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface CheckboxGroupProps {
  options: CheckboxOption[];
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'danger';
  direction?: 'vertical' | 'horizontal';
  className?: string;
}

export function CheckboxGroup({
  options,
  value,
  onChange,
  disabled = false,
  size = 'md',
  variant = 'default',
  direction = 'vertical',
  className = '',
}: CheckboxGroupProps) {
  const handleChange = (optionValue: string, checked: boolean) => {
    if (checked) {
      onChange([...value, optionValue]);
    } else {
      onChange(value.filter((v) => v !== optionValue));
    }
  };

  return (
    <div
      className={`
        flex gap-3
        ${direction === 'vertical' ? 'flex-col' : 'flex-row flex-wrap'}
        ${className}
      `}
      role="group"
    >
      {options.map((option) => (
        <Checkbox
          key={option.value}
          checked={value.includes(option.value)}
          onChange={(checked) => handleChange(option.value, checked)}
          label={option.label}
          description={option.description}
          disabled={disabled || option.disabled}
          size={size}
          variant={variant}
        />
      ))}
    </div>
  );
}

// Card-style checkbox for selecting options with more visual emphasis
interface CheckboxCardProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export function CheckboxCard({
  checked,
  onChange,
  title,
  description,
  icon,
  disabled = false,
  className = '',
}: CheckboxCardProps) {
  const id = useId();

  return (
    <label
      htmlFor={id}
      className={`
        relative flex items-start gap-4 p-4 rounded-xl cursor-pointer
        transition-all duration-200 ease-out
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}
        ${className}
      `}
      style={{
        backgroundColor: checked ? 'rgb(var(--color-primary-500) / 0.08)' : 'rgb(var(--color-surface))',
        border: `2px solid ${checked ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-border))'}`,
      }}
    >
      {icon && (
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{
            backgroundColor: checked
              ? 'rgb(var(--color-primary-500) / 0.15)'
              : 'rgb(var(--color-bg-muted))',
          }}
        >
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>
          {title}
        </div>
        {description && (
          <p className="text-sm mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {description}
          </p>
        )}
      </div>
      <Checkbox
        id={id}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        size="md"
      />
    </label>
  );
}
