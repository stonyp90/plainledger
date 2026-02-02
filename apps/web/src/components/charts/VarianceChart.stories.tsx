import type { Meta, StoryObj } from '@storybook/react';
import VarianceChart from './VarianceChart';

const meta: Meta<typeof VarianceChart> = {
  title: 'Charts/VarianceChart',
  component: VarianceChart,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    data: {
      description: 'Array of data points with current and prior values',
    },
    title: {
      description: 'Chart title',
    },
    showThresholdLines: {
      description: 'Show threshold lines for warnings',
      control: { type: 'boolean' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const mockData = [
  { label: 'Revenue', current: 120000, prior: 100000 },
  { label: 'Expenses', current: 85000, prior: 90000 },
  { label: 'Net Income', current: 35000, prior: 10000 },
  { label: 'COGS', current: 60000, prior: 55000 },
  { label: 'Marketing', current: 15000, prior: 20000 },
];

export const Default: Story = {
  args: {
    data: mockData,
    title: 'Variance Analysis',
    showThresholdLines: true,
  },
};

export const WithAnomalies: Story = {
  args: {
    data: [
      ...mockData,
      { label: 'R&D', current: 50000, prior: 20000 }, // Large variance
      { label: 'Sales', current: 95000, prior: 100000 }, // Negative variance
    ],
    title: 'Variance Analysis with Anomalies',
    showThresholdLines: true,
  },
};

export const WithoutThresholds: Story = {
  args: {
    data: mockData,
    title: 'Variance Analysis',
    showThresholdLines: false,
  },
};
