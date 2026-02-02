import type { Meta, StoryObj } from '@storybook/react';
import BudgetVsActualChart from './BudgetVsActualChart';

const meta: Meta<typeof BudgetVsActualChart> = {
  title: 'Charts/BudgetVsActualChart',
  component: BudgetVsActualChart,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const mockBudgetData = [
  { category: 'Revenue', actual: 120000, budget: 100000, isRevenue: true },
  { category: 'COGS', actual: 60000, budget: 55000, isRevenue: false },
  { category: 'Marketing', actual: 15000, budget: 20000, isRevenue: false },
  { category: 'R&D', actual: 25000, budget: 30000, isRevenue: false },
  { category: 'Operations', actual: 20000, budget: 18000, isRevenue: false },
];

export const Default: Story = {
  args: {
    data: mockBudgetData,
    title: 'Budget vs Actual',
    height: 400,
  },
};

export const WithPriorYear: Story = {
  args: {
    data: mockBudgetData.map(item => ({
      ...item,
      priorYear: item.budget * 0.9,
    })),
    title: 'Budget vs Actual vs Prior Year',
    showPriorYear: true,
    height: 400,
  },
};

export const IBCSMode: Story = {
  args: {
    data: mockBudgetData,
    title: 'Budget vs Actual (IBCS)',
    ibcsMode: true,
    showIBCSLegend: true,
    height: 400,
  },
};
