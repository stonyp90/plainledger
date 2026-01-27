/**
 * Drag and Drop Utilities
 * 
 * Handles Excel-like drag and drop for cells
 */

import { type CellAddress } from './SelectionManager';

export interface DragState {
  isDragging: boolean;
  sourceCell: CellAddress | null;
  currentCell: CellAddress | null;
  mode: 'move' | 'copy';
}

export class DragManager {
  private dragState: DragState = {
    isDragging: false,
    sourceCell: null,
    currentCell: null,
    mode: 'move',
  };
  private listeners: Set<(state: DragState) => void> = new Set();

  startDrag(sourceCell: CellAddress, mode: 'move' | 'copy' = 'move') {
    this.dragState = {
      isDragging: true,
      sourceCell,
      currentCell: sourceCell,
      mode,
    };
    this.notifyListeners();
  }

  updateDrag(currentCell: CellAddress) {
    if (!this.dragState.isDragging) return;
    this.dragState.currentCell = currentCell;
    this.notifyListeners();
  }

  endDrag() {
    const result = { ...this.dragState };
    this.dragState = {
      isDragging: false,
      sourceCell: null,
      currentCell: null,
      mode: 'move',
    };
    this.notifyListeners();
    return result;
  }

  getDragState(): DragState {
    return this.dragState;
  }

  subscribe(listener: (state: DragState) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.dragState));
  }
}

export const dragManager = new DragManager();
