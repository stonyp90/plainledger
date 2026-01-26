import { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';

interface HelpTooltipProps {
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export default function HelpTooltip({ title, content, position = 'top' }: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 rounded-full transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
        style={{ color: 'rgb(var(--color-text-muted))' }}
        aria-label="Aide"
      >
        <HelpCircle className="w-4 h-4" />
      </button>
      
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Tooltip */}
          <div 
            className={`absolute z-50 w-64 p-3 rounded-lg shadow-lg ${positionClasses[position]}`}
            style={{ 
              backgroundColor: 'rgb(var(--color-surface))',
              border: '1px solid rgb(var(--color-border))'
            }}
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4 className="font-medium text-sm" style={{ color: 'rgb(var(--color-text))' }}>
                {title}
              </h4>
              <button
                onClick={() => setIsOpen(false)}
                className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                style={{ color: 'rgb(var(--color-text-muted))' }}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <p className="text-xs" style={{ color: 'rgb(var(--color-text-secondary))' }}>
              {content}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// Step indicator component for multi-step processes
interface StepIndicatorProps {
  steps: { label: string; description?: string }[];
  currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      {steps.map((step, index) => (
        <div key={index} className="flex items-center">
          {/* Step circle */}
          <div className="flex flex-col items-center">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors"
              style={{
                backgroundColor: index < currentStep
                  ? 'rgb(var(--color-text))'
                  : index === currentStep
                  ? 'rgb(var(--color-text))'
                  : 'rgb(var(--color-bg-muted))',
                color: index <= currentStep
                  ? 'rgb(var(--color-bg))'
                  : 'rgb(var(--color-text-muted))'
              }}
            >
              {index < currentStep ? '✓' : index + 1}
            </div>
            <span 
              className="mt-1 text-xs font-medium"
              style={{ 
                color: index <= currentStep 
                  ? 'rgb(var(--color-text))' 
                  : 'rgb(var(--color-text-muted))'
              }}
            >
              {step.label}
            </span>
            {step.description && (
              <span 
                className="text-[10px]"
                style={{ color: 'rgb(var(--color-text-muted))' }}
              >
                {step.description}
              </span>
            )}
          </div>
          
          {/* Connector line */}
          {index < steps.length - 1 && (
            <div 
              className="w-16 h-0.5 mx-2"
              style={{
                backgroundColor: index < currentStep 
                  ? 'rgb(var(--color-text))' 
                  : 'rgb(var(--color-border))'
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// Info banner component for explanations
interface InfoBannerProps {
  title: string;
  description: string;
  type?: 'info' | 'success' | 'warning' | 'tip';
  dismissible?: boolean;
  onDismiss?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function InfoBanner({ 
  title, 
  description, 
  type = 'info',
  dismissible = false,
  onDismiss,
  action
}: InfoBannerProps) {
  const typeStyles = {
    info: {
      bg: 'rgb(var(--color-bg-muted))',
      border: 'rgb(var(--color-border))',
      icon: 'ℹ️',
      titleColor: 'rgb(var(--color-text))',
    },
    success: {
      bg: 'rgb(var(--color-success) / 0.1)',
      border: 'rgb(var(--color-success) / 0.2)',
      icon: '✓',
      titleColor: 'rgb(var(--color-success))',
    },
    warning: {
      bg: 'rgb(var(--color-warning) / 0.1)',
      border: 'rgb(var(--color-warning) / 0.2)',
      icon: '!',
      titleColor: 'rgb(var(--color-warning-dark))',
    },
    tip: {
      bg: 'rgb(var(--color-bg-muted))',
      border: 'rgb(var(--color-border))',
      icon: '💡',
      titleColor: 'rgb(var(--color-text))',
    },
  };

  const style = typeStyles[type];

  return (
    <div 
      className="p-4 rounded-lg border flex items-start gap-3"
      style={{ 
        backgroundColor: style.bg,
        borderColor: style.border
      }}
    >
      <span className="text-xl">{style.icon}</span>
      <div className="flex-1">
        <h4 
          className="font-medium text-sm"
          style={{ color: style.titleColor }}
        >
          {title}
        </h4>
        <p 
          className="text-sm mt-0.5"
          style={{ color: 'rgb(var(--color-text-secondary))' }}
        >
          {description}
        </p>
        {action && (
          <button
            onClick={action.onClick}
            className="text-sm font-medium mt-2 underline"
            style={{ color: style.titleColor }}
          >
            {action.label}
          </button>
        )}
      </div>
      {dismissible && (
        <button
          onClick={onDismiss}
          className="p-1 rounded hover:bg-black/5"
          style={{ color: 'rgb(var(--color-text-muted))' }}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// Empty state component
interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      <div 
        className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
        style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
      >
        {icon}
      </div>
      <h3 
        className="font-semibold text-lg mb-1"
        style={{ color: 'rgb(var(--color-text))' }}
      >
        {title}
      </h3>
      <p 
        className="text-sm mb-4 max-w-sm mx-auto"
        style={{ color: 'rgb(var(--color-text-muted))' }}
      >
        {description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="btn-primary"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
