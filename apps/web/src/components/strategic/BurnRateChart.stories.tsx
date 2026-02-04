import type { Meta, StoryObj } from '@storybook/react';
import BurnRateChart from './BurnRateChart';

const meta: Meta<typeof BurnRateChart> = {
  title: 'Strategic/BurnRateChart',
  component: BurnRateChart,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

// Generate mock historical data
const generateHistoricalData = () => {
  const data = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now);
    date.setMonth(date.getMonth() - i);
    data.push({
      date: date.toISOString(),
      grossBurn: 55000 + Math.random() * 10000,
      netBurn: -45000 - Math.random() * 8000,
      revenue: 10000 + Math.random() * 5000,
      expenses: 55000 + Math.random() * 10000,
      isProjected: false,
    });
  }
  return data;
};

// Generate mock projected data
const generateProjectedData = () => {
  const data = [];
  const now = new Date();
  for (let i = 1; i <= 6; i++) {
    const date = new Date(now);
    date.setMonth(date.getMonth() + i);
    data.push({
      date: date.toISOString(),
      grossBurn: 50000 + Math.random() * 8000,
      netBurn: -40000 - Math.random() * 6000,
      revenue: 12000 + Math.random() * 6000,
      expenses: 50000 + Math.random() * 8000,
      isProjected: true,
    });
  }
  return data;
};

export const Default: Story = {
  args: {
    historical: generateHistoricalData(),
    projected: generateProjectedData(),
  },
};

export const HistoricalOnly: Story = {
  args: {
    historical: generateHistoricalData(),
    projected: [],
  },
};

export const ProjectedOnly: Story = {
  args: {
    historical: [],
    projected: generateProjectedData(),
  },
};
