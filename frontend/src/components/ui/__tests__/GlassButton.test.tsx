import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GlassButton } from '../GlassButton';

describe('GlassButton', () => {
  it('renders children correctly', () => {
    render(<GlassButton>Click Me</GlassButton>);
    expect(screen.getByText('Click Me')).toBeInTheDocument();
  });

  it('renders as a button element', () => {
    render(<GlassButton>Button</GlassButton>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<GlassButton onClick={handleClick}>Click Me</GlassButton>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  // Variant tests
  describe('variants', () => {
    it('applies default variant classes', () => {
      render(<GlassButton data-testid="btn" variant="default">Button</GlassButton>);
      const btn = screen.getByTestId('btn');
      expect(btn).toHaveClass('bg-white/10');
      expect(btn).toHaveClass('backdrop-blur-md');
      expect(btn).toHaveClass('border-white/20');
    });

    it('applies primary variant classes', () => {
      render(<GlassButton data-testid="btn" variant="primary">Button</GlassButton>);
      const btn = screen.getByTestId('btn');
      expect(btn).toHaveClass('bg-gradient-to-r');
      expect(btn).toHaveClass('from-purple-500/80');
      expect(btn).toHaveClass('to-cyan-500/80');
    });

    it('applies outline variant classes', () => {
      render(<GlassButton data-testid="btn" variant="outline">Button</GlassButton>);
      const btn = screen.getByTestId('btn');
      expect(btn).toHaveClass('bg-transparent');
      expect(btn).toHaveClass('border-2');
      expect(btn).toHaveClass('border-white/30');
    });

    it('applies ghost variant classes', () => {
      render(<GlassButton data-testid="btn" variant="ghost">Button</GlassButton>);
      const btn = screen.getByTestId('btn');
      expect(btn).toHaveClass('bg-transparent');
      expect(btn).toHaveClass('text-white/80');
    });
  });

  // Size tests
  describe('sizes', () => {
    it('applies small size classes', () => {
      render(<GlassButton data-testid="btn" size="sm">Button</GlassButton>);
      const btn = screen.getByTestId('btn');
      expect(btn).toHaveClass('px-3');
      expect(btn).toHaveClass('py-1.5');
      expect(btn).toHaveClass('text-sm');
      expect(btn).toHaveClass('rounded-lg');
    });

    it('applies medium size classes (default)', () => {
      render(<GlassButton data-testid="btn" size="md">Button</GlassButton>);
      const btn = screen.getByTestId('btn');
      expect(btn).toHaveClass('px-4');
      expect(btn).toHaveClass('py-2');
      expect(btn).toHaveClass('text-base');
      expect(btn).toHaveClass('rounded-xl');
    });

    it('applies large size classes', () => {
      render(<GlassButton data-testid="btn" size="lg">Button</GlassButton>);
      const btn = screen.getByTestId('btn');
      expect(btn).toHaveClass('px-6');
      expect(btn).toHaveClass('py-3');
      expect(btn).toHaveClass('text-lg');
      expect(btn).toHaveClass('rounded-2xl');
    });
  });

  // Disabled state
  describe('disabled state', () => {
    it('applies disabled classes when disabled', () => {
      render(<GlassButton data-testid="btn" disabled>Button</GlassButton>);
      const btn = screen.getByTestId('btn');
      expect(btn).toBeDisabled();
      expect(btn).toHaveClass('opacity-50');
      expect(btn).toHaveClass('cursor-not-allowed');
    });

    it('does not trigger click when disabled', () => {
      const handleClick = vi.fn();
      render(<GlassButton disabled onClick={handleClick}>Button</GlassButton>);
      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  // Loading state
  describe('loading state', () => {
    it('shows loading spinner when loading', () => {
      render(<GlassButton loading>Button</GlassButton>);
      const spinner = document.querySelector('svg.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('disables button when loading', () => {
      render(<GlassButton loading>Button</GlassButton>);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('applies loading cursor class', () => {
      render(<GlassButton data-testid="btn" loading>Button</GlassButton>);
      expect(screen.getByTestId('btn')).toHaveClass('cursor-wait');
    });
  });

  // Icon support
  describe('icons', () => {
    it('renders left icon', () => {
      render(
        <GlassButton leftIcon={<span data-testid="left-icon">←</span>}>
          Button
        </GlassButton>
      );
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    });

    it('renders right icon', () => {
      render(
        <GlassButton rightIcon={<span data-testid="right-icon">→</span>}>
          Button
        </GlassButton>
      );
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });

    it('hides icons when loading', () => {
      render(
        <GlassButton
          loading
          leftIcon={<span data-testid="left-icon">←</span>}
          rightIcon={<span data-testid="right-icon">→</span>}
        >
          Button
        </GlassButton>
      );
      expect(screen.queryByTestId('left-icon')).not.toBeInTheDocument();
      expect(screen.queryByTestId('right-icon')).not.toBeInTheDocument();
    });
  });

  // Full width
  it('applies full width class when fullWidth is true', () => {
    render(<GlassButton data-testid="btn" fullWidth>Button</GlassButton>);
    expect(screen.getByTestId('btn')).toHaveClass('w-full');
  });

  // Custom className
  it('applies additional className', () => {
    render(<GlassButton data-testid="btn" className="custom-class">Button</GlassButton>);
    expect(screen.getByTestId('btn')).toHaveClass('custom-class');
  });

  // Button type
  it('defaults to type="button"', () => {
    render(<GlassButton>Button</GlassButton>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('allows custom type', () => {
    render(<GlassButton type="submit">Submit</GlassButton>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });
});
