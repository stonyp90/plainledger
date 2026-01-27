/**
 * Context Menu Component
 * 
 * Right-click context menu for driver rows
 */

import { Copy, Trash2, Edit2, Plus, ArrowUp, ArrowDown, FileText } from 'lucide-react';
import { type Driver } from '../../lib/financialModel';

interface ContextMenuProps {
  x: number;
  y: number;
  driver: Driver;
  onClose: () => void;
  onCopy?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onAddAbove?: () => void;
  onAddBelow?: () => void;
}

export default function ContextMenu({
  x,
  y,
  driver,
  onClose,
  onCopy,
  onDelete,
  onEdit,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onAddAbove,
  onAddBelow,
}: ContextMenuProps) {
  const colors = {
    bg: {
      base: '#FFFFFF',
      hover: '#F9FAFB',
    },
    border: {
      default: '#E5E7EB',
    },
    text: {
      primary: '#111827',
      secondary: '#374151',
      muted: '#6B7280',
      danger: '#DC2626',
    },
  };

  const menuItems = [
    { icon: Edit2, label: 'Edit', action: onEdit, shortcut: 'E' },
    { icon: Copy, label: 'Copy', action: onCopy, shortcut: 'Ctrl+C' },
    { icon: FileText, label: 'Duplicate', action: onDuplicate, shortcut: 'Ctrl+D' },
    { separator: true },
    { icon: Plus, label: 'Add Above', action: onAddAbove },
    { icon: Plus, label: 'Add Below', action: onAddBelow },
    { separator: true },
    { icon: ArrowUp, label: 'Move Up', action: onMoveUp, shortcut: 'Ctrl+↑' },
    { icon: ArrowDown, label: 'Move Down', action: onMoveDown, shortcut: 'Ctrl+↓' },
    { separator: true },
    { icon: Trash2, label: 'Delete', action: onDelete, shortcut: 'Del', danger: true },
  ];

  return (
    <div
      className="fixed z-50 bg-white rounded-lg shadow-lg border py-1 min-w-[200px]"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        borderColor: colors.border.default,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {menuItems.map((item, index) => {
        if (item.separator) {
          return (
            <div
              key={`separator-${index}`}
              className="my-1"
              style={{ borderTop: `1px solid ${colors.border.default}` }}
            />
          );
        }

        const Icon = item.icon!;
        const isDanger = item.danger;
        const isDisabled = !item.action;

        return (
          <button
            key={index}
            onClick={() => {
              item.action?.();
              onClose();
            }}
            disabled={isDisabled}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              color: isDanger ? colors.text.danger : colors.text.primary,
            }}
            onMouseEnter={(e) => {
              if (!isDisabled) {
                e.currentTarget.style.backgroundColor = colors.bg.hover;
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <Icon size={16} style={{ color: isDanger ? colors.text.danger : colors.text.secondary }} />
            <span className="flex-1 text-left">{item.label}</span>
            {item.shortcut && (
              <span className="text-xs" style={{ color: colors.text.muted }}>
                {item.shortcut}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
