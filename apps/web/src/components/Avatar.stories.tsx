import type { Meta, StoryObj } from '@storybook/react';
import Avatar from './Avatar';

const meta: Meta<typeof Avatar> = {
  title: 'UI/Avatar',
  component: Avatar,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const WithImage: Story = {
  args: {
    src: 'https://api.dicebear.com/7.x/avataaars/svg?seed=JohnDoe',
    name: 'John Doe',
    size: 'md',
  },
};

export const WithInitials: Story = {
  args: {
    firstName: 'Jane',
    lastName: 'Smith',
    size: 'md',
  },
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
      <Avatar firstName="XS" lastName="Size" size="xs" />
      <Avatar firstName="SM" lastName="Size" size="sm" />
      <Avatar firstName="MD" lastName="Size" size="md" />
      <Avatar firstName="LG" lastName="Size" size="lg" />
      <Avatar firstName="XL" lastName="Size" size="xl" />
    </div>
  ),
};

export const WithBadge: Story = {
  args: {
    firstName: 'John',
    lastName: 'Doe',
    size: 'md',
    showBadge: true,
    badgeContent: '✓',
  },
};
