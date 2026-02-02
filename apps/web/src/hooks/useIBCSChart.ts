/**
 * useIBCSChart Hook
 * 
 * Hook for unified IBCS chart configuration and multi-data-source support.
 * Provides helpers for managing multiple data sources, calculating variances,
 * and formatting labels.
 * 
 * Features:
 * - Multi-data source management
 * - Automatic variance calculations
 * - Bilingual label handling
 * - IBCS compliance helpers
 */

import { useMemo } from 'react';
import { useI18n } from '../lib/i18n';
import { 
  calculateVariance, 
  calculateVariances,
  type VarianceResult,
  type IBCSMetricType,
} from '../lib/ibcs';
import { 
  useChartLabels, 
  useChartAccessibility,
  type ChartDataSource,
  type ChartLabels,
  type IBCSChartConfig,
} from '../lib/chartConfig';

/**
 * Hook for managing IBCS chart configuration
 */
export function useIBCSChart(config: IBCSChartConfig) {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  // Get bilingual labels
  const labels = useChartLabels(config.labels);
  const accessibility = useChartAccessibility(config.accessibility);
  
  // Filter visible data sources
  const visibleDataSources = useMemo(() => {
    return config.dataSources.filter(ds => ds.visible !== false);
  }, [config.dataSources]);
  
  // Find primary data sources (actual and plan)
  const actualDataSource = useMemo(() => {
    return visibleDataSources.find(ds => ds.scenario === 'actual');
  }, [visibleDataSources]);
  
  const planDataSource = useMemo(() => {
    return visibleDataSources.find(ds => ds.scenario === 'plan');
  }, [visibleDataSources]);
  
  const forecastDataSource = useMemo(() => {
    return visibleDataSources.find(ds => ds.scenario === 'forecast');
  }, [visibleDataSources]);
  
  const priorYearDataSource = useMemo(() => {
    return visibleDataSources.find(ds => ds.scenario === 'priorYear');
  }, [visibleDataSources]);
  
  // Calculate variances if we have actual and plan
  const variances = useMemo<VarianceResult[] | null>(() => {
    if (!actualDataSource || !planDataSource) {
      return null;
    }
    
    if (actualDataSource.data.length !== planDataSource.data.length) {
      return null;
    }
    
    return actualDataSource.data.map((actual, index) => {
      const plan = planDataSource.data[index];
      return calculateVariance(actual, plan, config.metricType);
    });
  }, [actualDataSource, planDataSource, config.metricType]);
  
  // Get data source by ID
  const getDataSource = useMemo(() => {
    return (id: string): ChartDataSource | undefined => {
      return config.dataSources.find(ds => ds.id === id);
    };
  }, [config.dataSources]);
  
  // Get data source label (bilingual)
  const getDataSourceLabel = useMemo(() => {
    return (id: string): string => {
      const ds = getDataSource(id);
      if (!ds) return '';
      return isEn && ds.nameEn ? ds.nameEn : ds.name;
    };
  }, [getDataSource, isEn]);
  
  // Check if variance pins should be shown
  const shouldShowVariancePins = config.ibcsMode && config.showVariancePins && variances !== null;
  
  // Get max value across all visible data sources (for scaling)
  const maxValue = useMemo(() => {
    return Math.max(
      ...visibleDataSources.flatMap(ds => ds.data),
      0
    );
  }, [visibleDataSources]);
  
  // Get min value across all visible data sources (for scaling)
  const minValue = useMemo(() => {
    const allValues = visibleDataSources.flatMap(ds => ds.data);
    return Math.min(...allValues, 0);
  }, [visibleDataSources]);
  
  return {
    // Labels and accessibility
    labels,
    accessibility,
    
    // Data sources
    visibleDataSources,
    actualDataSource,
    planDataSource,
    forecastDataSource,
    priorYearDataSource,
    
    // Variances
    variances,
    shouldShowVariancePins,
    
    // Helpers
    getDataSource,
    getDataSourceLabel,
    
    // Scaling
    maxValue,
    minValue,
    
    // Config flags
    ibcsMode: config.ibcsMode,
    showLegend: config.showLegend,
    showBenchmark: config.showBenchmark,
    metricType: config.metricType,
  };
}

/**
 * Hook for creating IBCS chart configuration from raw data
 */
export function useCreateIBCSConfig(options: {
  title: string;
  titleEn?: string;
  dataSources: ChartDataSource[];
  metricType?: IBCSMetricType;
  showBenchmark?: boolean;
}): IBCSChartConfig {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  return useMemo(() => ({
    dataSources: options.dataSources,
    labels: {
      title: options.title,
      titleEn: options.titleEn,
    },
    ibcsMode: true,
    showVariancePins: true,
    showLegend: true,
    showBenchmark: options.showBenchmark ?? false,
    metricType: options.metricType || 'revenue',
    accessibility: {
      ariaLabel: options.title,
      ariaLabelEn: options.titleEn,
      description: isEn 
        ? `Chart showing ${options.title.toLowerCase()}`
        : `Graphique montrant ${options.title.toLowerCase()}`,
      descriptionEn: options.titleEn 
        ? `Chart showing ${options.titleEn.toLowerCase()}`
        : undefined,
    },
  }), [options, isEn]);
}
