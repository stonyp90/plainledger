import type { Meta, StoryObj } from '@storybook/react';
import KPICard from './KPICard';

const meta: Meta<typeof KPICard> = {
  title: 'UI/KPICard',
  component: KPICard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    label: {
      description: 'KPI label',
    },
    value: {
      description: 'Current value',
      control: { type: 'number' },
    },
    previousValue: {
      description: 'Previous period value',
      control: { type: 'number' },
    },
    compact: {
      description: 'Compact mode',
      control: { type: 'boolean' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const mockSparklineData = [100, 105, 110, 108, 115, 120, 125, 130, 128, 135, 140, 145];

export const Default: Story = {
  args: {
    label: 'Monthly Recurring Revenue',
    value: 145000,
    previousValue: 120000,
    format: 'currency',
    sparklineData: mockSparklineData,
  },
};

export const WithVariance: Story = {
  args: {
    label: 'Net Profit Margin',
    value: 18.5,
    previousValue: 15.2,
    format: 'percentage',
    sparklineData: [12, 13, 14, 15, 16, 17, 18, 18.5],
    showVariance: true,
  },
};

export const Compact: Story = {
  args: {
    label: 'Active Users',
    value: 1250,
    previousValue: 1100,
    format: 'number',
    compact: true,
    sparklineData: mockSparklineData,
  },
};

export const WithBenchmark: Story = {
  args: {
    label: 'Customer Acquisition Cost',
    value: 45,
    previousValue: 50,
    format: 'currency',
    benchmarkValue: 60,
    sparklineData: mockSparklineData,
    benchmarkData: Array(12).fill(60),
  },
};

export const NegativeVariance: Story = {
  args: {
    label: 'Churn Rate',
    value: 2.5,
    previousValue: 3.0,
    format: 'percentage',
    sparklineData: [3.5, 3.2, 3.0, 2.8, 2.5],
  },
};
