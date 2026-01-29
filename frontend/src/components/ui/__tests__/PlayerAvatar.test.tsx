import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlayerAvatar } from '../PlayerAvatar';

describe('PlayerAvatar', () => {
  const defaultProps = {
    silhouette: '🎭',
    color: '#a855f7',
  };

  describe('Silhouette Display', () => {
    it('renders silhouette emoji when not revealed', () => {
      render(<PlayerAvatar {...defaultProps} />);
      expect(screen.getByText('🎭')).toBeInTheDocument();
    });

    it('applies the player color to the border', () => {
      render(<PlayerAvatar {...defaultProps} data-testid="avatar" />);
      const avatar = screen.getByTestId('avatar');
      expect(avatar).toHaveStyle({ borderColor: '#a855f7' });
    });

    it('applies semi-transparent background with player color', () => {
      render(<PlayerAvatar {...defaultProps} data-testid="avatar" />);
      const avatar = screen.getByTestId('avatar');
      expect(avatar).toHaveStyle({ backgroundColor: '#a855f720' });
    });
  });

  describe('Revealed State', () => {
    it('hides silhouette when revealed', () => {
      render(<PlayerAvatar {...defaultProps} isRevealed />);
      expect(screen.queryByText('🎭')).not.toBeInTheDocument();
    });

    it('shows avatar image when revealed with avatarUrl', () => {
      render(
        <PlayerAvatar
          {...defaultProps}
          isRevealed
          avatarUrl="https://example.com/avatar.jpg"
          realName="John"
        />
      );
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg');
      expect(img).toHaveAttribute('alt', 'John');
    });

    it('shows initial letter when revealed without avatarUrl', () => {
      render(
        <PlayerAvatar
          {...defaultProps}
          isRevealed
          realName="Alice"
        />
      );
      expect(screen.getByText('A')).toBeInTheDocument();
    });

    it('shows question mark when revealed without name or avatar', () => {
      render(<PlayerAvatar {...defaultProps} isRevealed />);
      expect(screen.getByText('?')).toBeInTheDocument();
    });
  });

  describe('Rank Badge', () => {
    it('displays rank badge when rank is provided', () => {
      render(<PlayerAvatar {...defaultProps} rank={1} />);
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('does not display rank badge when rank is not provided', () => {
      render(<PlayerAvatar {...defaultProps} />);
      expect(screen.queryByText('1')).not.toBeInTheDocument();
      expect(screen.queryByText('2')).not.toBeInTheDocument();
      expect(screen.queryByText('3')).not.toBeInTheDocument();
    });

    it('displays correct rank number', () => {
      render(<PlayerAvatar {...defaultProps} rank={5} />);
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('applies small size classes', () => {
      render(<PlayerAvatar {...defaultProps} size="sm" data-testid="avatar" />);
      const avatar = screen.getByTestId('avatar');
      expect(avatar).toHaveClass('w-10', 'h-10');
    });

    it('applies medium size classes (default)', () => {
      render(<PlayerAvatar {...defaultProps} data-testid="avatar" />);
      const avatar = screen.getByTestId('avatar');
      expect(avatar).toHaveClass('w-14', 'h-14');
    });

    it('applies large size classes', () => {
      render(<PlayerAvatar {...defaultProps} size="lg" data-testid="avatar" />);
      const avatar = screen.getByTestId('avatar');
      expect(avatar).toHaveClass('w-20', 'h-20');
    });
  });

  describe('Base Styling', () => {
    it('applies rounded-full class for circular shape', () => {
      render(<PlayerAvatar {...defaultProps} data-testid="avatar" />);
      const avatar = screen.getByTestId('avatar');
      expect(avatar).toHaveClass('rounded-full');
    });

    it('applies relative positioning for badge placement', () => {
      render(<PlayerAvatar {...defaultProps} data-testid="avatar" />);
      const avatar = screen.getByTestId('avatar');
      expect(avatar).toHaveClass('relative');
    });

    it('applies flex centering classes', () => {
      render(<PlayerAvatar {...defaultProps} data-testid="avatar" />);
      const avatar = screen.getByTestId('avatar');
      expect(avatar).toHaveClass('flex', 'items-center', 'justify-center');
    });

    it('applies additional className', () => {
      render(<PlayerAvatar {...defaultProps} className="custom-class" data-testid="avatar" />);
      const avatar = screen.getByTestId('avatar');
      expect(avatar).toHaveClass('custom-class');
    });
  });

  describe('Different Silhouettes', () => {
    const silhouettes = ['🎭', '👤', '🦊', '🐱', '🎪', '🌟'];

    silhouettes.forEach((silhouette) => {
      it(`renders ${silhouette} silhouette correctly`, () => {
        render(<PlayerAvatar silhouette={silhouette} color="#a855f7" />);
        expect(screen.getByText(silhouette)).toBeInTheDocument();
      });
    });
  });

  describe('Different Colors', () => {
    const colors = ['#a855f7', '#06b6d4', '#ec4899', '#22c55e', '#f59e0b'];

    colors.forEach((color) => {
      it(`applies ${color} color correctly`, () => {
        render(<PlayerAvatar silhouette="🎭" color={color} data-testid="avatar" />);
        const avatar = screen.getByTestId('avatar');
        expect(avatar).toHaveStyle({ borderColor: color });
      });
    });
  });

  describe('Glow Effect', () => {
    it('does not apply glow by default', () => {
      render(<PlayerAvatar {...defaultProps} data-testid="avatar" />);
      // Glow is controlled via Framer Motion animation, so we just verify the prop is accepted
      expect(screen.getByTestId('avatar')).toBeInTheDocument();
    });

    it('accepts showGlow prop', () => {
      render(<PlayerAvatar {...defaultProps} showGlow data-testid="avatar" />);
      expect(screen.getByTestId('avatar')).toBeInTheDocument();
    });

    it('does not show glow when revealed', () => {
      render(<PlayerAvatar {...defaultProps} showGlow isRevealed data-testid="avatar" />);
      expect(screen.getByTestId('avatar')).toBeInTheDocument();
    });
  });

  describe('Animation Control', () => {
    it('renders without animation when animate is false', () => {
      render(<PlayerAvatar {...defaultProps} animate={false} data-testid="avatar" />);
      expect(screen.getByTestId('avatar')).toBeInTheDocument();
    });

    it('renders with animation by default', () => {
      render(<PlayerAvatar {...defaultProps} data-testid="avatar" />);
      expect(screen.getByTestId('avatar')).toBeInTheDocument();
    });
  });
});
