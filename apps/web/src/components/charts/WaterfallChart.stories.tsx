import type { Meta, StoryObj } from '@storybook/react';
import WaterfallChart from './WaterfallChart';

const meta: Meta<typeof WaterfallChart> = {
  title: 'Charts/WaterfallChart',
  component: WaterfallChart,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const mockCashFlowData = [
  { label: 'Starting Balance', value: 50000, type: 'start' as const },
  { label: 'Revenue', value: 120000, type: 'increase' as const },
  { label: 'Operating Expenses', value: -80000, type: 'decrease' as const },
  { label: 'Subtotal', value: 90000, type: 'subtotal' as const },
  { label: 'Investments', value: -20000, type: 'decrease' as const },
  { label: 'Ending Balance', value: 70000, type: 'end' as const },
];

export const Default: Story = {
  args: {
    data: mockCashFlowData,
    title: 'Cash Flow Waterfall',
    height: 400,
  },
};

export const WithPlanValues: Story = {
  args: {
    data: mockCashFlowData.map((item, idx) => ({
      ...item,
      planValue: item.value * (idx % 2 === 0 ? 1.1 : 0.9),
    })),
    title: 'Cash Flow vs Plan',
    ibcsMode: true,
    showIBCSLegend: true,
    height: 400,
  },
};
