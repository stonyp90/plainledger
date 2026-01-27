/**
 * Model Spreadsheet Component - Runway-style Design
 * 
 * Professional financial model spreadsheet with:
 * - Compact, data-dense table layout
 * - Clean visual hierarchy
 * - Smooth interactions
 */

import { useState, useMemo, useCallback } from 'react';
import { Plus, ChevronDown, ChevronRight } from 'lucide-react';
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
  
  const startDate = useMemo(() => new Date(model.timelineStart), [model.timelineStart]);
  const endDate = useMemo(() => new Date(model.timelineEnd), [model.timelineEnd]);
  
  const periods = useMemo(() => {
    return generatePeriodKeys(startDate, endDate, model.viewMode);
  }, [startDate, endDate, model.viewMode]);
  
  const sortedGroups = useMemo(() => {
    return [...model.groups].sort((a, b) => a.order - b.order);
  }, [model.groups]);
  
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
  
  const handleAddGroup = useCallback(() => {
    const groupId = generateModelId('group');
    const newGroup: DriverGroup = {
      id: groupId,
      name: isEn ? 'New Group' : 'Nouveau groupe',
      nameEn: 'New Group',
      driverIds: [],
      collapsed: false,
      order: model.groups.length,
    };
    
    onModelUpdate({
      ...model,
      groups: [...model.groups, newGroup],
      updatedAt: new Date().toISOString(),
    });
  }, [model, onModelUpdate, isEn]);
  
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
      {/* Timeline Header */}
      <TimelineHeader
        startDate={startDate}
        endDate={endDate}
        viewMode={model.viewMode}
        onViewModeChange={handleViewModeChange}
        onStartDateChange={handleStartDateChange}
        onEndDateChange={handleEndDateChange}
      />
      
      {/* Table */}
      <div className="overflow-x-auto">
        <table 
          className="w-full"
          style={{ 
            borderCollapse: 'separate',
            borderSpacing: 0,
            tableLayout: 'fixed',
          }}
        >
          {/* Column Headers */}
          <thead>
            <tr>
              <th
                className="text-left text-xs font-semibold uppercase tracking-wider"
                style={{
                  padding: '8px 10px',
                  borderBottom: `1px solid ${colors.border.default}`,
                  borderRight: `1px solid ${colors.border.default}`,
                  color: colors.text.muted,
                  width: '200px',
                  minWidth: '200px',
                  backgroundColor: colors.bg.header,
                }}
              >
                {isEn ? 'Driver' : 'Pilote'}
              </th>
              <th
                className="text-left text-xs font-semibold uppercase tracking-wider"
                style={{
                  padding: '8px 10px',
                  borderBottom: `1px solid ${colors.border.default}`,
                  borderRight: `1px solid ${colors.border.default}`,
                  color: colors.text.muted,
                  width: '280px',
                  minWidth: '280px',
                  maxWidth: '350px',
                  backgroundColor: colors.bg.header,
                }}
              >
                {isEn ? 'Formula' : 'Formule'}
              </th>
              {periods.map((periodKey) => (
                <th
                  key={periodKey}
                  className="text-right text-xs font-semibold uppercase tracking-wider"
                  style={{
                    padding: '8px 10px',
                    borderBottom: `1px solid ${colors.border.default}`,
                    borderRight: `1px solid ${colors.border.default}`,
                    color: colors.text.muted,
                    width: '110px',
                    minWidth: '110px',
                    backgroundColor: colors.bg.header,
                  }}
                >
                  {formatPeriod(periodKey)}
                </th>
              ))}
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
                  onGroupToggle={handleGroupToggle}
                  onAddDriver={handleAddDriver}
                  onDriverUpdate={handleDriverUpdate}
                  onDriverDelete={handleDriverDelete}
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
          onClick={handleAddGroup}
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
  onGroupToggle: (groupId: string) => void;
  onAddDriver: (groupId: string) => void;
  onDriverUpdate: (driver: Driver) => void;
  onDriverDelete: (driverId: string) => void;
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
  onGroupToggle,
  onAddDriver,
  onDriverUpdate,
  onDriverDelete,
  getAccountValue,
  currency,
  isEn,
}: GroupSectionProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <>
      {/* Group Header Row */}
      <tr
        className="cursor-pointer select-none"
        style={{ backgroundColor: colors.bg.muted }}
        onClick={() => onGroupToggle(group.id)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <td
          colSpan={periods.length + 2}
          style={{
            padding: '6px 10px',
            borderBottom: `1px solid ${colors.border.default}`,
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="transition-transform duration-150" style={{
                display: 'inline-flex',
                transform: group.collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
              }}>
                <ChevronDown className="w-4 h-4" style={{ color: colors.text.muted }} />
              </span>
              <span
                className="text-xs font-semibold"
                style={{ color: colors.text.secondary }}
              >
                {isEn ? group.nameEn || group.name : group.name}
              </span>
              <span
                className="text-xs"
                style={{ color: colors.text.muted }}
              >
                {drivers.length} {isEn ? 'drivers' : 'pilotes'}
              </span>
            </div>
            
            {/* Add driver button - visible on hover */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddDriver(group.id);
              }}
              className="p-1 rounded transition-all"
              style={{
                opacity: isHovered ? 1 : 0,
                backgroundColor: 'transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.bg.header;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Plus className="w-4 h-4" style={{ color: colors.accent.primary }} />
            </button>
          </div>
        </td>
      </tr>
      
      {/* Driver Rows */}
      {!group.collapsed && drivers.map((driver) => (
        <DriverRow
          key={driver.id}
          driver={driver}
          periods={periods}
          viewMode={viewMode}
          allDrivers={allDrivers}
          onUpdate={onDriverUpdate}
          onDelete={onDriverDelete}
          getAccountValue={getAccountValue}
          currency={currency}
        />
      ))}
      
      {/* Empty state */}
      {!group.collapsed && drivers.length === 0 && (
        <tr>
          <td
            colSpan={periods.length + 2}
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
