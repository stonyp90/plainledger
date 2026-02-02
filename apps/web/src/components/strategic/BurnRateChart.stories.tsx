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

const mockData = {
  monthlyBurn: [50000, 52000, 48000, 55000, 53000],
  runway: 8.5,
  totalCash: 450000,
};

export const Default: Story = {
  args: {
    data: mockData,
  },
};
