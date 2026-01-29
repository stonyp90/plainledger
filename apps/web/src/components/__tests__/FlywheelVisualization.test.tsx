/**
 * FlywheelVisualization Component Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import FlywheelVisualization from '../FlywheelVisualization';

// Mock the i18n hook
vi.mock('../lib/i18n', () => ({
  useI18n: vi.fn(() => ({ language: 'en' })),
}));

const mockTheme = {
  gold: '#d4af37',
  green: '#16a34a',
  greenDark: '#15803d',
};

describe('FlywheelVisualization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all flywheel nodes', () => {
    render(<FlywheelVisualization theme={mockTheme} isDark={false} />);
    
    expect(screen.getByText('More Businesses')).toBeInTheDocument();
    expect(screen.getByText('More Decisions')).toBeInTheDocument();
    expect(screen.getByText('Richer Patterns')).toBeInTheDocument();
    expect(screen.getByText('Better Insights')).toBeInTheDocument();
  });

  it('should render center hub with Brain icon', () => {
    const { container } = render(<FlywheelVisualization theme={mockTheme} isDark={false} />);
    
    // Check for Brain icon (lucide-react icon)
    const brainIcon = container.querySelector('svg');
    expect(brainIcon).toBeInTheDocument();
  });

  it('should apply dark theme styles when isDark is true', () => {
    const { container } = render(<FlywheelVisualization theme={mockTheme} isDark={true} />);
    
    // Check that dark theme styles are applied
    const elements = container.querySelectorAll('[style*="rgba(30, 41, 59)"]');
    expect(elements.length).toBeGreaterThan(0);
  });

  it('should apply light theme styles when isDark is false', () => {
    const { container } = render(<FlywheelVisualization theme={mockTheme} isDark={false} />);
    
    // Check that light theme styles are applied
    const elements = container.querySelectorAll('[style*="rgba(255, 255, 255)"]');
    expect(elements.length).toBeGreaterThan(0);
  });

  it('should animate on mount', () => {
    const { container } = render(<FlywheelVisualization theme={mockTheme} isDark={false} />);
    
    // Check for motion components with animation
    const animatedElements = container.querySelectorAll('[style*="rotate"]');
    expect(animatedElements.length).toBeGreaterThan(0);
  });
});
