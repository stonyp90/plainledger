/**
 * Selection Manager
 * 
 * Manages Excel-like selection state for spreadsheet
 */

export type SelectionType = 'cell' | 'row' | 'column' | 'range';

export interface CellAddress {
  driverId: string;
  periodKey: string;
}

export interface Selection {
  type: SelectionType;
  // For cell selection
  cell?: CellAddress;
  // For row selection
  driverId?: string;
  // For column selection
  periodKey?: string;
  // For range selection
  startCell?: CellAddress;
  endCell?: CellAddress;
  // Multiple selections
  cells?: CellAddress[];
  driverIds?: string[];
  periodKeys?: string[];
}

export class SelectionManager {
  private selection: Selection | null = null;
  private listeners: Set<(selection: Selection | null) => void> = new Set();

  getSelection(): Selection | null {
    return this.selection;
  }

  setSelection(selection: Selection | null) {
    this.selection = selection;
    this.notifyListeners();
  }

  selectCell(driverId: string, periodKey: string) {
    this.setSelection({
      type: 'cell',
      cell: { driverId, periodKey },
    });
  }

  selectRow(driverId: string) {
    this.setSelection({
      type: 'row',
      driverId,
    });
  }

  selectColumn(periodKey: string) {
    this.setSelection({
      type: 'column',
      periodKey,
    });
  }

  selectRange(startCell: CellAddress, endCell: CellAddress) {
    this.setSelection({
      type: 'range',
      startCell,
      endCell,
    });
  }

  selectMultipleRows(driverIds: string[]) {
    this.setSelection({
      type: 'row',
      driverIds,
    });
  }

  selectMultipleColumns(periodKeys: string[]) {
    this.setSelection({
      type: 'column',
      periodKeys,
    });
  }

  clearSelection() {
    this.setSelection(null);
  }

  isCellSelected(driverId: string, periodKey: string, driverOrder?: string[], periodOrder?: string[]): boolean {
    if (!this.selection) return false;

    switch (this.selection.type) {
      case 'cell':
        return this.selection.cell?.driverId === driverId && 
               this.selection.cell?.periodKey === periodKey;
      case 'row':
        return this.selection.driverId === driverId || 
               this.selection.driverIds?.includes(driverId);
      case 'column':
        return this.selection.periodKey === periodKey || 
               this.selection.periodKeys?.includes(periodKey);
      case 'range':
        if (!this.selection.startCell || !this.selection.endCell) return false;
        return this.isCellInRange(driverId, periodKey, this.selection.startCell, this.selection.endCell, driverOrder, periodOrder);
      default:
        return false;
    }
  }

  isCellInRange(driverId: string, periodKey: string, start: CellAddress, end: CellAddress, driverOrder?: string[], periodOrder?: string[]): boolean {
    if (!driverOrder || !periodOrder) {
      // Fallback: check if cell matches start or end
      return (driverId === start.driverId && periodKey === start.periodKey) ||
             (driverId === end.driverId && periodKey === end.periodKey);
    }

    const startDriverIdx = driverOrder.indexOf(start.driverId);
    const endDriverIdx = driverOrder.indexOf(end.driverId);
    const cellDriverIdx = driverOrder.indexOf(driverId);
    
    const startPeriodIdx = periodOrder.indexOf(start.periodKey);
    const endPeriodIdx = periodOrder.indexOf(end.periodKey);
    const cellPeriodIdx = periodOrder.indexOf(periodKey);

    if (startDriverIdx === -1 || endDriverIdx === -1 || cellDriverIdx === -1) return false;
    if (startPeriodIdx === -1 || endPeriodIdx === -1 || cellPeriodIdx === -1) return false;

    const minDriverIdx = Math.min(startDriverIdx, endDriverIdx);
    const maxDriverIdx = Math.max(startDriverIdx, endDriverIdx);
    const minPeriodIdx = Math.min(startPeriodIdx, endPeriodIdx);
    const maxPeriodIdx = Math.max(startPeriodIdx, endPeriodIdx);

    return cellDriverIdx >= minDriverIdx && cellDriverIdx <= maxDriverIdx &&
           cellPeriodIdx >= minPeriodIdx && cellPeriodIdx <= maxPeriodIdx;
  }

  getSelectedCells(driverOrder: string[], periodOrder: string[]): CellAddress[] {
    if (!this.selection) return [];

    switch (this.selection.type) {
      case 'cell':
        if (this.selection.cell) return [this.selection.cell];
        return [];
      case 'range': {
        if (!this.selection.startCell || !this.selection.endCell) return [];
        const cells: CellAddress[] = [];
        const startDriverIdx = driverOrder.indexOf(this.selection.startCell.driverId);
        const endDriverIdx = driverOrder.indexOf(this.selection.endCell.driverId);
        const startPeriodIdx = periodOrder.indexOf(this.selection.startCell.periodKey);
        const endPeriodIdx = periodOrder.indexOf(this.selection.endCell.periodKey);

        if (startDriverIdx === -1 || endDriverIdx === -1 || startPeriodIdx === -1 || endPeriodIdx === -1) {
          return [];
        }

        const minDriverIdx = Math.min(startDriverIdx, endDriverIdx);
        const maxDriverIdx = Math.max(startDriverIdx, endDriverIdx);
        const minPeriodIdx = Math.min(startPeriodIdx, endPeriodIdx);
        const maxPeriodIdx = Math.max(startPeriodIdx, endPeriodIdx);

        for (let d = minDriverIdx; d <= maxDriverIdx; d++) {
          for (let p = minPeriodIdx; p <= maxPeriodIdx; p++) {
            cells.push({ driverId: driverOrder[d], periodKey: periodOrder[p] });
          }
        }
        return cells;
      }
      default:
        return [];
    }
  }

  isRowSelected(driverId: string): boolean {
    if (!this.selection) return false;
    return this.selection.type === 'row' && 
           (this.selection.driverId === driverId || 
            this.selection.driverIds?.includes(driverId));
  }

  isColumnSelected(periodKey: string): boolean {
    if (!this.selection) return false;
    return this.selection.type === 'column' && 
           (this.selection.periodKey === periodKey || 
            this.selection.periodKeys?.includes(periodKey));
  }

  subscribe(listener: (selection: Selection | null) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.selection));
  }
}

export const selectionManager = new SelectionManager();
