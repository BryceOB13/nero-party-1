import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StartButton } from '../StartButton';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, onClick, disabled, ...props }: any) => (
      <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
    ),
  },
}));

describe('StartButton', () => {
  let mockOnStart: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnStart = vi.fn();
  });

  it('should be disabled when player count < 3', () => {
    render(
      <StartButton 
        playerCount={2} 
        onStart={mockOnStart} 
      />
    );

    const button = screen.getByRole('button', { name: /start game/i });
    expect(button).toBeDisabled();
  });

  it('should show tooltip explaining why disabled when player count < 3', () => {
    render(
      <StartButton 
        playerCount={2} 
        onStart={mockOnStart} 
      />
    );

    expect(screen.getByText(/need 1 more player to start/i)).toBeInTheDocument();
  });

  it('should show correct plural form for multiple players needed', () => {
    render(
      <StartButton 
        playerCount={1} 
        onStart={mockOnStart} 
      />
    );

    expect(screen.getByText(/need 2 more players to start/i)).toBeInTheDocument();
  });

  it('should be enabled when player count >= 3', () => {
    render(
      <StartButton 
        playerCount={3} 
        onStart={mockOnStart} 
      />
    );

    const button = screen.getByRole('button', { name: /start game/i });
    expect(button).not.toBeDisabled();
  });

  it('should not show tooltip when player count >= 3', () => {
    render(
      <StartButton 
        playerCount={3} 
        onStart={mockOnStart} 
      />
    );

    expect(screen.queryByText(/need.*more player/i)).not.toBeInTheDocument();
  });

  it('should emit lobby:start event when clicked and enabled', () => {
    render(
      <StartButton 
        playerCount={3} 
        onStart={mockOnStart} 
      />
    );

    const button = screen.getByRole('button', { name: /start game/i });
    fireEvent.click(button);

    expect(mockOnStart).toHaveBeenCalledTimes(1);
  });

  it('should not emit event when clicked and disabled', () => {
    render(
      <StartButton 
        playerCount={2} 
        onStart={mockOnStart} 
      />
    );

    const button = screen.getByRole('button', { name: /start game/i });
    fireEvent.click(button);

    expect(mockOnStart).not.toHaveBeenCalled();
  });

  it('should respect custom minPlayers prop', () => {
    render(
      <StartButton 
        playerCount={2} 
        minPlayers={2}
        onStart={mockOnStart} 
      />
    );

    const button = screen.getByRole('button', { name: /start game/i });
    expect(button).not.toBeDisabled();
  });

  it('should be disabled when disabled prop is true even with enough players', () => {
    render(
      <StartButton 
        playerCount={5} 
        onStart={mockOnStart}
        disabled={true}
      />
    );

    const button = screen.getByRole('button', { name: /start game/i });
    expect(button).toBeDisabled();
  });

  it('should work with exactly 3 players (boundary case)', () => {
    render(
      <StartButton 
        playerCount={3} 
        onStart={mockOnStart} 
      />
    );

    const button = screen.getByRole('button', { name: /start game/i });
    expect(button).not.toBeDisabled();
    
    fireEvent.click(button);
    expect(mockOnStart).toHaveBeenCalledTimes(1);
  });

  it('should work with many players', () => {
    render(
      <StartButton 
        playerCount={10} 
        onStart={mockOnStart} 
      />
    );

    const button = screen.getByRole('button', { name: /start game/i });
    expect(button).not.toBeDisabled();
  });
});
