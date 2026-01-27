/**
 * Icon Picker Component
 * 
 * Provides a themed icon selector for drivers
 */

import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  PieChart,
  BarChart3,
  LineChart,
  Wallet,
  CreditCard,
  Building2,
  Users,
  ShoppingCart,
  Package,
  Truck,
  Zap,
  Lightbulb,
  Rocket,
  Star,
  Heart,
  Flag,
  Award,
  Shield,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  Info,
  X as XIcon,
} from 'lucide-react';

export type IconType = 
  | 'dollar'
  | 'trending-up'
  | 'trending-down'
  | 'target'
  | 'pie-chart'
  | 'bar-chart'
  | 'line-chart'
  | 'wallet'
  | 'credit-card'
  | 'building'
  | 'users'
  | 'shopping-cart'
  | 'package'
  | 'truck'
  | 'zap'
  | 'lightbulb'
  | 'rocket'
  | 'star'
  | 'heart'
  | 'flag'
  | 'award'
  | 'shield'
  | 'lock'
  | 'unlock'
  | 'check-circle'
  | 'alert-circle'
  | 'info'
  | 'none';

export const ICON_MAP: Record<IconType, React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>> = {
  'dollar': DollarSign,
  'trending-up': TrendingUp,
  'trending-down': TrendingDown,
  'target': Target,
  'pie-chart': PieChart,
  'bar-chart': BarChart3,
  'line-chart': LineChart,
  'wallet': Wallet,
  'credit-card': CreditCard,
  'building': Building2,
  'users': Users,
  'shopping-cart': ShoppingCart,
  'package': Package,
  'truck': Truck,
  'zap': Zap,
  'lightbulb': Lightbulb,
  'rocket': Rocket,
  'star': Star,
  'heart': Heart,
  'flag': Flag,
  'award': Award,
  'shield': Shield,
  'lock': Lock,
  'unlock': Unlock,
  'check-circle': CheckCircle2,
  'alert-circle': AlertCircle,
  'info': Info,
  'none': XIcon,
};

export const ICON_CATEGORIES = {
  financial: ['dollar', 'wallet', 'credit-card', 'trending-up', 'trending-down'] as IconType[],
  charts: ['pie-chart', 'bar-chart', 'line-chart', 'target'] as IconType[],
  business: ['building', 'users', 'shopping-cart', 'package', 'truck'] as IconType[],
  general: ['zap', 'lightbulb', 'rocket', 'star', 'heart', 'flag', 'award', 'shield'] as IconType[],
  status: ['check-circle', 'alert-circle', 'info', 'lock', 'unlock'] as IconType[],
};

interface IconPickerProps {
  selectedIcon?: IconType;
  onSelect: (icon: IconType) => void;
  onClose: () => void;
}

export default function IconPicker({ selectedIcon, onSelect, onClose }: IconPickerProps) {
  const colors = {
    bg: {
      base: '#FFFFFF',
      hover: '#F9FAFB',
      active: '#EFF6FF',
    },
    border: {
      default: '#E5E7EB',
      focus: '#3B82F6',
    },
    text: {
      primary: '#111827',
      secondary: '#374151',
      muted: '#6B7280',
    },
    accent: {
      primary: '#3B82F6',
    },
  };

  return (
    <div
      className="absolute z-50 bg-white rounded-lg shadow-lg border p-3"
      style={{
        borderColor: colors.border.default,
        minWidth: '280px',
        maxWidth: '320px',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold" style={{ color: colors.text.primary }}>
          Select Icon
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-100"
          style={{ color: colors.text.muted }}
        >
          <XIcon className="w-4 h-4" />
        </button>
      </div>
      
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {Object.entries(ICON_CATEGORIES).map(([category, icons]) => (
          <div key={category}>
            <div className="text-xs font-medium mb-2 uppercase tracking-wide" style={{ color: colors.text.muted }}>
              {category}
            </div>
            <div className="grid grid-cols-6 gap-2">
              {icons.map((iconType) => {
                const IconComponent = ICON_MAP[iconType];
                const isSelected = selectedIcon === iconType;
                return (
                  <button
                    key={iconType}
                    onClick={() => {
                      onSelect(iconType);
                      onClose();
                    }}
                    className="p-2 rounded transition-colors flex items-center justify-center"
                    style={{
                      backgroundColor: isSelected ? colors.bg.active : 'transparent',
                      border: `1px solid ${isSelected ? colors.border.focus : colors.border.default}`,
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = colors.bg.hover;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                    title={iconType}
                  >
                    <IconComponent
                      size={18}
                      style={{
                        color: isSelected ? colors.accent.primary : colors.text.secondary,
                      }}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-3 pt-3 border-t" style={{ borderColor: colors.border.default }}>
        <button
          onClick={() => {
            onSelect('none');
            onClose();
          }}
          className="w-full px-3 py-2 text-sm rounded transition-colors"
          style={{
            backgroundColor: selectedIcon === 'none' ? colors.bg.active : 'transparent',
            color: colors.text.secondary,
            border: `1px solid ${selectedIcon === 'none' ? colors.border.focus : colors.border.default}`,
          }}
        >
          No Icon
        </button>
      </div>
    </div>
  );
}
