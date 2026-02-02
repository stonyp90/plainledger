import type { Meta, StoryObj } from '@storybook/react';
import TrendChart from './TrendChart';
import { FinancialDataPoint } from '../../lib/anomalyDetection';

const meta: Meta<typeof TrendChart> = {
  title: 'Charts/TrendChart',
  component: TrendChart,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    data: {
      description: 'Array of financial data points',
    },
    title: {
      description: 'Chart title',
    },
    height: {
      description: 'Chart height in pixels',
      control: { type: 'number' },
    },
    compact: {
      description: 'Compact mode for smaller containers',
      control: { type: 'boolean' },
    },
    ibcsMode: {
      description: 'Enable IBCS-compliant display',
      control: { type: 'boolean' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Mock data generator
const generateMockData = (months: number = 12): FinancialDataPoint[] => {
  const data: FinancialDataPoint[] = [];
  const baseValue = 100000;
  const now = new Date();
  
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setMonth(date.getMonth() - i);
    
    // Add some variance
    const variance = (Math.random() - 0.5) * 0.2;
    const value = baseValue * (1 + variance + (i / months) * 0.1);
    
    data.push({
      date: date.toISOString(),
      value,
      label: date.toLocaleDateString('en-CA', { month: 'short', year: 'numeric' }),
    });
  }
  
  return data;
};

export const Default: Story = {
  args: {
    data: generateMockData(12),
    title: 'Revenue Trend',
    height: 400,
  },
};

export const WithPlanAndForecast: Story = {
  args: {
    data: generateMockData(12),
    title: 'Revenue vs Plan',
    planData: Array(12).fill(0).map((_, i) => 100000 + i * 5000),
    forecastData: Array(6).fill(0).map((_, i) => 155000 + i * 3000),
    showVarianceShading: true,
    showIBCSLegend: true,
    ibcsMode: true,
    height: 400,
  },
};

export const Compact: Story = {
  args: {
    data: generateMockData(6),
    title: 'Monthly Revenue',
    compact: true,
    height: 250,
  },
};

export const WithAnomalies: Story = {
  args: {
    data: [
      ...generateMockData(8),
      {
        date: new Date().toISOString(),
        value: 50000, // Anomaly - much lower
        label: 'Current',
      },
    ],
    title: 'Revenue with Anomaly Detection',
    showThresholdBands: true,
    height: 400,
  },
};

export const BilingualFrench: Story = {
  args: {
    data: generateMockData(12),
    title: 'Tendance des revenus',
    titleEn: 'Revenue Trend',
    subtitle: 'Données mensuelles',
    subtitleEn: 'Monthly data',
    isEn: false,
    height: 400,
  },
};
