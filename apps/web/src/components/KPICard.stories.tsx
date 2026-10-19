import type { Meta, StoryObj } from '@storybook/react';
import KPICard from './KPICard';

const meta = {
  title: 'UI/KPICard', component: KPICard, tags: ['autodocs'],
  parameters: { layout: 'centered' },
  args: { id: 'kpi-preview', label: 'Monthly Recurring Revenue', value: '$145,000', chartData: [100, 105, 110, 108, 115, 120, 125, 130, 128, 135, 140, 145] },
  argTypes: { value: { control: 'text' }, compact: { control: 'boolean' } },
} satisfies Meta<typeof KPICard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const WithVariance: Story = { args: { label: 'Net Profit Margin', value: '18.5%', change: '+3.3 pp', trend: 'up' } };
export const Compact: Story = { args: { label: 'Active Users', value: '1,250', compact: true } };
export const WithBenchmark: Story = { args: { label: 'Customer Acquisition Cost', value: '$45', target: 'Target: $60', benchmarkData: Array(12).fill(60) } };
export const NegativeVariance: Story = { args: { label: 'Churn Rate', value: '2.5%', change: '-0.5 pp', trend: 'down', isGoodWhenDown: true } };
