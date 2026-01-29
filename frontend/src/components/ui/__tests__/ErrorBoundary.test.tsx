import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';

// Component that throws an error
function ThrowError({ shouldThrow = true }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>No error</div>;
}

// Component that can toggle error state
function ToggleError() {
  return <div>Toggle component</div>;
}

describe('ErrorBoundary', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  
  beforeEach(() => {
    // Suppress console.error for cleaner test output
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  
  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div data-testid="child">Child content</div>
      </ErrorBoundary>
    );
    
    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('renders fallback UI when error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/An unexpected error occurred/)).toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div data-testid="custom-fallback">Custom error UI</div>}>
        <ThrowError />
      </ErrorBoundary>
    );
    
    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    expect(screen.getByText('Custom error UI')).toBeInTheDocument();
  });

  it('calls onError callback when error occurs', () => {
    const onError = vi.fn();
    
    render(
      <ErrorBoundary onError={onError}>
        <ThrowError />
      </ErrorBoundary>
    );
    
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ componentStack: expect.any(String) })
    );
  });

  it('calls showToast when provided and error occurs', () => {
    const showToast = vi.fn();
    
    render(
      <ErrorBoundary showToast={showToast}>
        <ThrowError />
      </ErrorBoundary>
    );
    
    expect(showToast).toHaveBeenCalledWith({
      type: 'error',
      message: 'Something went wrong. Please refresh the page.',
      action: {
        label: 'Refresh',
        onClick: expect.any(Function),
      },
    });
  });

  it('logs error to console', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );
    
    expect(consoleSpy).toHaveBeenCalledWith(
      'React error:',
      expect.any(Error),
      expect.objectContaining({ componentStack: expect.any(String) })
    );
  });

  describe('fallback UI', () => {
    it('shows error icon', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );
      
      // Check for SVG icon
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('shows Refresh Page button', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );
      
      expect(screen.getByRole('button', { name: /refresh page/i })).toBeInTheDocument();
    });

    it('shows Try Again button', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );
      
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('reloads page when Refresh Page is clicked', () => {
      const reloadMock = vi.fn();
      const originalLocation = window.location;
      
      // Mock window.location.reload
      Object.defineProperty(window, 'location', {
        value: { ...originalLocation, reload: reloadMock },
        writable: true,
      });
      
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );
      
      fireEvent.click(screen.getByRole('button', { name: /refresh page/i }));
      
      expect(reloadMock).toHaveBeenCalledTimes(1);
      
      // Restore original location
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
      });
    });

    it('resets error state when Try Again is clicked', () => {
      // Create a component that can control whether it throws
      let shouldThrow = true;
      
      function ConditionalError() {
        if (shouldThrow) {
          throw new Error('Test error');
        }
        return <div data-testid="recovered">Recovered!</div>;
      }
      
      const { rerender } = render(
        <ErrorBoundary>
          <ConditionalError />
        </ErrorBoundary>
      );
      
      // Should show error UI
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      
      // Fix the error condition
      shouldThrow = false;
      
      // Click Try Again
      fireEvent.click(screen.getByRole('button', { name: /try again/i }));
      
      // Should show recovered content
      expect(screen.getByTestId('recovered')).toBeInTheDocument();
    });
  });

  describe('development mode error details', () => {
    const originalEnv = process.env.NODE_ENV;
    
    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('shows error details in development mode', () => {
      process.env.NODE_ENV = 'development';
      
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });
  });
});
