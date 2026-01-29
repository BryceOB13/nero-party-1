import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GlassInput } from '../GlassInput';

describe('GlassInput', () => {
  it('renders an input element', () => {
    render(<GlassInput placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('applies default glassmorphism classes', () => {
    render(<GlassInput data-testid="input" />);
    const input = screen.getByTestId('input');
    
    // Check for backdrop blur (glassmorphism effect)
    expect(input).toHaveClass('backdrop-blur-md');
    // Check for semi-transparent background
    expect(input).toHaveClass('bg-white/10');
    // Check for subtle border
    expect(input).toHaveClass('border-white/20');
    // Check for rounded corners
    expect(input).toHaveClass('rounded-xl');
  });

  // Size tests
  describe('sizes', () => {
    it('applies small size classes', () => {
      render(<GlassInput data-testid="input" size="sm" />);
      const input = screen.getByTestId('input');
      expect(input).toHaveClass('px-3');
      expect(input).toHaveClass('py-1.5');
      expect(input).toHaveClass('text-sm');
      expect(input).toHaveClass('rounded-lg');
    });

    it('applies medium size classes (default)', () => {
      render(<GlassInput data-testid="input" size="md" />);
      const input = screen.getByTestId('input');
      expect(input).toHaveClass('px-4');
      expect(input).toHaveClass('py-2.5');
      expect(input).toHaveClass('text-base');
      expect(input).toHaveClass('rounded-xl');
    });

    it('applies large size classes', () => {
      render(<GlassInput data-testid="input" size="lg" />);
      const input = screen.getByTestId('input');
      expect(input).toHaveClass('px-5');
      expect(input).toHaveClass('py-3');
      expect(input).toHaveClass('text-lg');
      expect(input).toHaveClass('rounded-2xl');
    });
  });

  // Label
  describe('label', () => {
    it('renders label when provided', () => {
      render(<GlassInput label="Username" />);
      expect(screen.getByText('Username')).toBeInTheDocument();
    });

    it('associates label with input', () => {
      render(<GlassInput label="Username" id="username-input" />);
      const label = screen.getByText('Username');
      expect(label).toHaveAttribute('for', 'username-input');
    });
  });

  // Helper text
  describe('helper text', () => {
    it('renders helper text when provided', () => {
      render(<GlassInput helperText="Enter your username" />);
      expect(screen.getByText('Enter your username')).toBeInTheDocument();
    });

    it('applies correct styling to helper text', () => {
      render(<GlassInput helperText="Helper" />);
      const helperText = screen.getByText('Helper');
      expect(helperText).toHaveClass('text-white/50');
    });
  });

  // Error state
  describe('error state', () => {
    it('renders error message when provided', () => {
      render(<GlassInput error="This field is required" />);
      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('applies error styling to input', () => {
      render(<GlassInput data-testid="input" error="Error" />);
      const input = screen.getByTestId('input');
      expect(input).toHaveClass('border-red-400/50');
    });

    it('applies error styling to error message', () => {
      render(<GlassInput error="Error message" />);
      const errorText = screen.getByText('Error message');
      expect(errorText).toHaveClass('text-red-400');
    });

    it('shows error instead of helper text when both provided', () => {
      render(<GlassInput helperText="Helper" error="Error" />);
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.queryByText('Helper')).not.toBeInTheDocument();
    });
  });

  // Focus state
  describe('focus state', () => {
    it('applies focus classes on focus', () => {
      render(<GlassInput data-testid="input" />);
      const input = screen.getByTestId('input');
      expect(input).toHaveClass('focus:border-purple-400/50');
      expect(input).toHaveClass('focus:ring-2');
      expect(input).toHaveClass('focus:ring-purple-400/30');
    });

    it('calls onFocus handler', () => {
      const handleFocus = vi.fn();
      render(<GlassInput onFocus={handleFocus} />);
      fireEvent.focus(screen.getByRole('textbox'));
      expect(handleFocus).toHaveBeenCalledTimes(1);
    });

    it('calls onBlur handler', () => {
      const handleBlur = vi.fn();
      render(<GlassInput onBlur={handleBlur} />);
      const input = screen.getByRole('textbox');
      fireEvent.focus(input);
      fireEvent.blur(input);
      expect(handleBlur).toHaveBeenCalledTimes(1);
    });
  });

  // Icons
  describe('icons', () => {
    it('renders left icon', () => {
      render(
        <GlassInput leftIcon={<span data-testid="left-icon">🔍</span>} />
      );
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    });

    it('renders right icon', () => {
      render(
        <GlassInput rightIcon={<span data-testid="right-icon">✓</span>} />
      );
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });

    it('applies left padding when left icon is present', () => {
      render(<GlassInput data-testid="input" leftIcon={<span>🔍</span>} />);
      expect(screen.getByTestId('input')).toHaveClass('pl-10');
    });

    it('applies right padding when right icon is present', () => {
      render(<GlassInput data-testid="input" rightIcon={<span>✓</span>} />);
      expect(screen.getByTestId('input')).toHaveClass('pr-10');
    });
  });

  // Disabled state
  describe('disabled state', () => {
    it('applies disabled classes when disabled', () => {
      render(<GlassInput data-testid="input" disabled />);
      const input = screen.getByTestId('input');
      expect(input).toBeDisabled();
      expect(input).toHaveClass('opacity-50');
      expect(input).toHaveClass('cursor-not-allowed');
    });
  });

  // Full width
  it('applies full width class when fullWidth is true', () => {
    render(<GlassInput fullWidth containerClassName="test-container" />);
    const container = document.querySelector('.test-container');
    expect(container).toHaveClass('w-full');
  });

  // Custom className
  it('applies additional className to input', () => {
    render(<GlassInput data-testid="input" className="custom-class" />);
    expect(screen.getByTestId('input')).toHaveClass('custom-class');
  });

  // Value handling
  it('handles controlled value', () => {
    const handleChange = vi.fn();
    render(<GlassInput value="test" onChange={handleChange} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('test');
    fireEvent.change(input, { target: { value: 'new value' } });
    expect(handleChange).toHaveBeenCalled();
  });

  // Input types
  it('supports different input types', () => {
    render(<GlassInput type="password" data-testid="input" />);
    expect(screen.getByTestId('input')).toHaveAttribute('type', 'password');
  });
});
