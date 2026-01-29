import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ToastProvider, useToast } from '../ToastProvider';

// Test component that uses the useToast hook
function TestComponent() {
  const { showToast, dismissAllToasts } = useToast();
  
  return (
    <div>
      <button onClick={() => showToast({ type: 'info', message: 'Info toast', duration: 0 })}>
        Show Info
      </button>
      <button onClick={() => showToast({ type: 'error', message: 'Error toast', duration: 0 })}>
        Show Error
      </button>
      <button onClick={() => showToast({ type: 'success', message: 'Success toast', duration: 0 })}>
        Show Success
      </button>
      <button onClick={() => dismissAllToasts()}>
        Dismiss All
      </button>
    </div>
  );
}

describe('ToastProvider', () => {
  it('renders children', () => {
    render(
      <ToastProvider>
        <div data-testid="child">Child content</div>
      </ToastProvider>
    );
    
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('shows toast when showToast is called', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );
    
    fireEvent.click(screen.getByText('Show Info'));
    
    expect(screen.getByText('Info toast')).toBeInTheDocument();
  });

  it('shows multiple toasts', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );
    
    fireEvent.click(screen.getByText('Show Info'));
    fireEvent.click(screen.getByText('Show Error'));
    
    expect(screen.getByText('Info toast')).toBeInTheDocument();
    expect(screen.getByText('Error toast')).toBeInTheDocument();
  });

  it('limits toasts to maxToasts', async () => {
    render(
      <ToastProvider maxToasts={2}>
        <TestComponent />
      </ToastProvider>
    );
    
    // Show 3 toasts
    fireEvent.click(screen.getByText('Show Info'));
    fireEvent.click(screen.getByText('Show Error'));
    fireEvent.click(screen.getByText('Show Success'));
    
    // Wait for state to update
    await waitFor(() => {
      // Should only show 2 toasts (the most recent ones)
      const alerts = screen.getAllByRole('alert');
      expect(alerts).toHaveLength(2);
    });
    
    // First toast should be removed
    expect(screen.queryByText('Info toast')).not.toBeInTheDocument();
    expect(screen.getByText('Error toast')).toBeInTheDocument();
    expect(screen.getByText('Success toast')).toBeInTheDocument();
  });

  it('dismisses all toasts when dismissAllToasts is called', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );
    
    // Show multiple toasts
    fireEvent.click(screen.getByText('Show Info'));
    fireEvent.click(screen.getByText('Show Error'));
    
    expect(screen.getAllByRole('alert')).toHaveLength(2);
    
    // Dismiss all
    fireEvent.click(screen.getByText('Dismiss All'));
    
    // Wait for state to update
    await waitFor(() => {
      expect(screen.queryAllByRole('alert')).toHaveLength(0);
    });
  });
});

describe('useToast', () => {
  it('throws error when used outside ToastProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    function BadComponent() {
      useToast();
      return null;
    }
    
    expect(() => render(<BadComponent />)).toThrow(
      'useToast must be used within a ToastProvider'
    );
    
    consoleSpy.mockRestore();
  });
});
