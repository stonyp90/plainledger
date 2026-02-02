/**
 * Chart Capture Hook
 * Captures chart visualizations as PNG images using html2canvas
 */

import { useRef, useCallback } from 'react';
import html2canvas from 'html2canvas';

export interface ChartCaptureOptions {
  /** Background color for the captured image (default: white) */
  backgroundColor?: string;
  /** Scale factor for higher quality images (default: 2) */
  scale?: number;
  /** Whether to include tooltips/overlays in the capture */
  includeOverlays?: boolean;
}

export function useChartCapture<T extends HTMLElement = HTMLDivElement>() {
  const chartRef = useRef<T>(null);

  /**
   * Capture the chart as a base64 PNG image
   */
  const capture = useCallback(
    async (options: ChartCaptureOptions = {}): Promise<string | null> => {
      if (!chartRef.current) {
        console.warn('Chart ref not available for capture');
        return null;
      }

      try {
        const canvas = await html2canvas(chartRef.current, {
          backgroundColor: options.backgroundColor || '#ffffff',
          scale: options.scale || 2,
          useCORS: true,
          logging: false,
          // Exclude tooltips and overlays unless explicitly included
          ignoreElements: (element) => {
            if (options.includeOverlays) return false;
            // Exclude elements with tooltip classes or absolute positioning that might overlay
            const className = element.className || '';
            return (
              typeof className === 'string' &&
              (className.includes('tooltip') ||
                className.includes('chart-tooltip') ||
                (element.style?.position === 'absolute' &&
                  element.style?.zIndex &&
                  parseInt(element.style.zIndex) > 100))
            );
          },
        });

        return canvas.toDataURL('image/png');
      } catch (error) {
        console.error('Failed to capture chart:', error);
        return null;
      }
    },
    [],
  );

  return {
    chartRef,
    capture,
  };
}
