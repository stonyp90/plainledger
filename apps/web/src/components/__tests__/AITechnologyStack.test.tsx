/**
 * AITechnologyStack Component Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import AITechnologyStack from '../AITechnologyStack';

// Mock the i18n hook
const mockUseI18n = vi.fn(() => ({ language: 'en' }));
vi.mock('../lib/i18n', () => ({
  useI18n: () => mockUseI18n(),
}));

const mockTheme = {
  gold: '#d4af37',
  green: '#16a34a',
  greenDark: '#15803d',
};

describe('AITechnologyStack', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseI18n.mockReturnValue({ language: 'en' });
  });

  it('should render all AI providers', () => {
    render(<AITechnologyStack theme={mockTheme} isDark={false} />);
    
    const providers = ['OpenAI', 'Anthropic', 'Google', 'Mistral', 'AWS Bedrock', 'Custom Model'];
    providers.forEach(provider => {
      expect(screen.getByText(provider)).toBeInTheDocument();
    });
  });

  it('should display training stats', () => {
    render(<AITechnologyStack theme={mockTheme} isDark={false} />);
    
    expect(screen.getByText('847K+')).toBeInTheDocument();
    expect(screen.getByText('92%')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('15+')).toBeInTheDocument();
  });

  it('should display proprietary badge on Custom Model', () => {
    render(<AITechnologyStack theme={mockTheme} isDark={false} />);
    
    expect(screen.getByText('PROPRIETARY')).toBeInTheDocument();
  });

  it('should handle language toggle', () => {
    const { rerender } = render(<AITechnologyStack theme={mockTheme} isDark={false} />);
    
    expect(screen.getByText(/Decisions in training data/i)).toBeInTheDocument();
    expect(screen.getByText(/AI providers integrated/i)).toBeInTheDocument();
    
    mockUseI18n.mockReturnValue({ language: 'fr' });
    rerender(<AITechnologyStack theme={mockTheme} isDark={false} />);
    
    expect(screen.getByText(/Décisions dans les données/i)).toBeInTheDocument();
    expect(screen.getByText(/Fournisseurs IA intégrés/i)).toBeInTheDocument();
  });

  it('should display data privacy messaging', () => {
    render(<AITechnologyStack theme={mockTheme} isDark={false} />);
    
    expect(screen.getByText(/Your data trains YOUR industry model/i)).toBeInTheDocument();
  });

  it('should display open source foundations', () => {
    render(<AITechnologyStack theme={mockTheme} isDark={false} />);
    
    expect(screen.getByText(/Mistral 7B/i)).toBeInTheDocument();
    expect(screen.getByText(/HuggingFace/i)).toBeInTheDocument();
    expect(screen.getByText(/PyTorch/i)).toBeInTheDocument();
    expect(screen.getByText(/LoRA/i)).toBeInTheDocument();
  });

  it('should apply dark theme styles when isDark is true', () => {
    const { container } = render(<AITechnologyStack theme={mockTheme} isDark={true} />);
    
    const elements = container.querySelectorAll('[style*="rgba(30, 41, 59)"]');
    expect(elements.length).toBeGreaterThan(0);
  });
});
