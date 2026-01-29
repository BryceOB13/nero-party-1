import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ScoreDisplay } from '../ScoreDisplay';

// Mock framer-motion to avoid animation timing issues in tests
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return {
    ...actual,
    useSpring: (value: number) => ({
      set: vi.fn(),
      get: () => value,
      on: (event: string, callback: (v: string) => void) => {
        callback(value.toString());
        return () => {};
      },
    }),
    useTransform: (_spring: any, transform: (v: number) => string) => ({
      on: (event: string, callback: (v: string) => void) => {
        callback(transform(_spring.get()));
        return () => {};
      },
    }),
  };
});

describe('ScoreDisplay', () => {
  describe('Basic Rendering', () => {
    it('renders the score value', () => {
      render(<ScoreDisplay score={85.5} />);
      expect(screen.getByText('85.5')).toBeInTheDocument();
    });

    it('renders score with default decimal places (1)', () => {
      render(<ScoreDisplay score={100} animate={false} />);
      expect(screen.getByText('100.0')).toBeInTheDocument();
    });

    it('renders score with custom decimal places', () => {
      render(<ScoreDisplay score={85.567} decimals={2} animate={false} />);
      expect(screen.getByText('85.57')).toBeInTheDocument();
    });

    it('renders score with zero decimal places', () => {
      render(<ScoreDisplay score={85.5} decimals={0} animate={false} />);
      expect(screen.getByText('86')).toBeInTheDocument();
    });
  });

  describe('Delta Indicator', () => {
    it('shows positive delta with + indicator', async () => {
      render(<ScoreDisplay score={90} previousScore={85} showDelta />);
      await waitFor(() => {
        expect(screen.getByText('+')).toBeInTheDocument();
        expect(screen.getByText('5.0')).toBeInTheDocument();
      });
    });

    it('shows negative delta without + indicator', async () => {
      render(<ScoreDisplay score={80} previousScore={85} showDelta />);
      await waitFor(() => {
        expect(screen.getByText('-5.0')).toBeInTheDocument();
        expect(screen.queryByText('+')).not.toBeInTheDocument();
      });
    });

    it('does not show delta when showDelta is false', () => {
      render(<ScoreDisplay score={90} previousScore={85} showDelta={false} />);
      expect(screen.queryByText('+5.0')).not.toBeInTheDocument();
    });

    it('does not show delta when previousScore is null', () => {
      render(<ScoreDisplay score={90} previousScore={null} showDelta />);
      expect(screen.queryByText('+')).not.toBeInTheDocument();
    });

    it('does not show delta when score equals previousScore', () => {
      render(<ScoreDisplay score={85} previousScore={85} showDelta />);
      expect(screen.queryByText('0.0')).not.toBeInTheDocument();
    });

    it('applies green color class for positive delta', async () => {
      const { container } = render(<ScoreDisplay score={90} previousScore={85} showDelta />);
      await waitFor(() => {
        const deltaElement = container.querySelector('.text-green-400');
        expect(deltaElement).toBeInTheDocument();
      });
    });

    it('applies red color class for negative delta', async () => {
      const { container } = render(<ScoreDisplay score={80} previousScore={85} showDelta />);
      await waitFor(() => {
        const deltaElement = container.querySelector('.text-red-400');
        expect(deltaElement).toBeInTheDocument();
      });
    });
  });

  describe('Size Variants', () => {
    it('applies small size classes', () => {
      const { container } = render(<ScoreDisplay score={85} size="sm" data-testid="score" />);
      const scoreElement = container.querySelector('.text-lg');
      expect(scoreElement).toBeInTheDocument();
    });

    it('applies medium size classes (default)', () => {
      const { container } = render(<ScoreDisplay score={85} data-testid="score" />);
      const scoreElement = container.querySelector('.text-2xl');
      expect(scoreElement).toBeInTheDocument();
    });

    it('applies large size classes', () => {
      const { container } = render(<ScoreDisplay score={85} size="lg" data-testid="score" />);
      const scoreElement = container.querySelector('.text-4xl');
      expect(scoreElement).toBeInTheDocument();
    });
  });

  describe('Prefix and Suffix', () => {
    it('renders prefix before score', () => {
      render(<ScoreDisplay score={100} prefix="$" animate={false} />);
      expect(screen.getByText('$100.0')).toBeInTheDocument();
    });

    it('renders suffix after score', () => {
      render(<ScoreDisplay score={100} suffix=" pts" animate={false} />);
      expect(screen.getByText('100.0 pts')).toBeInTheDocument();
    });

    it('renders both prefix and suffix', () => {
      render(<ScoreDisplay score={100} prefix="★ " suffix=" pts" animate={false} />);
      expect(screen.getByText('★ 100.0 pts')).toBeInTheDocument();
    });
  });

  describe('Base Styling', () => {
    it('applies inline-flex class', () => {
      render(<ScoreDisplay score={85} data-testid="score" />);
      const container = screen.getByTestId('score');
      expect(container).toHaveClass('inline-flex');
    });

    it('applies flex-col class for vertical layout', () => {
      render(<ScoreDisplay score={85} data-testid="score" />);
      const container = screen.getByTestId('score');
      expect(container).toHaveClass('flex-col');
    });

    it('applies items-end class for right alignment', () => {
      render(<ScoreDisplay score={85} data-testid="score" />);
      const container = screen.getByTestId('score');
      expect(container).toHaveClass('items-end');
    });

    it('applies additional className', () => {
      render(<ScoreDisplay score={85} className="custom-class" data-testid="score" />);
      const container = screen.getByTestId('score');
      expect(container).toHaveClass('custom-class');
    });

    it('applies tabular-nums for consistent number width', () => {
      const { container } = render(<ScoreDisplay score={85} />);
      const scoreElement = container.querySelector('.tabular-nums');
      expect(scoreElement).toBeInTheDocument();
    });
  });

  describe('Animation Control', () => {
    it('renders without animation when animate is false', () => {
      render(<ScoreDisplay score={85} animate={false} data-testid="score" />);
      expect(screen.getByTestId('score')).toBeInTheDocument();
    });

    it('renders with animation by default', () => {
      render(<ScoreDisplay score={85} data-testid="score" />);
      expect(screen.getByTestId('score')).toBeInTheDocument();
    });
  });

  describe('Different Score Values', () => {
    const testScores = [0, 1, 10, 100, 999.9, 1000, 9999.99];

    testScores.forEach((score) => {
      it(`renders score ${score} correctly`, () => {
        render(<ScoreDisplay score={score} animate={false} />);
        expect(screen.getByText(score.toFixed(1))).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles zero score', () => {
      render(<ScoreDisplay score={0} animate={false} />);
      expect(screen.getByText('0.0')).toBeInTheDocument();
    });

    it('handles negative score', () => {
      render(<ScoreDisplay score={-5.5} animate={false} />);
      expect(screen.getByText('-5.5')).toBeInTheDocument();
    });

    it('handles very large score', () => {
      render(<ScoreDisplay score={99999.9} animate={false} />);
      expect(screen.getByText('99999.9')).toBeInTheDocument();
    });

    it('handles very small delta', () => {
      render(<ScoreDisplay score={85.1} previousScore={85.0} showDelta decimals={1} />);
      // Delta of 0.1 should be shown
      expect(screen.getByText('0.1')).toBeInTheDocument();
    });

    it('handles previousScore of 0', () => {
      render(<ScoreDisplay score={10} previousScore={0} showDelta />);
      expect(screen.getByText('+')).toBeInTheDocument();
      // Both score and delta show 10.0, so use getAllByText
      const elements = screen.getAllByText('10.0');
      expect(elements.length).toBe(2); // One for score, one for delta
    });
  });

  describe('Accessibility', () => {
    it('renders score as text content', () => {
      render(<ScoreDisplay score={85.5} animate={false} />);
      expect(screen.getByText('85.5')).toBeInTheDocument();
    });

    it('delta indicator is visible in DOM', async () => {
      render(<ScoreDisplay score={90} previousScore={85} showDelta />);
      await waitFor(() => {
        expect(screen.getByText('+')).toBeInTheDocument();
      });
    });
  });
});
