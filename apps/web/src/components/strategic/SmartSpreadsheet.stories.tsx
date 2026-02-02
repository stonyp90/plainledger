import type { Meta, StoryObj } from '@storybook/react';
import SmartSpreadsheet from './SmartSpreadsheet';

const meta: Meta<typeof SmartSpreadsheet> = {
  title: 'Strategic/SmartSpreadsheet',
  component: SmartSpreadsheet,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    // Add props as needed
  },
};
