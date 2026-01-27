/**
 * Selection Operations Component
 * 
 * Provides operations menu for selected cells/rows/columns
 */

import { Copy, Trash2, ArrowDown, ArrowRight, Plus, Minus, Calculator } from 'lucide-react';
import { type Selection } from './SelectionManager';

interface SelectionOperationsProps {
  selection: Selection;
  onCopy: () => void;
  onPaste: () => void;
  onDelete: () => void;
  onFillDown?: () => void;
  onFillRight?: () => void;
  onInsertRow?: () => void;
  onInsertColumn?: () => void;
  onDeleteRow?: () => void;
  onDeleteColumn?: () => void;
  onSum?: () => void;
  onAverage?: () => void;
  position: { x: number; y: number };
  onClose: () => void;
}

export default function SelectionOperations({
  selection,
  onCopy,
  onPaste,
  onDelete,
  onFillDown,
  onFillRight,
  onInsertRow,
  onInsertColumn,
  onDeleteRow,
  onDeleteColumn,
  onSum,
  onAverage,
  position,
  onClose,
}: SelectionOperationsProps) {
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

  const operations = [
    { icon: Copy, label: 'Copy', action: onCopy, shortcut: 'Ctrl+C', separator: false },
    { icon: Copy, label: 'Paste', action: onPaste, shortcut: 'Ctrl+V', separator: false },
    { separator: true },
    { icon: ArrowDown, label: 'Fill Down', action: onFillDown, shortcut: 'Ctrl+D', separator: false, show: selection.type === 'cell' || selection.type === 'range' },
    { icon: ArrowRight, label: 'Fill Right', action: onFillRight, shortcut: 'Ctrl+R', separator: false, show: selection.type === 'cell' || selection.type === 'range' },
    { separator: true },
    { icon: Plus, label: selection.type === 'row' ? 'Insert Row Above' : 'Insert Column Left', action: selection.type === 'row' ? onInsertRow : onInsertColumn, separator: false },
    { icon: Minus, label: selection.type === 'row' ? 'Delete Row' : 'Delete Column', action: selection.type === 'row' ? onDeleteRow : onDeleteColumn, separator: false, danger: true },
    { separator: true },
    { icon: Calculator, label: 'Sum', action: onSum, shortcut: 'Alt+=', separator: false, show: selection.type === 'range' },
    { icon: Calculator, label: 'Average', action: onAverage, separator: false, show: selection.type === 'range' },
    { separator: true },
    { icon: Trash2, label: 'Clear', action: onDelete, shortcut: 'Del', separator: false, danger: true },
  ];

  return (
    <div
      className="fixed z-50 bg-white rounded-lg shadow-lg border py-1 min-w-[220px]"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        borderColor: colors.border.default,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {operations
        .filter(op => op.show !== false)
        .map((item, index) => {
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

          return (
            <button
              key={index}
              onClick={() => {
                item.action?.();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors"
              style={{
                color: isDanger ? colors.text.danger : colors.text.primary,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.bg.hover;
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
