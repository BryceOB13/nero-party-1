import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GlassCard } from '../GlassCard';

describe('GlassCard', () => {
  it('renders children correctly', () => {
    render(<GlassCard>Test Content</GlassCard>);
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('applies default glassmorphism classes', () => {
    render(<GlassCard data-testid="glass-card">Content</GlassCard>);
    const card = screen.getByTestId('glass-card');
    
    // Check for backdrop blur (glassmorphism effect)
    expect(card).toHaveClass('backdrop-blur-md');
    // Check for semi-transparent background
    expect(card).toHaveClass('bg-white/10');
    // Check for subtle border
    expect(card).toHaveClass('border-white/20');
    // Check for rounded corners
    expect(card).toHaveClass('rounded-2xl');
  });

  it('applies custom blur intensity', () => {
    render(<GlassCard data-testid="glass-card" blur="xl">Content</GlassCard>);
    const card = screen.getByTestId('glass-card');
    expect(card).toHaveClass('backdrop-blur-xl');
  });

  it('applies custom opacity level', () => {
    render(<GlassCard data-testid="glass-card" opacity="dark">Content</GlassCard>);
    const card = screen.getByTestId('glass-card');
    expect(card).toHaveClass('bg-white/20');
  });

  it('applies custom border style', () => {
    render(<GlassCard data-testid="glass-card" border="bright">Content</GlassCard>);
    const card = screen.getByTestId('glass-card');
    expect(card).toHaveClass('border-white/30');
  });

  it('applies custom padding', () => {
    render(<GlassCard data-testid="glass-card" padding="lg">Content</GlassCard>);
    const card = screen.getByTestId('glass-card');
    expect(card).toHaveClass('p-6');
  });

  it('applies hover classes when hoverable is true', () => {
    render(<GlassCard data-testid="glass-card" hoverable>Content</GlassCard>);
    const card = screen.getByTestId('glass-card');
    expect(card).toHaveClass('hover:bg-white/15');
    expect(card).toHaveClass('hover:border-purple-400/30');
  });

  it('does not apply hover classes when hoverable is false', () => {
    render(<GlassCard data-testid="glass-card" hoverable={false}>Content</GlassCard>);
    const card = screen.getByTestId('glass-card');
    expect(card).not.toHaveClass('hover:bg-white/15');
  });

  it('applies additional className', () => {
    render(<GlassCard data-testid="glass-card" className="custom-class">Content</GlassCard>);
    const card = screen.getByTestId('glass-card');
    expect(card).toHaveClass('custom-class');
  });

  it('supports all blur variants', () => {
    const blurVariants = ['sm', 'md', 'lg', 'xl'] as const;
    const expectedClasses = ['backdrop-blur-sm', 'backdrop-blur-md', 'backdrop-blur-lg', 'backdrop-blur-xl'];
    
    blurVariants.forEach((blur, index) => {
      const { unmount } = render(<GlassCard data-testid="glass-card" blur={blur}>Content</GlassCard>);
      const card = screen.getByTestId('glass-card');
      expect(card).toHaveClass(expectedClasses[index]);
      unmount();
    });
  });

  it('supports all opacity variants', () => {
    const opacityVariants = ['light', 'medium', 'dark'] as const;
    const expectedClasses = ['bg-white/5', 'bg-white/10', 'bg-white/20'];
    
    opacityVariants.forEach((opacity, index) => {
      const { unmount } = render(<GlassCard data-testid="glass-card" opacity={opacity}>Content</GlassCard>);
      const card = screen.getByTestId('glass-card');
      expect(card).toHaveClass(expectedClasses[index]);
      unmount();
    });
  });

  it('supports all padding variants', () => {
    const paddingVariants = ['none', 'sm', 'md', 'lg', 'xl'] as const;
    const expectedClasses = ['p-0', 'p-3', 'p-4', 'p-6', 'p-8'];
    
    paddingVariants.forEach((padding, index) => {
      const { unmount } = render(<GlassCard data-testid="glass-card" padding={padding}>Content</GlassCard>);
      const card = screen.getByTestId('glass-card');
      expect(card).toHaveClass(expectedClasses[index]);
      unmount();
    });
  });
});
