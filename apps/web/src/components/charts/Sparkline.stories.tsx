import type { Meta, StoryObj } from '@storybook/react';
import Sparkline from './Sparkline';

const meta: Meta<typeof Sparkline> = {
  title: 'Charts/Sparkline',
  component: Sparkline,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const mockData = [100, 105, 110, 108, 115, 120, 125, 130, 128, 135, 140, 145];

export const Default: Story = {
  args: {
    data: mockData,
  },
};

export const WithTrend: Story = {
  args: {
    data: mockData,
    showTrend: true,
    showValue: true,
    showChange: true,
  },
};

export const WithAnomalies: Story = {
  args: {
    data: [...mockData, 50, 60], // Anomalies at the end
    highlightAnomalies: true,
    showTrend: true,
  },
};

export const CustomSize: Story = {
  args: {
    data: mockData,
    width: 120,
    height: 40,
    showTrend: true,
  },
};
