/**
 * Model Spreadsheet Component - Runway-style Design
 * 
 * Professional financial model spreadsheet with:
 * - Compact, data-dense table layout
 * - Clean visual hierarchy
 * - Smooth interactions
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Plus, ChevronDown, ChevronRight, Pencil, Trash2, Building2, ShoppingCart, Briefcase, HeartPulse, Factory, GraduationCap, Utensils, X, Check } from 'lucide-react';
import {
  type FinancialModel,
  type Driver,
  type DriverGroup,
  type ViewMode,
  generatePeriodKeys,
  generateModelId,
} from '../../lib/financialModel';
import { useI18n } from '../../lib/i18n';
import TimelineHeader from './TimelineHeader';
import DriverRow from './DriverRow';
import { selectionManager, type Selection } from './SelectionManager';
import SelectionOperations from './SelectionOperations';
import { dragManager } from './DragAndDrop';
import ResizableColumn from './ResizableColumn';
import ScenarioManager from './ScenarioManager';

// Runway-inspired color palette
const colors = {
  bg: {
    base: '#FFFFFF',
    muted: '#F9FAFB',
    header: '#F8F9FA',
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

// Industry-based group templates
const GROUP_TEMPLATES = {
  construction: {
    icon: Building2,
    nameEn: 'Construction',
    name: 'Construction',
    groups: [
      { nameEn: 'Revenue', name: 'Revenus', drivers: ['Project Revenue', 'Change Orders', 'Retainage', 'Progress Billings'] },
      { nameEn: 'Direct Costs', name: 'Coûts directs', drivers: ['Materials', 'Labor', 'Subcontractors', 'Equipment Rental'] },
      { nameEn: 'Project Management', name: 'Gestion de projet', drivers: ['Project Managers', 'Site Supervisors', 'Engineering'] },
      { nameEn: 'Equipment', name: 'Équipement', drivers: ['Equipment Depreciation', 'Fuel', 'Maintenance', 'Insurance'] },
      { nameEn: 'Overhead', name: 'Frais généraux', drivers: ['Office Rent', 'Admin Staff', 'Bonding', 'Professional Fees'] },
    ],
  },
  retail: {
    icon: ShoppingCart,
    nameEn: 'Retail / E-commerce',
    name: 'Commerce de détail',
    groups: [
      { nameEn: 'Revenue', name: 'Revenus', drivers: ['Gross Sales', 'Returns', 'Discounts', 'Net Sales'] },
      { nameEn: 'Cost of Goods', name: 'Coût des marchandises', drivers: ['Inventory Purchases', 'Shipping Costs', 'Fulfillment'] },
      { nameEn: 'Store Operations', name: 'Opérations magasin', drivers: ['Rent', 'Utilities', 'Store Staff', 'POS Systems'] },
      { nameEn: 'Marketing', name: 'Marketing', drivers: ['Digital Ads', 'Promotions', 'Influencer Partnerships'] },
      { nameEn: 'Overhead', name: 'Frais généraux', drivers: ['HQ Staff', 'Insurance', 'Professional Services'] },
    ],
  },
  consulting: {
    icon: Briefcase,
    nameEn: 'Professional Services',
    name: 'Services professionnels',
    groups: [
      { nameEn: 'Revenue', name: 'Revenus', drivers: ['Billable Hours', 'Average Rate', 'Project Revenue', 'Retainer Revenue'] },
      { nameEn: 'Delivery', name: 'Livraison', drivers: ['Consultant Salaries', 'Subcontractors', 'Travel & Expenses'] },
      { nameEn: 'Business Development', name: 'Développement commercial', drivers: ['BD Headcount', 'Marketing', 'Events & Conferences'] },
      { nameEn: 'Operations', name: 'Opérations', drivers: ['Admin Staff', 'Office Space', 'Technology', 'Training'] },
    ],
  },
  healthcare: {
    icon: HeartPulse,
    nameEn: 'Healthcare',
    name: 'Santé',
    groups: [
      { nameEn: 'Patient Revenue', name: 'Revenus patients', drivers: ['Patient Visits', 'Insurance Reimbursements', 'Self-Pay', 'Lab Services'] },
      { nameEn: 'Clinical Staff', name: 'Personnel clinique', drivers: ['Physicians', 'Nurses', 'Medical Assistants', 'Specialists'] },
      { nameEn: 'Facilities', name: 'Installations', drivers: ['Rent', 'Medical Equipment', 'Supplies', 'Utilities'] },
      { nameEn: 'Administrative', name: 'Administratif', drivers: ['Billing Staff', 'Reception', 'IT', 'Compliance'] },
    ],
  },
  manufacturing: {
    icon: Factory,
    nameEn: 'Manufacturing',
    name: 'Fabrication',
    groups: [
      { nameEn: 'Sales', name: 'Ventes', drivers: ['Units Sold', 'Average Price', 'Gross Revenue'] },
      { nameEn: 'Production Costs', name: 'Coûts de production', drivers: ['Raw Materials', 'Direct Labor', 'Manufacturing Overhead'] },
      { nameEn: 'Operations', name: 'Opérations', drivers: ['Facility Costs', 'Equipment Maintenance', 'Quality Control'] },
      { nameEn: 'Supply Chain', name: 'Chaîne d\'approvisionnement', drivers: ['Logistics', 'Warehousing', 'Procurement'] },
      { nameEn: 'G&A', name: 'Frais généraux', drivers: ['Management', 'HR', 'Finance', 'Legal'] },
    ],
  },
  restaurant: {
    icon: Utensils,
    nameEn: 'Restaurant / Food Service',
    name: 'Restaurant / Restauration',
    groups: [
      { nameEn: 'Revenue', name: 'Revenus', drivers: ['Dine-in Sales', 'Takeout', 'Delivery', 'Catering'] },
      { nameEn: 'Food Costs', name: 'Coûts alimentaires', drivers: ['Food Purchases', 'Beverage Costs', 'Waste'] },
      { nameEn: 'Labor', name: 'Main d\'œuvre', drivers: ['Kitchen Staff', 'Front of House', 'Management'] },
      { nameEn: 'Occupancy', name: 'Occupation', drivers: ['Rent', 'Utilities', 'Maintenance', 'Insurance'] },
      { nameEn: 'Marketing', name: 'Marketing', drivers: ['Digital Marketing', 'Loyalty Programs', 'Local Advertising'] },
    ],
  },
  education: {
    icon: GraduationCap,
    nameEn: 'Education',
    name: 'Éducation',
    groups: [
      { nameEn: 'Revenue', name: 'Revenus', drivers: ['Tuition', 'Enrollment Fees', 'Grants', 'Other Income'] },
      { nameEn: 'Instruction', name: 'Enseignement', drivers: ['Faculty Salaries', 'Teaching Materials', 'Technology'] },
      { nameEn: 'Student Services', name: 'Services étudiants', drivers: ['Counseling', 'Career Services', 'Activities'] },
      { nameEn: 'Facilities', name: 'Installations', drivers: ['Buildings', 'Maintenance', 'Security', 'Utilities'] },
      { nameEn: 'Administration', name: 'Administration', drivers: ['Admin Staff', 'Marketing', 'IT', 'Finance'] },
    ],
  },
  general: {
    icon: Building2,
    nameEn: 'General Business',
    name: 'Entreprise générale',
    groups: [
      { nameEn: 'Revenue', name: 'Revenus', drivers: ['Product Sales', 'Service Revenue', 'Other Income'] },
      { nameEn: 'Cost of Sales', name: 'Coût des ventes', drivers: ['Direct Costs', 'Materials', 'Labor'] },
      { nameEn: 'Operating Expenses', name: 'Dépenses opérationnelles', drivers: ['Salaries', 'Rent', 'Marketing', 'Utilities'] },
      { nameEn: 'G&A', name: 'Frais généraux', drivers: ['Management', 'Professional Services', 'Insurance', 'Office'] },
    ],
  },
};

interface ModelSpreadsheetProps {
  model: FinancialModel;
  onModelUpdate: (model: FinancialModel) => void;
  getAccountValue?: (accountId: string, periodKey: string) => number | null;
  currency?: string;
}

export default function ModelSpreadsheet({
  model,
  onModelUpdate,
  getAccountValue,
  currency = 'USD',
}: ModelSpreadsheetProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  const [selection, setSelection] = useState<Selection | null>(null);
  const [showOperationsMenu, setShowOperationsMenu] = useState(false);
  const [operationsMenuPos, setOperationsMenuPos] = useState({ x: 0, y: 0 });
  const [clipboard, setClipboard] = useState<Record<string, number> | null>(null);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [customGroupName, setCustomGroupName] = useState('');
  
  // Column widths with defaults
  const columnWidths = useMemo(() => ({
    driver: model.columnWidths?.driver ?? 200,
    formula: model.columnWidths?.formula ?? 300,
    period: model.columnWidths?.period ?? 110,
  }), [model.columnWidths]);
  
  const handleColumnResize = useCallback((column: 'driver' | 'formula' | 'period', newWidth: number) => {
    onModelUpdate({
      ...model,
      columnWidths: {
        ...model.columnWidths,
        [column]: Math.max(80, Math.min(500, newWidth)), // Min 80px, Max 500px
      },
      updatedAt: new Date().toISOString(),
    });
  }, [model, onModelUpdate]);
  
  const startDate = useMemo(() => new Date(model.timelineStart), [model.timelineStart]);
  const endDate = useMemo(() => new Date(model.timelineEnd), [model.timelineEnd]);
  
  const periods = useMemo(() => {
    return generatePeriodKeys(startDate, endDate, model.viewMode);
  }, [startDate, endDate, model.viewMode]);
  
  // Subscribe to selection changes
  useEffect(() => {
    const unsubscribe = selectionManager.subscribe(setSelection);
    return unsubscribe;
  }, []);
  
  // Keyboard shortcuts for selection operations
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      const currentSelection = selectionManager.getSelection();
      if (!currentSelection) return;
      
      // Copy
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        handleCopy();
      }
      
      // Paste
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        handlePaste();
      }
      
      // Delete/Clear
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleClear();
      }
      
      // Fill Down
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        handleFillDown();
      }
      
      // Fill Right
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        handleFillRight();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [model]);
  
  const handleCopy = () => {
    const sel = selectionManager.getSelection();
    if (!sel) return;
    
    if (sel.type === 'cell' && sel.cell) {
      const driver = model.drivers[sel.cell.driverId];
      if (driver) {
        const value = driver.values[sel.cell.periodKey];
        setClipboard({ [sel.cell.periodKey]: value ?? 0 });
      }
    } else if (sel.type === 'range' && sel.startCell && sel.endCell) {
      // Copy range
      const driverOrder = sortedGroups.flatMap(g => 
        g.driverIds.map(id => model.drivers[id]).filter(Boolean).map(d => d.id)
      );
      const selectedCells = selectionManager.getSelectedCells(driverOrder, periods);
      const rangeData: Record<string, Record<string, number>> = {};
      selectedCells.forEach(cell => {
        const driver = model.drivers[cell.driverId];
        if (driver && driver.values[cell.periodKey] !== undefined) {
          if (!rangeData[cell.driverId]) rangeData[cell.driverId] = {};
          rangeData[cell.driverId][cell.periodKey] = driver.values[cell.periodKey];
        }
      });
      setClipboard(rangeData as any);
    } else if (sel.type === 'row' && sel.driverId) {
      const driver = model.drivers[sel.driverId];
      if (driver) {
        setClipboard(driver.values);
      }
    } else if (sel.type === 'column' && sel.periodKey) {
      const values: Record<string, number> = {};
      Object.values(model.drivers).forEach(driver => {
        if (driver.values[sel.periodKey!] !== undefined) {
          values[driver.id] = driver.values[sel.periodKey!];
        }
      });
      setClipboard(values);
    }
  };
  
  const handlePaste = () => {
    if (!clipboard) return;
    const sel = selectionManager.getSelection();
    if (!sel) return;
    
    if (sel.type === 'cell' && sel.cell) {
      const driver = model.drivers[sel.cell.driverId];
      if (driver && !driver.formula) {
        // Check if clipboard is a range (object of objects)
        if (typeof clipboard === 'object' && !Array.isArray(clipboard)) {
          const firstKey = Object.keys(clipboard)[0];
          if (firstKey && typeof clipboard[firstKey] === 'object') {
            // Range paste
            const rangeData = clipboard as Record<string, Record<string, number>>;
            const driverOrder = sortedGroups.flatMap(g => 
              g.driverIds.map(id => model.drivers[id]).filter(Boolean).map(d => d.id)
            );
            const startDriverIdx = driverOrder.indexOf(sel.cell.driverId);
            const startPeriodIdx = periods.indexOf(sel.cell.periodKey);
            
            if (startDriverIdx !== -1 && startPeriodIdx !== -1) {
              const updatedDrivers = { ...model.drivers };
              const sourceDriverIds = Object.keys(rangeData);
              
              sourceDriverIds.forEach((sourceDriverId, driverOffset) => {
                const targetDriverIdx = startDriverIdx + driverOffset;
                if (targetDriverIdx < driverOrder.length) {
                  const targetDriverId = driverOrder[targetDriverIdx];
                  const targetDriver = updatedDrivers[targetDriverId];
                  if (targetDriver && !targetDriver.formula) {
                    const sourcePeriods = Object.keys(rangeData[sourceDriverId]);
                    const updatedValues = { ...targetDriver.values };
                    
                    sourcePeriods.forEach((sourcePeriodKey, periodOffset) => {
                      const targetPeriodIdx = startPeriodIdx + periodOffset;
                      if (targetPeriodIdx < periods.length) {
                        updatedValues[periods[targetPeriodIdx]] = rangeData[sourceDriverId][sourcePeriodKey];
                      }
                    });
                    
                    updatedDrivers[targetDriverId] = { ...targetDriver, values: updatedValues };
                  }
                }
              });
              
              onModelUpdate({
                ...model,
                drivers: updatedDrivers,
                updatedAt: new Date().toISOString(),
              });
            }
          } else {
            // Single cell paste
            const updatedDriver = {
              ...driver,
              values: { ...driver.values, ...clipboard },
            };
            onModelUpdate({
              ...model,
              drivers: { ...model.drivers, [driver.id]: updatedDriver },
              updatedAt: new Date().toISOString(),
            });
          }
        }
      }
    } else if (sel.type === 'range' && sel.startCell) {
      // Paste into range
      const driverOrder = sortedGroups.flatMap(g => 
        g.driverIds.map(id => model.drivers[id]).filter(Boolean).map(d => d.id)
      );
      const selectedCells = selectionManager.getSelectedCells(driverOrder, periods);
      
      if (typeof clipboard === 'object' && !Array.isArray(clipboard)) {
        const firstKey = Object.keys(clipboard)[0];
        if (firstKey && typeof clipboard[firstKey] === 'object') {
          const rangeData = clipboard as Record<string, Record<string, number>>;
          const sourceDriverIds = Object.keys(rangeData);
          const updatedDrivers = { ...model.drivers };
          
          selectedCells.forEach((cell, idx) => {
            const sourceDriverIdx = idx % sourceDriverIds.length;
            const sourceDriverId = sourceDriverIds[sourceDriverIdx];
            const sourcePeriods = Object.keys(rangeData[sourceDriverId]);
            const sourcePeriodIdx = Math.floor(idx / sourceDriverIds.length) % sourcePeriods.length;
            
            const targetDriver = updatedDrivers[cell.driverId];
            if (targetDriver && !targetDriver.formula) {
              const sourceValue = rangeData[sourceDriverId][sourcePeriods[sourcePeriodIdx]];
              updatedDrivers[cell.driverId] = {
                ...targetDriver,
                values: { ...targetDriver.values, [cell.periodKey]: sourceValue },
              };
            }
          });
          
          onModelUpdate({
            ...model,
            drivers: updatedDrivers,
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }
  };
  
  const handleClear = () => {
    const sel = selectionManager.getSelection();
    if (!sel) return;
    
    if (sel.type === 'cell' && sel.cell) {
      const driver = model.drivers[sel.cell.driverId];
      if (driver) {
        const updatedValues = { ...driver.values };
        delete updatedValues[sel.cell.periodKey];
        const updatedDriver = { ...driver, values: updatedValues };
        onModelUpdate({
          ...model,
          drivers: { ...model.drivers, [driver.id]: updatedDriver },
          updatedAt: new Date().toISOString(),
        });
      }
    } else if (sel.type === 'row' && sel.driverId) {
      const driver = model.drivers[sel.driverId];
      if (driver) {
        const updatedDriver = { ...driver, values: {} };
        onModelUpdate({
          ...model,
          drivers: { ...model.drivers, [driver.id]: updatedDriver },
          updatedAt: new Date().toISOString(),
        });
      }
    } else if (sel.type === 'column' && sel.periodKey) {
      const updatedDrivers = { ...model.drivers };
      Object.values(model.drivers).forEach(driver => {
        const updatedValues = { ...driver.values };
        delete updatedValues[sel.periodKey!];
        updatedDrivers[driver.id] = { ...driver, values: updatedValues };
      });
      onModelUpdate({
        ...model,
        drivers: updatedDrivers,
        updatedAt: new Date().toISOString(),
      });
    }
  };
  
  const handleFillDown = () => {
    const sel = selectionManager.getSelection();
    if (!sel || sel.type !== 'cell' || !sel.cell) return;
    
    const driver = model.drivers[sel.cell.driverId];
    if (!driver) return;
    
    const sourceValue = driver.values[sel.cell.periodKey];
    if (sourceValue === undefined) return;
    
    const currentPeriodIndex = periods.indexOf(sel.cell.periodKey);
    if (currentPeriodIndex === -1 || currentPeriodIndex === periods.length - 1) return;
    
    const updatedValues = { ...driver.values };
    for (let i = currentPeriodIndex + 1; i < periods.length; i++) {
      updatedValues[periods[i]] = sourceValue;
    }
    
    const updatedDriver = { ...driver, values: updatedValues };
    onModelUpdate({
      ...model,
      drivers: { ...model.drivers, [driver.id]: updatedDriver },
      updatedAt: new Date().toISOString(),
    });
  };
  
  const handleFillRight = () => {
    const sel = selectionManager.getSelection();
    if (!sel || sel.type !== 'cell' || !sel.cell) return;
    
    const driver = model.drivers[sel.cell.driverId];
    if (!driver) return;
    
    const sourceValue = driver.values[sel.cell.periodKey];
    if (sourceValue === undefined) return;
    
    const currentPeriodIndex = periods.indexOf(sel.cell.periodKey);
    if (currentPeriodIndex === -1 || currentPeriodIndex === periods.length - 1) return;
    
    const updatedValues = { ...driver.values };
    for (let i = currentPeriodIndex + 1; i < periods.length; i++) {
      updatedValues[periods[i]] = sourceValue;
    }
    
    const updatedDriver = { ...driver, values: updatedValues };
    onModelUpdate({
      ...model,
      drivers: { ...model.drivers, [driver.id]: updatedDriver },
      updatedAt: new Date().toISOString(),
    });
  };
  
  const handleColumnClick = (periodKey: string, e: React.MouseEvent) => {
    if (e.shiftKey) {
      // Multi-select columns
      const currentSel = selectionManager.getSelection();
      if (currentSel?.type === 'column' && currentSel.periodKey) {
        const currentIndex = periods.indexOf(currentSel.periodKey);
        const newIndex = periods.indexOf(periodKey);
        if (currentIndex !== -1 && newIndex !== -1) {
          const start = Math.min(currentIndex, newIndex);
          const end = Math.max(currentIndex, newIndex);
          selectionManager.selectMultipleColumns(periods.slice(start, end + 1));
        }
      } else {
        selectionManager.selectColumn(periodKey);
      }
    } else {
      selectionManager.selectColumn(periodKey);
    }
    
    // Show operations menu
    setOperationsMenuPos({ x: e.clientX, y: e.clientY });
    setShowOperationsMenu(true);
  };
  
  const sortedGroups = useMemo(() => {
    return [...model.groups].sort((a, b) => a.order - b.order);
  }, [model.groups]);
  
  // Get driver order for range operations
  const driverOrder = useMemo(() => {
    return sortedGroups.flatMap(g => 
      g.driverIds.map(id => model.drivers[id]).filter(Boolean).map(d => d.id)
    );
  }, [sortedGroups, model.drivers]);
  
  const handleDriverUpdate = useCallback((updatedDriver: Driver) => {
    onModelUpdate({
      ...model,
      drivers: { ...model.drivers, [updatedDriver.id]: updatedDriver },
      updatedAt: new Date().toISOString(),
    });
  }, [model, onModelUpdate]);
  
  const handleDriverDelete = useCallback((driverId: string) => {
    const updatedDrivers = { ...model.drivers };
    delete updatedDrivers[driverId];
    
    const updatedGroups = model.groups.map(group => ({
      ...group,
      driverIds: group.driverIds.filter(id => id !== driverId),
    }));
    
    onModelUpdate({
      ...model,
      drivers: updatedDrivers,
      groups: updatedGroups,
      updatedAt: new Date().toISOString(),
    });
  }, [model, onModelUpdate]);
  
  const handleDriverDuplicate = useCallback((driver: Driver, groupId: string) => {
    const driverId = generateModelId('driver');
    const duplicatedDriver: Driver = {
      ...driver,
      id: driverId,
      name: `${driver.name} (Copy)`,
      values: { ...driver.values },
    };
    
    const updatedGroups = model.groups.map(group =>
      group.id === groupId
        ? { ...group, driverIds: [...group.driverIds, driverId] }
        : group
    );
    
    onModelUpdate({
      ...model,
      drivers: { ...model.drivers, [driverId]: duplicatedDriver },
      groups: updatedGroups,
      updatedAt: new Date().toISOString(),
    });
  }, [model, onModelUpdate]);
  
  const handleDriverMove = useCallback((driverId: string, groupId: string, direction: 'up' | 'down') => {
    const group = model.groups.find(g => g.id === groupId);
    if (!group) return;
    
    const index = group.driverIds.indexOf(driverId);
    if (index === -1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= group.driverIds.length) return;
    
    const newDriverIds = [...group.driverIds];
    [newDriverIds[index], newDriverIds[newIndex]] = [newDriverIds[newIndex], newDriverIds[index]];
    
    const updatedGroups = model.groups.map(g =>
      g.id === groupId ? { ...g, driverIds: newDriverIds } : g
    );
    
    onModelUpdate({
      ...model,
      groups: updatedGroups,
      updatedAt: new Date().toISOString(),
    });
  }, [model, onModelUpdate]);
  
  const handleAddDriver = useCallback((groupId: string) => {
    const driverId = generateModelId('driver');
    const newDriver: Driver = {
      id: driverId,
      name: isEn ? 'New Driver' : 'Nouveau pilote',
      nameEn: 'New Driver',
      values: {},
      dataSource: 'manual',
      format: 'currency',
      decimals: 0,
    };
    
    const updatedGroups = model.groups.map(group =>
      group.id === groupId
        ? { ...group, driverIds: [...group.driverIds, driverId] }
        : group
    );
    
    onModelUpdate({
      ...model,
      drivers: { ...model.drivers, [driverId]: newDriver },
      groups: updatedGroups,
      updatedAt: new Date().toISOString(),
    });
  }, [model, onModelUpdate, isEn]);
  
  const handleAddGroup = useCallback((name?: string, nameEn?: string, driverNames?: string[]) => {
    const groupId = generateModelId('group');
    
    // Create drivers if provided
    const newDrivers: Record<string, Driver> = {};
    const driverIds: string[] = [];
    
    if (driverNames && driverNames.length > 0) {
      driverNames.forEach(driverName => {
        const driverId = generateModelId('driver');
        driverIds.push(driverId);
        newDrivers[driverId] = {
          id: driverId,
          name: driverName,
          nameEn: driverName,
          values: {},
          dataSource: 'manual',
          format: 'currency',
          decimals: 0,
        };
      });
    }
    
    const newGroup: DriverGroup = {
      id: groupId,
      name: name || (isEn ? 'New Group' : 'Nouveau groupe'),
      nameEn: nameEn || 'New Group',
      driverIds,
      collapsed: false,
      order: model.groups.length,
    };
    
    onModelUpdate({
      ...model,
      drivers: { ...model.drivers, ...newDrivers },
      groups: [...model.groups, newGroup],
      updatedAt: new Date().toISOString(),
    });
  }, [model, onModelUpdate, isEn]);
  
  const handleAddGroupFromTemplate = useCallback((templateKey: keyof typeof GROUP_TEMPLATES) => {
    const template = GROUP_TEMPLATES[templateKey];
    let updatedModel = { ...model };
    
    template.groups.forEach((groupTemplate, index) => {
      const groupId = generateModelId('group');
      
      // Create drivers for this group
      const newDrivers: Record<string, Driver> = {};
      const driverIds: string[] = [];
      
      groupTemplate.drivers.forEach(driverName => {
        const driverId = generateModelId('driver');
        driverIds.push(driverId);
        newDrivers[driverId] = {
          id: driverId,
          name: isEn ? driverName : driverName,
          nameEn: driverName,
          values: {},
          dataSource: 'manual',
          format: 'currency',
          decimals: 0,
        };
      });
      
      const newGroup: DriverGroup = {
        id: groupId,
        name: isEn ? groupTemplate.nameEn : groupTemplate.name,
        nameEn: groupTemplate.nameEn,
        driverIds,
        collapsed: false,
        order: updatedModel.groups.length,
      };
      
      updatedModel = {
        ...updatedModel,
        drivers: { ...updatedModel.drivers, ...newDrivers },
        groups: [...updatedModel.groups, newGroup],
      };
    });
    
    onModelUpdate({
      ...updatedModel,
      updatedAt: new Date().toISOString(),
    });
    setShowGroupDialog(false);
  }, [model, onModelUpdate, isEn]);
  
  const handleRenameGroup = useCallback((groupId: string, newName: string) => {
    const updatedGroups = model.groups.map(group =>
      group.id === groupId 
        ? { ...group, name: newName, nameEn: newName }
        : group
    );
    
    onModelUpdate({
      ...model,
      groups: updatedGroups,
      updatedAt: new Date().toISOString(),
    });
  }, [model, onModelUpdate]);
  
  const handleDeleteGroup = useCallback((groupId: string) => {
    const group = model.groups.find(g => g.id === groupId);
    if (!group) return;
    
    // Remove drivers from the group
    const updatedDrivers = { ...model.drivers };
    group.driverIds.forEach(driverId => {
      delete updatedDrivers[driverId];
    });
    
    const updatedGroups = model.groups.filter(g => g.id !== groupId);
    
    onModelUpdate({
      ...model,
      drivers: updatedDrivers,
      groups: updatedGroups,
      updatedAt: new Date().toISOString(),
    });
  }, [model, onModelUpdate]);
  
  const handleGroupToggle = useCallback((groupId: string) => {
    const updatedGroups = model.groups.map(group =>
      group.id === groupId ? { ...group, collapsed: !group.collapsed } : group
    );
    
    onModelUpdate({
      ...model,
      groups: updatedGroups,
      updatedAt: new Date().toISOString(),
    });
  }, [model, onModelUpdate]);
  
  const handleViewModeChange = useCallback((viewMode: ViewMode) => {
    onModelUpdate({
      ...model,
      viewMode,
      updatedAt: new Date().toISOString(),
    });
  }, [model, onModelUpdate]);
  
  const handleStartDateChange = useCallback((date: Date) => {
    onModelUpdate({
      ...model,
      timelineStart: date.toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }, [model, onModelUpdate]);
  
  const handleEndDateChange = useCallback((date: Date) => {
    onModelUpdate({
      ...model,
      timelineEnd: date.toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }, [model, onModelUpdate]);
  
  const handleAddPeriod = useCallback(() => {
    const newEndDate = new Date(endDate);
    if (model.viewMode === 'monthly') {
      newEndDate.setMonth(newEndDate.getMonth() + 1);
    } else {
      newEndDate.setMonth(newEndDate.getMonth() + 3);
    }
    onModelUpdate({
      ...model,
      timelineEnd: newEndDate.toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }, [model, endDate, onModelUpdate]);
  
  const handleRemovePeriod = useCallback(() => {
    if (periods.length <= 1) return; // Don't remove if only one period left
    
    const newEndDate = new Date(endDate);
    if (model.viewMode === 'monthly') {
      newEndDate.setMonth(newEndDate.getMonth() - 1);
    } else {
      newEndDate.setMonth(newEndDate.getMonth() - 3);
    }
    onModelUpdate({
      ...model,
      timelineEnd: newEndDate.toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }, [model, endDate, periods.length, onModelUpdate]);
  
  // Format period for display
  const formatPeriod = (periodKey: string): string => {
    if (periodKey.includes('Q')) {
      return periodKey.replace('-Q', ' Q');
    }
    const [year, month] = periodKey.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[parseInt(month) - 1]} '${year.slice(2)}`;
  };
  
  return (
    <div 
      className="rounded-lg border overflow-hidden shadow-sm"
      style={{ 
        backgroundColor: colors.bg.base,
        borderColor: colors.border.default,
      }}
    >
      <ScenarioManager model={model} onModelUpdate={onModelUpdate} isEn={isEn} />
      <div 
        className="overflow-auto"
        style={{ 
          backgroundColor: colors.bg.base,
      }}
    >
      {/* Timeline Header */}
      <TimelineHeader
        startDate={startDate}
        endDate={endDate}
        viewMode={model.viewMode}
        onViewModeChange={handleViewModeChange}
        onStartDateChange={handleStartDateChange}
        onEndDateChange={handleEndDateChange}
        onAddPeriod={handleAddPeriod}
        onRemovePeriod={handleRemovePeriod}
        canRemovePeriod={periods.length > 1}
      />
      
      {/* Table */}
      <div className="overflow-x-auto">
          <table 
          className="w-full"
          style={{ 
            borderCollapse: 'collapse',
            borderSpacing: 0,
            tableLayout: 'fixed',
            width: '100%',
            backgroundColor: colors.bg.base,
          }}
        >
          {/* Column Headers */}
          <thead>
            <tr>
              <th
                className="text-left uppercase"
                style={{
                  padding: '10px 8px',
                  borderBottom: `1px solid ${colors.border.default}`,
                  borderRight: `1px solid ${colors.border.default}`,
                  color: colors.text.muted,
                  width: '40px',
                  minWidth: '40px',
                  backgroundColor: colors.bg.header,
                  fontSize: '13px',
                  fontWeight: 600,
                  letterSpacing: '0.5px',
                }}
              >
                {/* Row selector column header */}
              </th>
              <ResizableColumn
                width={columnWidths.driver}
                minWidth={120}
                maxWidth={400}
                onResize={(newWidth) => handleColumnResize('driver', newWidth)}
                style={{
                  padding: '10px 12px',
                  borderBottom: `1px solid ${colors.border.default}`,
                  borderRight: `1px solid ${colors.border.default}`,
                  color: colors.text.muted,
                  backgroundColor: colors.bg.header,
                  fontSize: '13px',
                  fontWeight: 600,
                  letterSpacing: '0.5px',
                  textAlign: 'left',
                }}
              >
                <span className="uppercase">{isEn ? 'Driver' : 'Pilote'}</span>
              </ResizableColumn>
              <ResizableColumn
                width={columnWidths.formula}
                minWidth={200}
                maxWidth={600}
                onResize={(newWidth) => handleColumnResize('formula', newWidth)}
                style={{
                  padding: '10px 12px',
                  borderBottom: `1px solid ${colors.border.default}`,
                  borderRight: `1px solid ${colors.border.default}`,
                  color: colors.text.muted,
                  backgroundColor: colors.bg.header,
                  fontSize: '13px',
                  fontWeight: 600,
                  letterSpacing: '0.5px',
                  textAlign: 'left',
                }}
              >
                <span className="uppercase">{isEn ? 'Formula' : 'Formule'}</span>
              </ResizableColumn>
              {periods.map((periodKey) => {
                const isSelected = selectionManager.isColumnSelected(periodKey);
                return (
                  <ResizableColumn
                    key={periodKey}
                    width={columnWidths.period}
                    minWidth={80}
                    maxWidth={200}
                    onResize={(newWidth) => handleColumnResize('period', newWidth)}
                    style={{
                      padding: '10px 12px',
                      borderBottom: `1px solid ${colors.border.default}`,
                      borderRight: `1px solid ${colors.border.default}`,
                      color: colors.text.muted,
                      backgroundColor: isSelected ? '#EFF6FF' : colors.bg.header,
                      fontSize: '13px',
                      fontWeight: 600,
                      letterSpacing: '0.5px',
                      textAlign: 'right',
                      borderLeft: isSelected ? `2px solid ${colors.accent.primary}` : 'none',
                      borderRight: isSelected ? `2px solid ${colors.accent.primary}` : `1px solid ${colors.border.default}`,
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      className="uppercase select-none w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleColumnClick(periodKey, e);
                      }}
                      onMouseEnter={(e) => {
                        const th = e.currentTarget.closest('th');
                        if (th && !isSelected) {
                          th.style.backgroundColor = '#F3F4F6';
                        }
                      }}
                      onMouseLeave={(e) => {
                        const th = e.currentTarget.closest('th');
                        if (th && !isSelected) {
                          th.style.backgroundColor = colors.bg.header;
                        }
                      }}
                    >
                      {formatPeriod(periodKey)}
                    </div>
                  </ResizableColumn>
                );
              })}
            </tr>
          </thead>
          
          <tbody>
            {sortedGroups.map((group) => {
              const groupDrivers = group.driverIds
                .map(id => model.drivers[id])
                .filter(Boolean) as Driver[];
              
              return (
                <GroupSection
                  key={group.id}
                  group={group}
                  drivers={groupDrivers}
                  allDrivers={model.drivers}
                  periods={periods}
                  viewMode={model.viewMode}
                  model={model}
                  onModelUpdate={onModelUpdate}
                  columnWidths={columnWidths}
                  onGroupToggle={handleGroupToggle}
                  onAddDriver={(groupId) => {
                    // Add a driver to the specified group
                    const driverId = generateModelId('driver');
                    const newDriver: Driver = {
                      id: driverId,
                      name: isEn ? 'New Driver' : 'Nouveau pilote',
                      nameEn: 'New Driver',
                      values: {},
                      dataSource: 'manual',
                      format: 'currency',
                      decimals: 0,
                    };
                    const updatedGroups = model.groups.map(g =>
                      g.id === groupId
                        ? { ...g, driverIds: [...g.driverIds, driverId] }
                        : g
                    );
                    onModelUpdate({
                      ...model,
                      drivers: { ...model.drivers, [driverId]: newDriver },
                      groups: updatedGroups,
                      updatedAt: new Date().toISOString(),
                    });
                  }}
                  onDriverUpdate={handleDriverUpdate}
                  onDriverDelete={handleDriverDelete}
                  onDriverDuplicate={handleDriverDuplicate}
                  onDriverMove={handleDriverMove}
                  onRenameGroup={handleRenameGroup}
                  onDeleteGroup={handleDeleteGroup}
                  getAccountValue={getAccountValue}
                  currency={currency}
                  isEn={isEn}
                />
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Footer */}
      <div
        className="flex items-center"
        style={{
          padding: '8px 12px',
          borderTop: `1px solid ${colors.border.default}`,
          backgroundColor: colors.bg.muted,
        }}
      >
        <button
          onClick={() => setShowGroupDialog(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors"
          style={{
            backgroundColor: colors.accent.primary,
            color: '#FFFFFF',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#2563EB';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = colors.accent.primary;
          }}
        >
          <Plus className="w-3.5 h-3.5" />
          {isEn ? 'Create Group' : 'Créer un groupe'}
        </button>
      </div>
      
      {/* Create Group Dialog */}
      {showGroupDialog && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={() => setShowGroupDialog(false)}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {isEn ? 'Create Group' : 'Créer un groupe'}
              </h2>
              <button 
                onClick={() => setShowGroupDialog(false)}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {/* Custom Group */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  {isEn ? 'Custom Group' : 'Groupe personnalisé'}
                </h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customGroupName}
                    onChange={(e) => setCustomGroupName(e.target.value)}
                    placeholder={isEn ? 'Enter group name...' : 'Nom du groupe...'}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    style={{ color: colors.text.primary }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && customGroupName.trim()) {
                        handleAddGroup(customGroupName.trim(), customGroupName.trim());
                        setCustomGroupName('');
                        setShowGroupDialog(false);
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (customGroupName.trim()) {
                        handleAddGroup(customGroupName.trim(), customGroupName.trim());
                        setCustomGroupName('');
                        setShowGroupDialog(false);
                      }
                    }}
                    disabled={!customGroupName.trim()}
                    className="px-4 py-2 text-white rounded-lg text-sm font-medium disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    style={{
                      backgroundColor: !customGroupName.trim() 
                        ? 'rgb(var(--color-gray-300))' 
                        : 'rgb(var(--color-primary-500))',
                    }}
                    onMouseEnter={(e) => {
                      if (customGroupName.trim()) {
                        e.currentTarget.style.backgroundColor = 'rgb(var(--color-primary-600))';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (customGroupName.trim()) {
                        e.currentTarget.style.backgroundColor = 'rgb(var(--color-primary-500))';
                      }
                    }}
                  >
                    {isEn ? 'Create' : 'Créer'}
                  </button>
                </div>
              </div>
              
              {/* Industry Templates */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  {isEn ? 'Industry Templates' : 'Modèles par industrie'}
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  {isEn 
                    ? 'Select a template to add pre-configured groups with common financial drivers'
                    : 'Sélectionnez un modèle pour ajouter des groupes préconfigurés avec des pilotes financiers courants'
                  }
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(GROUP_TEMPLATES).map(([key, template]) => {
                    const IconComponent = template.icon;
                    return (
                      <button
                        key={key}
                        onClick={() => handleAddGroupFromTemplate(key as keyof typeof GROUP_TEMPLATES)}
                        className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all text-left group"
                      >
                        <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-blue-100 transition-colors">
                          <IconComponent className="w-5 h-5 text-gray-600 group-hover:text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-gray-900 group-hover:text-blue-700">
                            {isEn ? template.nameEn : template.name}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {template.groups.length} {isEn ? 'groups' : 'groupes'} • {template.groups.reduce((acc, g) => acc + g.drivers.length, 0)} {isEn ? 'drivers' : 'pilotes'}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Selection Operations Menu */}
      {showOperationsMenu && selection && (
        <SelectionOperations
          selection={selection}
          onCopy={handleCopy}
          onPaste={handlePaste}
          onDelete={handleClear}
          onFillDown={handleFillDown}
          onFillRight={handleFillRight}
          onDeleteColumn={sel.type === 'column' ? () => {
            if (sel.periodKey) {
              handleRemovePeriod();
            }
            setShowOperationsMenu(false);
          } : undefined}
          position={operationsMenuPos}
          onClose={() => setShowOperationsMenu(false)}
        />
      )}
      </div>
    </div>
  );
}

// Group Section Component
interface GroupSectionProps {
  group: DriverGroup;
  drivers: Driver[];
  allDrivers: Record<string, Driver>;
  periods: string[];
  viewMode: ViewMode;
  model: FinancialModel;
  onModelUpdate: (model: FinancialModel) => void;
  columnWidths: {
    driver: number;
    formula: number;
    period: number;
  };
  onGroupToggle: (groupId: string) => void;
  onAddDriver: (groupId: string) => void;
  onDriverUpdate: (driver: Driver) => void;
  onDriverDelete: (driverId: string) => void;
  onDriverDuplicate: (driver: Driver, groupId: string) => void;
  onDriverMove: (driverId: string, groupId: string, direction: 'up' | 'down') => void;
  onRenameGroup: (groupId: string, newName: string) => void;
  onDeleteGroup: (groupId: string) => void;
  getAccountValue?: (accountId: string, periodKey: string) => number | null;
  currency: string;
  isEn: boolean;
}

function GroupSection({
  group,
  drivers,
  allDrivers,
  periods,
  viewMode,
  model,
  onModelUpdate,
  columnWidths,
  onGroupToggle,
  onAddDriver,
  onDriverUpdate,
  onDriverDelete,
  onDriverDuplicate,
  onDriverMove,
  onRenameGroup,
  onDeleteGroup,
  getAccountValue,
  currency,
  isEn,
}: GroupSectionProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(isEn ? group.nameEn || group.name : group.name);
  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);
  
  const handleSaveRename = () => {
    if (editName.trim() && editName.trim() !== (isEn ? group.nameEn || group.name : group.name)) {
      onRenameGroup(group.id, editName.trim());
    }
    setIsEditing(false);
  };
  
  return (
    <>
      {/* Group Header Row */}
      <tr
        className="cursor-pointer select-none"
        style={{ backgroundColor: colors.bg.muted }}
        onClick={() => !isEditing && onGroupToggle(group.id)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <td
          colSpan={periods.length + 3}
          style={{
            padding: '6px 12px',
            borderBottom: `1px solid ${colors.border.default}`,
            backgroundColor: colors.bg.muted,
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="transition-transform duration-150" style={{
                display: 'inline-flex',
                transform: group.collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                transition: 'transform 150ms ease',
              }}>
                <ChevronDown className="w-4 h-4" style={{ color: colors.text.muted }} />
              </span>
              
              {isEditing ? (
                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  <input
                    ref={inputRef}
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveRename();
                      } else if (e.key === 'Escape') {
                        setEditName(isEn ? group.nameEn || group.name : group.name);
                        setIsEditing(false);
                      }
                    }}
                    onBlur={handleSaveRename}
                    className="px-2 py-0.5 border border-blue-400 rounded text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ 
                      color: colors.text.primary,
                      width: '200px',
                    }}
                  />
                </div>
              ) : (
                <>
                  <span
                    className="font-semibold"
                    style={{ 
                      color: '#374151',
                      fontSize: '14px',
                      fontWeight: 600,
                    }}
                  >
                    {isEn ? group.nameEn || group.name : group.name}
                  </span>
                  <span
                    className="text-xs"
                    style={{ 
                      color: colors.text.muted,
                      fontSize: '13px',
                    }}
                  >
                    {drivers.length} {isEn ? 'drivers' : 'pilotes'}
                  </span>
                </>
              )}
            </div>
            
            {/* Action buttons - visible on hover */}
            <div 
              className="flex items-center gap-1 transition-opacity"
              style={{ opacity: isHovered ? 1 : 0 }}
            >
              {/* Rename button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditName(isEn ? group.nameEn || group.name : group.name);
                  setIsEditing(true);
                }}
                className="p-1.5 rounded transition-all hover:bg-gray-200"
                title={isEn ? 'Rename group' : 'Renommer le groupe'}
              >
                <Pencil className="w-3.5 h-3.5" style={{ color: colors.text.muted }} />
              </button>
              
              {/* Add driver button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddDriver(group.id);
                }}
                className="p-1.5 rounded transition-all hover:bg-blue-100"
                title={isEn ? 'Add driver' : 'Ajouter un pilote'}
              >
                <Plus className="w-3.5 h-3.5" style={{ color: colors.accent.primary }} />
              </button>
              
              {/* Delete button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(isEn 
                    ? `Delete "${group.nameEn || group.name}" group and all its drivers?` 
                    : `Supprimer le groupe "${group.name}" et tous ses pilotes ?`
                  )) {
                    onDeleteGroup(group.id);
                  }
                }}
                className="p-1.5 rounded transition-all hover:bg-red-100"
                title={isEn ? 'Delete group' : 'Supprimer le groupe'}
              >
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
              </button>
            </div>
          </div>
        </td>
      </tr>
      
      {/* Driver Rows */}
      {!group.collapsed && drivers.map((driver, index) => (
        <DriverRow
          key={driver.id}
          driver={driver}
          periods={periods}
          viewMode={viewMode}
          allDrivers={allDrivers}
          model={model}
          columnWidths={columnWidths}
          onUpdate={onDriverUpdate}
          onDelete={onDriverDelete}
          onDuplicate={(d) => onDriverDuplicate(d, group.id)}
          onMoveUp={index > 0 ? () => onDriverMove(driver.id, group.id, 'up') : undefined}
          onMoveDown={index < drivers.length - 1 ? () => onDriverMove(driver.id, group.id, 'down') : undefined}
          onAddAbove={() => {
            const newDriverId = generateModelId('driver');
            const newDriver: Driver = {
              id: newDriverId,
              name: isEn ? 'New Driver' : 'Nouveau pilote',
              nameEn: 'New Driver',
              values: {},
              dataSource: 'manual',
              format: 'currency',
              decimals: 0,
            };
            const updatedGroups = model.groups.map(g =>
              g.id === group.id
                ? { ...g, driverIds: [
                    ...g.driverIds.slice(0, index),
                    newDriverId,
                    ...g.driverIds.slice(index)
                  ]}
                : g
            );
            onModelUpdate({
              ...model,
              drivers: { ...model.drivers, [newDriverId]: newDriver },
              groups: updatedGroups,
              updatedAt: new Date().toISOString(),
            });
          }}
          onAddBelow={() => {
            const newDriverId = generateModelId('driver');
            const newDriver: Driver = {
              id: newDriverId,
              name: isEn ? 'New Driver' : 'Nouveau pilote',
              nameEn: 'New Driver',
              values: {},
              dataSource: 'manual',
              format: 'currency',
              decimals: 0,
            };
            const updatedGroups = model.groups.map(g =>
              g.id === group.id
                ? { ...g, driverIds: [
                    ...g.driverIds.slice(0, index + 1),
                    newDriverId,
                    ...g.driverIds.slice(index + 1)
                  ]}
                : g
            );
            onModelUpdate({
              ...model,
              drivers: { ...model.drivers, [newDriverId]: newDriver },
              groups: updatedGroups,
              updatedAt: new Date().toISOString(),
            });
          }}
          getAccountValue={getAccountValue}
          currency={currency}
        />
      ))}
      
      {/* Empty state */}
      {!group.collapsed && drivers.length === 0 && (
        <tr>
          <td
            colSpan={periods.length + 3}
            className="text-center text-sm"
            style={{
              padding: '16px 12px',
              color: colors.text.muted,
              borderBottom: `1px solid ${colors.border.default}`,
            }}
          >
            {isEn ? 'No drivers yet. Click + to add one.' : 'Aucun pilote. Cliquez + pour ajouter.'}
          </td>
        </tr>
      )}
    </>
  );
}
