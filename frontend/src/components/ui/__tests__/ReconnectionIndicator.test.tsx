import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReconnectionIndicator } from '../ReconnectionIndicator';

describe('ReconnectionIndicator', () => {
  it('renders when isVisible is true', () => {
    render(<ReconnectionIndicator isVisible={true} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('does not render when isVisible is false', () => {
    render(<ReconnectionIndicator isVisible={false} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('displays default message', () => {
    render(<ReconnectionIndicator isVisible={true} />);
    expect(screen.getByText('Connection lost. Reconnecting...')).toBeInTheDocument();
  });

  it('displays custom message', () => {
    render(
      <ReconnectionIndicator 
        isVisible={true} 
        message="Custom reconnection message" 
      />
    );
    expect(screen.getByText('Custom reconnection message')).toBeInTheDocument();
  });

  it('shows attempt count when provided', () => {
    render(
      <ReconnectionIndicator 
        isVisible={true} 
        attemptCount={3} 
      />
    );
    expect(screen.getByText('(Attempt 3)')).toBeInTheDocument();
  });

  it('does not show attempt count when 0', () => {
    render(
      <ReconnectionIndicator 
        isVisible={true} 
        attemptCount={0} 
      />
    );
    expect(screen.queryByText(/Attempt/)).not.toBeInTheDocument();
  });

  it('does not show attempt count when undefined', () => {
    render(<ReconnectionIndicator isVisible={true} />);
    expect(screen.queryByText(/Attempt/)).not.toBeInTheDocument();
  });

  it('shows loading spinner when isReconnecting is true', () => {
    render(
      <ReconnectionIndicator 
        isVisible={true} 
        isReconnecting={true} 
      />
    );
    const spinner = document.querySelector('svg.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('does not show loading spinner when isReconnecting is false', () => {
    render(
      <ReconnectionIndicator 
        isVisible={true} 
        isReconnecting={false} 
      />
    );
    const spinner = document.querySelector('svg.animate-spin');
    expect(spinner).not.toBeInTheDocument();
  });

  it('has correct positioning classes', () => {
    render(<ReconnectionIndicator isVisible={true} />);
    // The alert element itself has the positioning classes
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('fixed');
    expect(alert).toHaveClass('top-0');
    expect(alert).toHaveClass('left-0');
    expect(alert).toHaveClass('right-0');
    expect(alert).toHaveClass('z-50');
  });

  it('has aria-live="assertive" for accessibility', () => {
    render(<ReconnectionIndicator isVisible={true} />);
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
  });

  it('applies warning styling to inner container', () => {
    render(<ReconnectionIndicator isVisible={true} />);
    // The inner div has the warning styling
    const alert = screen.getByRole('alert');
    const innerDiv = alert.querySelector('div');
    expect(innerDiv).toHaveClass('bg-amber-500/20');
    expect(innerDiv).toHaveClass('border-amber-500/40');
  });
});
