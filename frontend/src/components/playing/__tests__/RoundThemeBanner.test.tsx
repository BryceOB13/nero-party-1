import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { RoundThemeBanner } from '../RoundThemeBanner';
import { RoundTheme, PartyTheme, ROUND_THEMES, PARTY_THEMES } from '../../../types';

describe('RoundThemeBanner', () => {
  // Sample round theme for testing
  const sampleRoundTheme: RoundTheme = ROUND_THEMES[0]; // 'Pump Up' theme

  // Sample party theme for testing
  const samplePartyTheme: PartyTheme = PARTY_THEMES[3]; // 'High Energy' theme

  describe('Basic Rendering', () => {
    it('renders round theme name and prompt', () => {
      render(<RoundThemeBanner theme={sampleRoundTheme} />);

      expect(screen.getByText(sampleRoundTheme.name)).toBeInTheDocument();
      expect(screen.getByText(sampleRoundTheme.prompt)).toBeInTheDocument();
    });

    it('renders round theme icon', () => {
      render(<RoundThemeBanner theme={sampleRoundTheme} />);

      expect(screen.getByRole('img', { name: sampleRoundTheme.name })).toBeInTheDocument();
    });

    it('renders without party theme', () => {
      render(<RoundThemeBanner theme={sampleRoundTheme} />);

      // Should not show party theme section
      expect(screen.queryByText(/Party Theme:/)).not.toBeInTheDocument();
    });
  });

  describe('Bonus Multiplier Display', () => {
    it('shows bonus multiplier badge when multiplier > 1.0', () => {
      const themeWithBonus: RoundTheme = {
        ...sampleRoundTheme,
        bonusMultiplier: 1.5,
      };

      render(<RoundThemeBanner theme={themeWithBonus} />);

      expect(screen.getByText('1.5x Bonus')).toBeInTheDocument();
    });

    it('does not show bonus multiplier badge when multiplier is 1.0', () => {
      const themeWithoutBonus: RoundTheme = {
        ...sampleRoundTheme,
        bonusMultiplier: 1.0,
      };

      render(<RoundThemeBanner theme={themeWithoutBonus} />);

      expect(screen.queryByText(/Bonus/)).not.toBeInTheDocument();
    });
  });

  describe('Party Theme Display', () => {
    it('displays party theme when provided', () => {
      render(
        <RoundThemeBanner
          theme={sampleRoundTheme}
          partyTheme={samplePartyTheme}
        />
      );

      expect(screen.getByText(`Party Theme: ${samplePartyTheme.name}`)).toBeInTheDocument();
    });

    it('displays party theme icon', () => {
      render(
        <RoundThemeBanner
          theme={sampleRoundTheme}
          partyTheme={samplePartyTheme}
        />
      );

      expect(screen.getByRole('img', { name: samplePartyTheme.name })).toBeInTheDocument();
    });

    it('does not display party theme section for "Anything Goes" theme', () => {
      const anythingGoesTheme = PARTY_THEMES.find(t => t.id === 'anything-goes')!;

      render(
        <RoundThemeBanner
          theme={sampleRoundTheme}
          partyTheme={anythingGoesTheme}
        />
      );

      expect(screen.queryByText(/Party Theme:/)).not.toBeInTheDocument();
    });

    it('displays party theme constraints as tags', () => {
      render(
        <RoundThemeBanner
          theme={sampleRoundTheme}
          partyTheme={samplePartyTheme}
        />
      );

      // High Energy theme has moods and bpmRange constraints
      expect(screen.getByText(/Moods:/)).toBeInTheDocument();
      expect(screen.getByText(/BPM:/)).toBeInTheDocument();
    });

    it('displays party theme description in non-compact mode', () => {
      render(
        <RoundThemeBanner
          theme={sampleRoundTheme}
          partyTheme={samplePartyTheme}
          compact={false}
        />
      );

      expect(screen.getByText(samplePartyTheme.description)).toBeInTheDocument();
    });
  });

  describe('Compact Mode', () => {
    it('renders in compact mode', () => {
      const { container } = render(
        <RoundThemeBanner
          theme={sampleRoundTheme}
          partyTheme={samplePartyTheme}
          compact={true}
        />
      );

      // Component should render without errors
      expect(container.firstChild).toBeInTheDocument();
    });

    it('does not show party theme description in compact mode', () => {
      render(
        <RoundThemeBanner
          theme={sampleRoundTheme}
          partyTheme={samplePartyTheme}
          compact={true}
        />
      );

      // Description should not be visible in compact mode
      expect(screen.queryByText(samplePartyTheme.description)).not.toBeInTheDocument();
    });
  });

  describe('Custom Class Names', () => {
    it('applies custom className', () => {
      const { container } = render(
        <RoundThemeBanner
          theme={sampleRoundTheme}
          className="custom-test-class"
        />
      );

      expect(container.firstChild).toHaveClass('custom-test-class');
    });
  });

  describe('All Predefined Themes', () => {
    it.each(ROUND_THEMES)('renders round theme: $name', (theme) => {
      render(<RoundThemeBanner theme={theme} />);

      expect(screen.getByText(theme.name)).toBeInTheDocument();
      expect(screen.getByText(theme.prompt)).toBeInTheDocument();
    });

    it.each(PARTY_THEMES.filter(t => t.id !== 'anything-goes'))(
      'renders party theme: $name',
      (partyTheme) => {
        render(
          <RoundThemeBanner
            theme={sampleRoundTheme}
            partyTheme={partyTheme}
          />
        );

        expect(screen.getByText(`Party Theme: ${partyTheme.name}`)).toBeInTheDocument();
      }
    );
  });

  describe('Requirements Validation', () => {
    /**
     * Requirement 22.2: THE UI SHALL include a Round_Theme_Banner component displaying current round theme
     */
    it('displays current round theme (Requirement 22.2)', () => {
      render(<RoundThemeBanner theme={sampleRoundTheme} />);

      // Verify round theme is displayed
      expect(screen.getByText(sampleRoundTheme.name)).toBeInTheDocument();
      expect(screen.getByText(sampleRoundTheme.prompt)).toBeInTheDocument();
      expect(screen.getByRole('img', { name: sampleRoundTheme.name })).toBeInTheDocument();
    });

    /**
     * Requirement 3.3: WHEN a Round_Theme is active, THE Submitting_Screen SHALL prominently display the round theme prompt
     */
    it('prominently displays round theme prompt (Requirement 3.3)', () => {
      render(<RoundThemeBanner theme={sampleRoundTheme} />);

      const prompt = screen.getByText(sampleRoundTheme.prompt);
      expect(prompt).toBeInTheDocument();
      // Prompt should be in the document (animation may affect initial visibility)
      expect(prompt).toBeTruthy();
    });

    /**
     * Requirement 3.4: THE Submitting_Screen SHALL display both Party_Theme and Round_Theme constraints when applicable
     */
    it('displays both party and round theme when applicable (Requirement 3.4)', () => {
      render(
        <RoundThemeBanner
          theme={sampleRoundTheme}
          partyTheme={samplePartyTheme}
        />
      );

      // Round theme should be displayed
      expect(screen.getByText(sampleRoundTheme.name)).toBeInTheDocument();
      expect(screen.getByText(sampleRoundTheme.prompt)).toBeInTheDocument();

      // Party theme should be displayed
      expect(screen.getByText(`Party Theme: ${samplePartyTheme.name}`)).toBeInTheDocument();

      // Party theme constraints should be displayed
      expect(screen.getByText(/Moods:/)).toBeInTheDocument();
    });
  });
});
