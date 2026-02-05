/**
 * FlywheelVisualization Component Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import FlywheelVisualization from '../FlywheelVisualization';

// Mock lottie-react to avoid canvas context errors in tests
vi.mock('lottie-react', () => ({
  default: function MockLottie(props: Record<string, unknown>) {
    return React.createElement('div', { 'data-testid': 'lottie-mock', ...props });
  },
}));

// Mock LottieAnimations component that uses lottie-react
vi.mock('../LottieAnimations', () => ({
  DataCycleAnimation: function MockDataCycleAnimation({ className }: { className?: string }) {
    return React.createElement('div', { 'data-testid': 'data-cycle-animation-mock', className });
  },
}));

// Mock the i18n hook
vi.mock('../../lib/i18n', () => ({
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
    
    // Check that dark theme text colors are applied to node labels
    const darkTextElements = container.querySelectorAll('[style*="#f1f5f9"]');
    expect(darkTextElements.length).toBeGreaterThan(0);
  });

  it('should apply light theme styles when isDark is false', () => {
    const { container } = render(<FlywheelVisualization theme={mockTheme} isDark={false} />);
    
    // Check that light theme text colors are applied
    const lightTextElements = container.querySelectorAll('[style*="#1e293b"]');
    expect(lightTextElements.length).toBeGreaterThan(0);
  });

  it('should render the SVG arrow path', () => {
    const { container } = render(<FlywheelVisualization theme={mockTheme} isDark={false} />);
    
    // Check for SVG circle element (the animated arrow path)
    const svgCircle = container.querySelector('svg circle');
    expect(svgCircle).toBeInTheDocument();
  });
});
