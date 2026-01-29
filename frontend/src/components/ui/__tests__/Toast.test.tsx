import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ToastItem, ToastContainer, Toast } from '../Toast';

describe('ToastItem', () => {
  const mockDismiss = vi.fn();
  
  beforeEach(() => {
    vi.useFakeTimers();
    mockDismiss.mockClear();
  });
  
  afterEach(() => {
    vi.useRealTimers();
  });

  const createToast = (overrides: Partial<Toast> = {}): Toast => ({
    id: 'test-toast-1',
    type: 'info',
    message: 'Test message',
    duration: 5000,
    ...overrides,
  });

  it('renders the message', () => {
    render(<ToastItem toast={createToast()} onDismiss={mockDismiss} />);
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('renders with role="alert"', () => {
    render(<ToastItem toast={createToast()} onDismiss={mockDismiss} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  // Type styling tests
  describe('toast types', () => {
    it('renders error toast with correct styling', () => {
      render(<ToastItem toast={createToast({ type: 'error' })} onDismiss={mockDismiss} />);
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('bg-red-500/20');
      expect(alert).toHaveClass('border-red-500/40');
      expect(screen.getByText('❌')).toBeInTheDocument();
    });

    it('renders warning toast with correct styling', () => {
      render(<ToastItem toast={createToast({ type: 'warning' })} onDismiss={mockDismiss} />);
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('bg-amber-500/20');
      expect(alert).toHaveClass('border-amber-500/40');
      expect(screen.getByText('⚠️')).toBeInTheDocument();
    });

    it('renders info toast with correct styling', () => {
      render(<ToastItem toast={createToast({ type: 'info' })} onDismiss={mockDismiss} />);
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('bg-cyan-500/20');
      expect(alert).toHaveClass('border-cyan-500/40');
      expect(screen.getByText('ℹ️')).toBeInTheDocument();
    });

    it('renders success toast with correct styling', () => {
      render(<ToastItem toast={createToast({ type: 'success' })} onDismiss={mockDismiss} />);
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('bg-green-500/20');
      expect(alert).toHaveClass('border-green-500/40');
      expect(screen.getByText('✅')).toBeInTheDocument();
    });
  });

  // Auto-dismiss tests
  describe('auto-dismiss', () => {
    it('auto-dismisses after duration', async () => {
      render(<ToastItem toast={createToast({ duration: 3000 })} onDismiss={mockDismiss} />);
      
      expect(mockDismiss).not.toHaveBeenCalled();
      
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      
      expect(mockDismiss).toHaveBeenCalledWith('test-toast-1');
    });

    it('does not auto-dismiss when duration is 0', () => {
      render(<ToastItem toast={createToast({ duration: 0 })} onDismiss={mockDismiss} />);
      
      act(() => {
        vi.advanceTimersByTime(10000);
      });
      
      expect(mockDismiss).not.toHaveBeenCalled();
    });

    it('uses default duration of 5000ms', () => {
      render(<ToastItem toast={createToast({ duration: undefined })} onDismiss={mockDismiss} />);
      
      act(() => {
        vi.advanceTimersByTime(4999);
      });
      expect(mockDismiss).not.toHaveBeenCalled();
      
      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(mockDismiss).toHaveBeenCalledWith('test-toast-1');
    });
  });

  // Manual dismiss tests
  describe('manual dismiss', () => {
    it('dismisses when close button is clicked', () => {
      render(<ToastItem toast={createToast()} onDismiss={mockDismiss} />);
      
      const closeButton = screen.getByLabelText('Dismiss notification');
      fireEvent.click(closeButton);
      
      expect(mockDismiss).toHaveBeenCalledWith('test-toast-1');
    });
  });

  // Action button tests
  describe('action button', () => {
    it('renders action button when provided', () => {
      const action = { label: 'Retry', onClick: vi.fn() };
      render(<ToastItem toast={createToast({ action })} onDismiss={mockDismiss} />);
      
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('calls action onClick when clicked', () => {
      const action = { label: 'Retry', onClick: vi.fn() };
      render(<ToastItem toast={createToast({ action })} onDismiss={mockDismiss} />);
      
      fireEvent.click(screen.getByText('Retry'));
      
      expect(action.onClick).toHaveBeenCalledTimes(1);
    });

    it('does not render action button when not provided', () => {
      render(<ToastItem toast={createToast()} onDismiss={mockDismiss} />);
      
      expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
    });
  });
});

describe('ToastContainer', () => {
  const mockDismiss = vi.fn();

  beforeEach(() => {
    mockDismiss.mockClear();
  });

  it('renders multiple toasts', () => {
    const toasts: Toast[] = [
      { id: '1', type: 'info', message: 'First toast' },
      { id: '2', type: 'success', message: 'Second toast' },
      { id: '3', type: 'error', message: 'Third toast' },
    ];
    
    render(<ToastContainer toasts={toasts} onDismiss={mockDismiss} />);
    
    expect(screen.getByText('First toast')).toBeInTheDocument();
    expect(screen.getByText('Second toast')).toBeInTheDocument();
    expect(screen.getByText('Third toast')).toBeInTheDocument();
  });

  it('renders empty when no toasts', () => {
    render(<ToastContainer toasts={[]} onDismiss={mockDismiss} />);
    
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('has correct positioning classes', () => {
    const toasts: Toast[] = [{ id: '1', type: 'info', message: 'Test' }];
    
    render(<ToastContainer toasts={toasts} onDismiss={mockDismiss} />);
    
    const container = screen.getByLabelText('Notifications');
    expect(container).toHaveClass('fixed');
    expect(container).toHaveClass('top-4');
    expect(container).toHaveClass('right-4');
    expect(container).toHaveClass('z-50');
  });
});
