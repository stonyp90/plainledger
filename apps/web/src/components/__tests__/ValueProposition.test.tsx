/**
 * ValueProposition Component Unit Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PainPoints, Benefits, HowItWorks, SocialProof, QuickStat } from '../ValueProposition';

// Mock useI18n
vi.mock('../../lib/i18n', () => ({
  useI18n: () => ({ language: 'en' }),
}));

describe('PainPoints', () => {
  it('renders entrepreneur-focused pain points', () => {
    render(<PainPoints />);
    
    // Check for pain points (strikethrough problems)
    expect(screen.getByText('Decisions based on gut, not data')).toBeTruthy();
    expect(screen.getByText('No idea how you compare to competitors')).toBeTruthy();
    expect(screen.getByText('Opportunities discovered too late')).toBeTruthy();
    expect(screen.getByText("Generic advice that doesn't fit your industry")).toBeTruthy();
  });

  it('renders solutions for each pain point', () => {
    render(<PainPoints />);
    
    expect(screen.getByText('AI-backed recommendations')).toBeTruthy();
    expect(screen.getByText('Benchmarks from 75K+ businesses')).toBeTruthy();
    expect(screen.getByText('Proactive profit alerts')).toBeTruthy();
    expect(screen.getByText('Industry-specific intelligence')).toBeTruthy();
  });
});

describe('Benefits', () => {
  it('renders compounding intelligence metrics', () => {
    render(<Benefits />);
    
    expect(screen.getByText('92%')).toBeTruthy();
    expect(screen.getByText('75K+')).toBeTruthy();
    expect(screen.getByText('15+')).toBeTruthy();
    expect(screen.getByText('$28K')).toBeTruthy();
  });

  it('renders benefit labels', () => {
    render(<Benefits />);
    
    expect(screen.getByText('Recommendation accuracy')).toBeTruthy();
    expect(screen.getByText('Businesses analyzed')).toBeTruthy();
    expect(screen.getByText('Industry patterns')).toBeTruthy();
    expect(screen.getByText('Avg. annual savings')).toBeTruthy();
  });

  it('renders improvement subtexts', () => {
    render(<Benefits />);
    
    expect(screen.getByText('Improves daily')).toBeTruthy();
    expect(screen.getByText('Growing network')).toBeTruthy();
    expect(screen.getByText('Deep expertise')).toBeTruthy();
    expect(screen.getByText('Per business')).toBeTruthy();
  });
});

describe('HowItWorks', () => {
  it('renders three flywheel steps', () => {
    render(<HowItWorks />);
    
    expect(screen.getByText('Connect')).toBeTruthy();
    expect(screen.getByText('Insights')).toBeTruthy();
    expect(screen.getByText('Decide & Learn')).toBeTruthy();
  });

  it('renders step descriptions highlighting the flywheel', () => {
    render(<HowItWorks />);
    
    expect(screen.getByText(/Link your accounting software/)).toBeTruthy();
    expect(screen.getByText(/patterns from thousands/)).toBeTruthy();
    expect(screen.getByText(/improves recommendations for everyone/)).toBeTruthy();
  });

  it('renders step numbers', () => {
    render(<HowItWorks />);
    
    expect(screen.getByText('Step 1')).toBeTruthy();
    expect(screen.getByText('Step 2')).toBeTruthy();
    expect(screen.getByText('Step 3')).toBeTruthy();
  });
});

describe('SocialProof', () => {
  it('renders compounding intelligence badge', () => {
    render(<SocialProof />);
    
    expect(screen.getByText('Compounding Intelligence')).toBeTruthy();
  });

  it('renders entrepreneur testimonial', () => {
    render(<SocialProof />);
    
    expect(screen.getByText(/recommendations get better every month/)).toBeTruthy();
    expect(screen.getByText(/Restaurant Owner, Montreal/)).toBeTruthy();
  });
});

describe('QuickStat', () => {
  it('renders stat with label and value', () => {
    render(<QuickStat label="Revenue" value="$50K" />);
    
    expect(screen.getByText('Revenue')).toBeTruthy();
    expect(screen.getByText('$50K')).toBeTruthy();
  });

  it('renders stat with suffix', () => {
    render(<QuickStat label="Growth" value="15" suffix="%" />);
    
    expect(screen.getByText('15%')).toBeTruthy();
  });

  it('renders positive change indicator', () => {
    render(<QuickStat label="Sales" value="100" change={10} trend="up" />);
    
    expect(screen.getByText('+10%')).toBeTruthy();
  });

  it('renders negative change indicator', () => {
    render(<QuickStat label="Costs" value="100" change={-5} trend="down" />);
    
    expect(screen.getByText('-5%')).toBeTruthy();
  });

  it('renders loading state', () => {
    const { container } = render(<QuickStat label="Test" value="0" loading={true} />);
    
    // Should have skeleton elements
    const skeletons = container.querySelectorAll('.skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
