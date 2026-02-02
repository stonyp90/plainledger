import type { Meta, StoryObj } from '@storybook/react';
import { Tooltip } from './Tooltip';

const meta: Meta<typeof Tooltip> = {
  title: 'UI/Tooltip',
  component: Tooltip,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    content: 'This is a helpful tooltip',
    children: <button>Hover me</button>,
  },
};

export const WithRichContent: Story = {
  args: {
    content: (
      <div>
        <strong>Rich Content</strong>
        <p>This tooltip can contain HTML content</p>
      </div>
    ),
    children: <button>Hover for rich content</button>,
  },
};
