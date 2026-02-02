/**
 * Dashboard Configuration Hook
 * 
 * React hook for managing dashboard widget configuration.
 * Provides state management and localStorage synchronization.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTenant } from '../contexts/TenantContext';
import {
  dashboardConfigService,
  DashboardWidgetConfig,
  DashboardConfig,
} from '../lib/dashboardConfig';

export function useDashboardConfig() {
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.id || 'default';
  
  const [config, setConfig] = useState<DashboardConfig>(() => 
    dashboardConfigService.getConfig(tenantId)
  );
  
  const [isLoading, setIsLoading] = useState(false);

  // Load config when tenant changes
  useEffect(() => {
    const loaded = dashboardConfigService.getConfig(tenantId);
    setConfig(loaded);
  }, [tenantId]);

  // Get visible widgets in order
  const widgets = config.widgets
    .filter(w => w.visible)
    .sort((a, b) => a.position - b.position);

  // Add a widget
  const addWidget = useCallback((widget: DashboardWidgetConfig) => {
    setIsLoading(true);
    try {
      dashboardConfigService.addWidget(tenantId, widget);
      const updated = dashboardConfigService.getConfig(tenantId);
      setConfig(updated);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  // Remove a widget (hide it)
  const removeWidget = useCallback((widgetId: string) => {
    setIsLoading(true);
    try {
      dashboardConfigService.removeWidget(tenantId, widgetId);
      const updated = dashboardConfigService.getConfig(tenantId);
      setConfig(updated);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  // Reorder widgets
  const reorderWidgets = useCallback((widgetIds: string[]) => {
    setIsLoading(true);
    try {
      dashboardConfigService.reorderWidgets(tenantId, widgetIds);
      const updated = dashboardConfigService.getConfig(tenantId);
      setConfig(updated);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  // Update widget size
  const updateWidgetSize = useCallback((
    widgetId: string, 
    size: { 
      customHeight?: number; 
      customWidth?: number | 'auto'; 
      lockSize?: boolean;
      gridSpan?: 1 | 2 | 3;
    }
  ) => {
    dashboardConfigService.updateWidgetSize(tenantId, widgetId, size);
    const updated = dashboardConfigService.getConfig(tenantId);
    setConfig(updated);
  }, [tenantId]);

  // Toggle size lock
  const toggleSizeLock = useCallback((widgetId: string): boolean => {
    const locked = dashboardConfigService.toggleSizeLock(tenantId, widgetId);
    const updated = dashboardConfigService.getConfig(tenantId);
    setConfig(updated);
    return locked;
  }, [tenantId]);

  // Reset widget size
  const resetWidgetSize = useCallback((widgetId: string) => {
    dashboardConfigService.resetWidgetSize(tenantId, widgetId);
    const updated = dashboardConfigService.getConfig(tenantId);
    setConfig(updated);
  }, [tenantId]);

  // Lock/unlock dashboard customization
  const setDashboardLock = useCallback((locked: boolean) => {
    dashboardConfigService.setDashboardLock(tenantId, locked);
    const updated = dashboardConfigService.getConfig(tenantId);
    setConfig(updated);
  }, [tenantId]);

  // Toggle dashboard lock
  const toggleDashboardLock = useCallback((): boolean => {
    const locked = dashboardConfigService.toggleDashboardLock(tenantId);
    const updated = dashboardConfigService.getConfig(tenantId);
    setConfig(updated);
    return locked;
  }, [tenantId]);

  // Check if dashboard is locked
  const isDashboardLocked = config.locked ?? false;

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setIsLoading(true);
    try {
      dashboardConfigService.resetToDefaults(tenantId);
      const updated = dashboardConfigService.getDefaultConfig();
      setConfig(updated);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  // Get widget by ID
  const getWidget = useCallback((widgetId: string): DashboardWidgetConfig | undefined => {
    return config.widgets.find(w => w.id === widgetId);
  }, [config]);

  // Check if widget is visible
  const isWidgetVisible = useCallback((widgetId: string): boolean => {
    const widget = config.widgets.find(w => w.id === widgetId);
    return widget?.visible ?? false;
  }, [config]);

  return {
    widgets,
    config,
    isLoading,
    isDashboardLocked,
    addWidget,
    removeWidget,
    reorderWidgets,
    updateWidgetSize,
    toggleSizeLock,
    resetWidgetSize,
    setDashboardLock,
    toggleDashboardLock,
    resetToDefaults,
    getWidget,
    isWidgetVisible,
  };
}