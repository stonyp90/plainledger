import type { Meta, StoryObj } from '@storybook/react';
import { VariancePinCompact } from './VariancePin';

const meta: Meta<typeof VariancePinCompact> = {
  title: 'Charts/IBCS/VariancePin',
  component: VariancePinCompact,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Favorable: Story = {
  args: {
    actual: 120000,
    plan: 100000,
    metricType: 'revenue',
  },
};

export const Unfavorable: Story = {
  args: {
    actual: 80000,
    plan: 100000,
    metricType: 'revenue',
  },
};

export const ExpenseFavorable: Story = {
  args: {
    actual: 80000,
    plan: 100000,
    metricType: 'expense',
  },
};

export const ExpenseUnfavorable: Story = {
  args: {
    actual: 120000,
    plan: 100000,
    metricType: 'expense',
  },
};
