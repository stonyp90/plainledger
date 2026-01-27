/**
 * Enterprise Context Menu Component
 * 
 * Professional right-click context menu for expense management
 * with keyboard shortcuts and full CRUD operations
 */

import { useEffect, useRef, useCallback } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  Copy,
  Clipboard,
  Lock,
  Unlock,
  ArrowUp,
  ArrowDown,
  Calendar,
  DollarSign,
  Tag,
  MoreHorizontal,
  Layers,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { PlannedExpense } from '../../lib/strategicPlanning';

export type ContextMenuAction =
  | 'edit'
  | 'duplicate'
  | 'delete'
  | 'lock'
  | 'unlock'
  | 'copy'
  | 'paste'
  | 'add-opex'
  | 'add-capex'
  | 'move-up'
  | 'move-down'
  | 'select-all'
  | 'deselect-all'
  | 'bulk-delete'
  | 'bulk-lock'
  | 'bulk-unlock'
  | 'change-category';

export interface ContextMenuItem {
  id: ContextMenuAction | string;
  label: string;
  labelEn: string;
  icon: React.ElementType;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  submenu?: ContextMenuItem[];
}

export interface ExpenseContextMenuProps {
  x: number;
  y: number;
  expense?: PlannedExpense;
  selectedExpenses?: PlannedExpense[];
  hasClipboard?: boolean;
  onAction: (action: ContextMenuAction, data?: unknown) => void;
  onClose: () => void;
}

const OPEX_CATEGORIES = [
  { value: 'salaries', label: 'Salaires', labelEn: 'Salaries' },
  { value: 'rent', label: 'Loyer', labelEn: 'Rent' },
  { value: 'marketing', label: 'Marketing', labelEn: 'Marketing' },
  { value: 'software', label: 'Logiciels', labelEn: 'Software' },
  { value: 'utilities', label: 'Services publics', labelEn: 'Utilities' },
  { value: 'operations', label: 'Opérations', labelEn: 'Operations' },
];

const CAPEX_CATEGORIES = [
  { value: 'equipment', label: 'Équipement', labelEn: 'Equipment' },
  { value: 'property', label: 'Immobilier', labelEn: 'Property' },
  { value: 'vehicles', label: 'Véhicules', labelEn: 'Vehicles' },
  { value: 'infrastructure', label: 'Infrastructure', labelEn: 'Infrastructure' },
];

export default function ExpenseContextMenu({
  x,
  y,
  expense,
  selectedExpenses = [],
  hasClipboard = false,
  onAction,
  onClose,
}: ExpenseContextMenuProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  const menuRef = useRef<HTMLDivElement>(null);
  const hasMultipleSelected = selectedExpenses.length > 1;
  const selectedCount = selectedExpenses.length;

  // Adjust position to keep menu in viewport
  const adjustedPosition = useCallback(() => {
    if (!menuRef.current) return { x, y };
    
    const rect = menuRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let adjustedX = x;
    let adjustedY = y;
    
    if (x + rect.width > viewportWidth - 20) {
      adjustedX = viewportWidth - rect.width - 20;
    }
    if (y + rect.height > viewportHeight - 20) {
      adjustedY = viewportHeight - rect.height - 20;
    }
    
    return { x: Math.max(10, adjustedX), y: Math.max(10, adjustedY) };
  }, [x, y]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const position = adjustedPosition();

  // Build menu items based on context
  const buildMenuItems = (): (ContextMenuItem | 'separator')[] => {
    const items: (ContextMenuItem | 'separator')[] = [];

    // If clicked on empty space - show add options
    if (!expense) {
      items.push(
        {
          id: 'add-opex',
          label: 'Ajouter OpEx',
          labelEn: 'Add OPEX',
          icon: Plus,
          shortcut: 'O',
        },
        {
          id: 'add-capex',
          label: 'Ajouter CapEx',
          labelEn: 'Add CAPEX',
          icon: Plus,
          shortcut: 'C',
        }
      );

      if (hasClipboard) {
        items.push('separator', {
          id: 'paste',
          label: 'Coller',
          labelEn: 'Paste',
          icon: Clipboard,
          shortcut: '⌘V',
        });
      }

      return items;
    }

    // If multiple items selected
    if (hasMultipleSelected) {
      items.push(
        {
          id: 'bulk-delete',
          label: `Supprimer ${selectedCount} éléments`,
          labelEn: `Delete ${selectedCount} items`,
          icon: Trash2,
          danger: true,
        },
        'separator',
        {
          id: 'bulk-lock',
          label: 'Verrouiller la sélection',
          labelEn: 'Lock selection',
          icon: Lock,
        },
        {
          id: 'bulk-unlock',
          label: 'Déverrouiller la sélection',
          labelEn: 'Unlock selection',
          icon: Unlock,
        },
        'separator',
        {
          id: 'deselect-all',
          label: 'Désélectionner tout',
          labelEn: 'Deselect all',
          icon: EyeOff,
          shortcut: 'Esc',
        }
      );
      return items;
    }

    // Single expense selected
    items.push(
      {
        id: 'edit',
        label: 'Modifier',
        labelEn: 'Edit',
        icon: Edit3,
        shortcut: 'E',
      },
      {
        id: 'duplicate',
        label: 'Dupliquer',
        labelEn: 'Duplicate',
        icon: Copy,
        shortcut: '⌘D',
      },
      {
        id: 'copy',
        label: 'Copier',
        labelEn: 'Copy',
        icon: Clipboard,
        shortcut: '⌘C',
      }
    );

    if (hasClipboard) {
      items.push({
        id: 'paste',
        label: 'Coller',
        labelEn: 'Paste',
        icon: Clipboard,
        shortcut: '⌘V',
      });
    }

    items.push('separator');

    // Lock/Unlock
    if (expense.isLocked) {
      items.push({
        id: 'unlock',
        label: 'Déverrouiller',
        labelEn: 'Unlock',
        icon: Unlock,
        shortcut: 'L',
      });
    } else {
      items.push({
        id: 'lock',
        label: 'Verrouiller',
        labelEn: 'Lock',
        icon: Lock,
        shortcut: 'L',
      });
    }

    // Category change submenu
    const categories = expense.type === 'opex' ? OPEX_CATEGORIES : CAPEX_CATEGORIES;
    items.push({
      id: 'change-category',
      label: 'Changer de catégorie',
      labelEn: 'Change category',
      icon: Tag,
      submenu: categories.map((cat) => ({
        id: `category-${cat.value}`,
        label: cat.label,
        labelEn: cat.labelEn,
        icon: Tag,
        disabled: expense.category === cat.value,
      })),
    });

    items.push('separator');

    // Delete
    items.push({
      id: 'delete',
      label: 'Supprimer',
      labelEn: 'Delete',
      icon: Trash2,
      shortcut: 'Del',
      danger: true,
    });

    return items;
  };

  const menuItems = buildMenuItems();

  const handleItemClick = (item: ContextMenuItem) => {
    if (item.disabled) return;

    if (item.id.startsWith('category-')) {
      const category = item.id.replace('category-', '');
      onAction('change-category', { category });
    } else {
      onAction(item.id as ContextMenuAction);
    }
    onClose();
  };

  const MenuItem = ({
    item,
    depth = 0,
  }: {
    item: ContextMenuItem;
    depth?: number;
  }) => {
    const [showSubmenu, setShowSubmenu] = useState(false);
    const Icon = item.icon;

    if (item.submenu) {
      return (
        <div
          className="relative"
          onMouseEnter={() => setShowSubmenu(true)}
          onMouseLeave={() => setShowSubmenu(false)}
        >
          <button
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors rounded-md ${
              item.disabled ? 'opacity-40 cursor-not-allowed' : ''
            }`}
            style={{
              color: item.danger ? 'rgb(var(--color-error))' : 'rgb(var(--color-text))',
            }}
            onMouseEnter={(e) => {
              if (!item.disabled) {
                e.currentTarget.style.backgroundColor = 'rgb(var(--color-bg-muted))';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <Icon
              size={16}
              style={{
                color: item.danger
                  ? 'rgb(var(--color-error))'
                  : 'rgb(var(--color-text-muted))',
              }}
            />
            <span className="flex-1 text-left">{isEn ? item.labelEn : item.label}</span>
            <MoreHorizontal size={14} className="rotate-90" style={{ color: 'rgb(var(--color-text-muted))' }} />
          </button>

          {showSubmenu && (
            <div
              className="absolute left-full top-0 ml-1 py-1 min-w-[180px] rounded-lg shadow-xl border"
              style={{
                backgroundColor: 'rgb(var(--color-surface))',
                borderColor: 'rgb(var(--color-border))',
                zIndex: 100,
              }}
            >
              {item.submenu.map((subItem, idx) => (
                <MenuItem key={idx} item={subItem} depth={depth + 1} />
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <button
        onClick={() => handleItemClick(item)}
        disabled={item.disabled}
        className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors rounded-md ${
          item.disabled ? 'opacity-40 cursor-not-allowed' : ''
        }`}
        style={{
          color: item.danger ? 'rgb(var(--color-error))' : 'rgb(var(--color-text))',
        }}
        onMouseEnter={(e) => {
          if (!item.disabled) {
            e.currentTarget.style.backgroundColor = 'rgb(var(--color-bg-muted))';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <Icon
          size={16}
          style={{
            color: item.danger
              ? 'rgb(var(--color-error))'
              : 'rgb(var(--color-text-muted))',
          }}
        />
        <span className="flex-1 text-left">{isEn ? item.labelEn : item.label}</span>
        {item.shortcut && (
          <kbd
            className="text-[10px] px-1.5 py-0.5 rounded font-mono"
            style={{
              backgroundColor: 'rgb(var(--color-bg-muted))',
              color: 'rgb(var(--color-text-muted))',
            }}
          >
            {item.shortcut}
          </kbd>
        )}
      </button>
    );
  };

  // Need useState for submenu
  const [, useState] = [useRef, require('react').useState];

  return (
    <>
      {/* Backdrop for capturing clicks */}
      <div 
        className="fixed inset-0" 
        style={{ zIndex: 9998 }}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      
      <div
        ref={menuRef}
        className="fixed py-1.5 px-1 min-w-[220px] rounded-xl shadow-2xl border backdrop-blur-sm"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          backgroundColor: 'rgb(var(--color-surface) / 0.98)',
          borderColor: 'rgb(var(--color-border))',
          zIndex: 9999,
          animation: 'contextMenuFadeIn 0.15s ease-out',
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Header when expense is selected */}
        {expense && !hasMultipleSelected && (
          <div className="px-3 py-2 mb-1 border-b" style={{ borderColor: 'rgb(var(--color-border))' }}>
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  backgroundColor: expense.type === 'opex' ? '#3B82F6' : '#F59E0B',
                }}
              />
              <span
                className="text-xs font-semibold truncate max-w-[160px]"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                {isEn ? expense.nameEn : expense.name}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <DollarSign size={10} style={{ color: 'rgb(var(--color-text-muted))' }} />
              <span className="text-[10px]" style={{ color: 'rgb(var(--color-text-muted))' }}>
                ${expense.amount.toLocaleString()}
                {expense.frequency !== 'one_time' && `/${expense.frequency === 'monthly' ? 'mo' : expense.frequency === 'quarterly' ? 'qtr' : 'yr'}`}
              </span>
              <Calendar size={10} style={{ color: 'rgb(var(--color-text-muted))' }} />
              <span className="text-[10px]" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {new Date(expense.startDate).toLocaleDateString(isEn ? 'en-CA' : 'fr-CA', { month: 'short', year: '2-digit' })}
              </span>
            </div>
          </div>
        )}

        {/* Multi-select header */}
        {hasMultipleSelected && (
          <div className="px-3 py-2 mb-1 border-b" style={{ borderColor: 'rgb(var(--color-border))' }}>
            <div className="flex items-center gap-2">
              <Layers size={14} style={{ color: 'rgb(var(--color-primary-500))' }} />
              <span className="text-xs font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? `${selectedCount} items selected` : `${selectedCount} éléments sélectionnés`}
              </span>
            </div>
          </div>
        )}

        {/* Menu items */}
        <div className="space-y-0.5">
          {menuItems.map((item, index) =>
            item === 'separator' ? (
              <div
                key={`sep-${index}`}
                className="my-1.5 mx-2"
                style={{ borderTop: '1px solid rgb(var(--color-border))' }}
              />
            ) : (
              <MenuItem key={item.id} item={item} />
            )
          )}
        </div>
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes contextMenuFadeIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-5px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </>
  );
}
