/**
 * Dashboard Configuration Service
 * 
 * Manages dashboard widget visibility, ordering, and customization.
 * Persists configuration to localStorage per tenant.
 */

// =====================================================
// TYPES
// =====================================================

export type WidgetType = 
  | 'kpi-row'
  | 'alert'
  | 'collapsible'
  | 'chart'
  | 'actions'
  | 'custom-chart';

export interface DashboardWidgetConfig {
  id: string;
  type: WidgetType;
  visible: boolean;
  position: number;
  size?: 'small' | 'medium' | 'large' | 'full';
  
  // Custom sizing - overrides auto-sizing
  customHeight?: number; // in pixels
  customWidth?: number | 'auto'; // in pixels or 'auto'
  lockSize?: boolean; // if true, don't auto-resize based on content
  
  // Grid span for flexible layouts
  gridSpan?: 1 | 2 | 3; // number of columns to span (out of 3)
  
  // For custom charts added by users
  chartConfig?: {
    chartType: string;
    metrics: string[];
    timeRange: string;
    name: string;
    nameEn: string;
  };
}

export interface DashboardConfig {
  widgets: DashboardWidgetConfig[];
  version: number; // For future migrations
  
  /** Lock dashboard - prevents resizing, moving, and removing widgets */
  locked?: boolean;
}

// =====================================================
// DEFAULT WIDGETS CONFIGURATION
// =====================================================

export const DEFAULT_WIDGETS: DashboardWidgetConfig[] = [
  {
    id: 'period-summary',
    type: 'kpi-row',
    visible: true,
    position: 1,
    size: 'full',
  },
  {
    id: 'anomalies',
    type: 'alert',
    visible: true,
    position: 2,
    size: 'full',
  },
  {
    id: 'industry-benchmarks',
    type: 'collapsible',
    visible: true,
    position: 3,
    size: 'full',
  },
  {
    id: 'revenue-chart',
    type: 'chart',
    visible: true,
    position: 4,
    size: 'half',
  },
  {
    id: 'cashflow-chart',
    type: 'chart',
    visible: true,
    position: 5,
    size: 'half',
  },
  {
    id: 'cashflow-waterfall',
    type: 'chart',
    visible: true,
    position: 6,
    size: 'full',
  },
  {
    id: 'accounting-details',
    type: 'collapsible',
    visible: true,
    position: 7,
    size: 'full',
  },
  {
    id: 'quick-actions',
    type: 'actions',
    visible: true,
    position: 8,
    size: 'full',
  },
];

// =====================================================
// SERVICE
// =====================================================

class DashboardConfigService {
  private getStorageKey(tenantId: string): string {
    return `plainledger:dashboard-config:${tenantId}`;
  }

  /**
   * Get dashboard configuration for a tenant
   */
  getConfig(tenantId: string): DashboardConfig {
    try {
      const key = this.getStorageKey(tenantId);
      const stored = localStorage.getItem(key);
      if (!stored) {
        return this.getDefaultConfig();
      }
      const config = JSON.parse(stored) as DashboardConfig;
      // Merge with defaults to handle new widgets
      return this.mergeWithDefaults(config);
    } catch (error) {
      console.error('Failed to load dashboard config:', error);
      return this.getDefaultConfig();
    }
  }

  /**
   * Save dashboard configuration for a tenant
   */
  saveConfig(tenantId: string, config: DashboardConfig): void {
    try {
      const key = this.getStorageKey(tenantId);
      localStorage.setItem(key, JSON.stringify(config));
    } catch (error) {
      console.error('Failed to save dashboard config:', error);
    }
  }

  /**
   * Get default configuration
   */
  getDefaultConfig(): DashboardConfig {
    return {
      widgets: [...DEFAULT_WIDGETS],
      version: 1,
    };
  }

  /**
   * Merge stored config with defaults (handles new widgets)
   */
  private mergeWithDefaults(stored: DashboardConfig): DashboardConfig {
    const defaultWidgets = new Map(DEFAULT_WIDGETS.map(w => [w.id, w]));
    const storedWidgets = new Map(stored.widgets.map(w => [w.id, w]));
    
    // Start with defaults
    const merged: DashboardWidgetConfig[] = [];
    
    // Add all default widgets (preserving custom position/visibility)
    DEFAULT_WIDGETS.forEach(defaultWidget => {
      const stored = storedWidgets.get(defaultWidget.id);
      if (stored) {
        merged.push({ ...defaultWidget, ...stored });
      } else {
        merged.push({ ...defaultWidget });
      }
    });
    
    // Add any custom widgets that aren't in defaults
    stored.widgets.forEach(widget => {
      if (!defaultWidgets.has(widget.id)) {
        merged.push(widget);
      }
    });
    
    // Sort by position
    merged.sort((a, b) => a.position - b.position);
    
    return {
      widgets: merged,
      version: stored.version || 1,
    };
  }

  /**
   * Add a custom widget
   */
  addWidget(tenantId: string, widget: DashboardWidgetConfig): void {
    const config = this.getConfig(tenantId);
    const maxPosition = Math.max(...config.widgets.map(w => w.position), 0);
    const newWidget: DashboardWidgetConfig = {
      ...widget,
      position: maxPosition + 1,
      visible: true,
    };
    config.widgets.push(newWidget);
    this.saveConfig(tenantId, config);
  }

  /**
   * Remove a widget (hide it)
   */
  removeWidget(tenantId: string, widgetId: string): void {
    const config = this.getConfig(tenantId);
    const widget = config.widgets.find(w => w.id === widgetId);
    if (widget) {
      widget.visible = false;
      this.saveConfig(tenantId, config);
    }
  }

  /**
   * Reorder widgets
   */
  reorderWidgets(tenantId: string, widgetIds: string[]): void {
    const config = this.getConfig(tenantId);
    const widgetMap = new Map(config.widgets.map(w => [w.id, w]));
    
    // Update positions based on new order
    widgetIds.forEach((id, index) => {
      const widget = widgetMap.get(id);
      if (widget) {
        widget.position = index + 1;
      }
    });
    
    // Sort widgets by new position
    config.widgets.sort((a, b) => a.position - b.position);
    this.saveConfig(tenantId, config);
  }

  /**
   * Reset to default configuration
   */
  resetToDefaults(tenantId: string): void {
    const defaultConfig = this.getDefaultConfig();
    this.saveConfig(tenantId, defaultConfig);
  }

  /**
   * Get visible widgets in order
   */
  getVisibleWidgets(tenantId: string): DashboardWidgetConfig[] {
    const config = this.getConfig(tenantId);
    return config.widgets
      .filter(w => w.visible)
      .sort((a, b) => a.position - b.position);
  }

  /**
   * Check if a widget exists
   */
  hasWidget(tenantId: string, widgetId: string): boolean {
    const config = this.getConfig(tenantId);
    return config.widgets.some(w => w.id === widgetId);
  }

  /**
   * Update widget size (custom height/width)
   */
  updateWidgetSize(
    tenantId: string, 
    widgetId: string, 
    size: { 
      customHeight?: number; 
      customWidth?: number | 'auto'; 
      lockSize?: boolean;
      gridSpan?: 1 | 2 | 3;
    }
  ): void {
    const config = this.getConfig(tenantId);
    const widget = config.widgets.find(w => w.id === widgetId);
    if (widget) {
      if (size.customHeight !== undefined) widget.customHeight = size.customHeight;
      if (size.customWidth !== undefined) widget.customWidth = size.customWidth;
      if (size.lockSize !== undefined) widget.lockSize = size.lockSize;
      if (size.gridSpan !== undefined) widget.gridSpan = size.gridSpan;
      this.saveConfig(tenantId, config);
    }
  }

  /**
   * Toggle size lock for a widget
   */
  toggleSizeLock(tenantId: string, widgetId: string): boolean {
    const config = this.getConfig(tenantId);
    const widget = config.widgets.find(w => w.id === widgetId);
    if (widget) {
      widget.lockSize = !widget.lockSize;
      this.saveConfig(tenantId, config);
      return widget.lockSize;
    }
    return false;
  }

  /**
   * Reset widget to default size
   */
  resetWidgetSize(tenantId: string, widgetId: string): void {
    const config = this.getConfig(tenantId);
    const widget = config.widgets.find(w => w.id === widgetId);
    if (widget) {
      delete widget.customHeight;
      delete widget.customWidth;
      widget.lockSize = false;
      delete widget.gridSpan;
      this.saveConfig(tenantId, config);
    }
  }

  /**
   * Lock/unlock dashboard customization
   */
  setDashboardLock(tenantId: string, locked: boolean): void {
    const config = this.getConfig(tenantId);
    config.locked = locked;
    this.saveConfig(tenantId, config);
  }

  /**
   * Toggle dashboard lock
   */
  toggleDashboardLock(tenantId: string): boolean {
    const config = this.getConfig(tenantId);
    config.locked = !config.locked;
    this.saveConfig(tenantId, config);
    return config.locked ?? false;
  }

  /**
   * Check if dashboard is locked
   */
  isDashboardLocked(tenantId: string): boolean {
    const config = this.getConfig(tenantId);
    return config.locked ?? false;
  }
}

export const dashboardConfigService = new DashboardConfigService();