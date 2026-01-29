import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeSelector } from '../ThemeSelector';
import { PARTY_THEMES, PartyTheme } from '../../../types';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock MUI icons
vi.mock('@mui/icons-material/CheckCircle', () => ({
  default: () => <span data-testid="check-icon">✓</span>,
}));

vi.mock('@mui/icons-material/AddCircleOutline', () => ({
  default: () => <span data-testid="add-icon">+</span>,
}));

vi.mock('@mui/icons-material/Close', () => ({
  default: () => <span data-testid="close-icon">×</span>,
}));

vi.mock('@mui/icons-material/Palette', () => ({
  default: () => <span data-testid="palette-icon">🎨</span>,
}));

describe('ThemeSelector', () => {
  let mockOnSelect: ReturnType<typeof vi.fn>;
  let mockOnCustomThemeCreate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnSelect = vi.fn();
    mockOnCustomThemeCreate = vi.fn();
  });

  describe('Theme Display', () => {
    it('should render all predefined themes', () => {
      render(
        <ThemeSelector
          themes={PARTY_THEMES}
          selectedTheme={null}
          onSelect={mockOnSelect}
        />
      );

      // Check that all theme names are rendered
      PARTY_THEMES.forEach((theme) => {
        expect(screen.getByText(theme.name)).toBeInTheDocument();
      });
    });

    it('should render theme icons', () => {
      render(
        <ThemeSelector
          themes={PARTY_THEMES}
          selectedTheme={null}
          onSelect={mockOnSelect}
        />
      );

      // Check that theme icons are rendered
      PARTY_THEMES.forEach((theme) => {
        expect(screen.getByText(theme.icon)).toBeInTheDocument();
      });
    });

    it('should display custom button when allowCustom is true', () => {
      render(
        <ThemeSelector
          themes={PARTY_THEMES}
          selectedTheme={null}
          onSelect={mockOnSelect}
          allowCustom={true}
        />
      );

      expect(screen.getByText('Custom')).toBeInTheDocument();
    });

    it('should not display custom button when allowCustom is false', () => {
      render(
        <ThemeSelector
          themes={PARTY_THEMES}
          selectedTheme={null}
          onSelect={mockOnSelect}
          allowCustom={false}
        />
      );

      expect(screen.queryByText('Custom')).not.toBeInTheDocument();
    });
  });

  describe('Theme Selection', () => {
    it('should call onSelect when a theme is clicked', () => {
      render(
        <ThemeSelector
          themes={PARTY_THEMES}
          selectedTheme={null}
          onSelect={mockOnSelect}
        />
      );

      const anythingGoesButton = screen.getByText('Anything Goes').closest('button');
      fireEvent.click(anythingGoesButton!);

      expect(mockOnSelect).toHaveBeenCalledWith('anything-goes');
    });

    it('should highlight the selected theme', () => {
      render(
        <ThemeSelector
          themes={PARTY_THEMES}
          selectedTheme="high-energy"
          onSelect={mockOnSelect}
        />
      );

      // The selected theme should have a check icon
      const checkIcons = screen.getAllByTestId('check-icon');
      expect(checkIcons.length).toBeGreaterThan(0);
    });

    it('should display selected theme details', () => {
      render(
        <ThemeSelector
          themes={PARTY_THEMES}
          selectedTheme="throwback-party"
          onSelect={mockOnSelect}
        />
      );

      // Should show the theme description in the selected theme display
      expect(screen.getByText(/Songs from before 2010 only/)).toBeInTheDocument();
    });

    it('should not call onSelect when disabled', () => {
      render(
        <ThemeSelector
          themes={PARTY_THEMES}
          selectedTheme={null}
          onSelect={mockOnSelect}
          disabled={true}
        />
      );

      const anythingGoesButton = screen.getByText('Anything Goes').closest('button');
      fireEvent.click(anythingGoesButton!);

      expect(mockOnSelect).not.toHaveBeenCalled();
    });
  });

  describe('Selected Theme Display', () => {
    it('should display theme name and description when selected', () => {
      render(
        <ThemeSelector
          themes={PARTY_THEMES}
          selectedTheme="chill-vibes"
          onSelect={mockOnSelect}
        />
      );

      // The selected theme display should show the theme details
      // Theme name appears twice (in selected display and card), so use getAllByText
      const themeNames = screen.getAllByText('Chill Vibes');
      expect(themeNames.length).toBeGreaterThanOrEqual(2); // In selected display and card
      expect(screen.getByText(/Relaxed, mellow tracks/)).toBeInTheDocument();
    });

    it('should display constraints for themes with constraints', () => {
      render(
        <ThemeSelector
          themes={PARTY_THEMES}
          selectedTheme="high-energy"
          onSelect={mockOnSelect}
        />
      );

      // High Energy theme has BPM constraints
      expect(screen.getByText(/BPM: 120-200/)).toBeInTheDocument();
    });

    it('should not display selected theme section when no theme is selected', () => {
      render(
        <ThemeSelector
          themes={PARTY_THEMES}
          selectedTheme={null}
          onSelect={mockOnSelect}
        />
      );

      // Should not have the gradient background of selected theme display
      const selectedDisplay = screen.queryByText(/Fast-paced bangers/);
      expect(selectedDisplay).not.toBeInTheDocument();
    });
  });

  describe('Custom Theme Modal', () => {
    it('should open custom theme modal when custom button is clicked', async () => {
      render(
        <ThemeSelector
          themes={PARTY_THEMES}
          selectedTheme={null}
          onSelect={mockOnSelect}
          allowCustom={true}
          onCustomThemeCreate={mockOnCustomThemeCreate}
        />
      );

      const customButton = screen.getByText('Custom').closest('button');
      fireEvent.click(customButton!);

      await waitFor(() => {
        expect(screen.getByText('Create Custom Theme')).toBeInTheDocument();
      });
    });

    it('should close modal when cancel is clicked', async () => {
      render(
        <ThemeSelector
          themes={PARTY_THEMES}
          selectedTheme={null}
          onSelect={mockOnSelect}
          allowCustom={true}
          onCustomThemeCreate={mockOnCustomThemeCreate}
        />
      );

      // Open modal
      const customButton = screen.getByText('Custom').closest('button');
      fireEvent.click(customButton!);

      await waitFor(() => {
        expect(screen.getByText('Create Custom Theme')).toBeInTheDocument();
      });

      // Click cancel
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('Create Custom Theme')).not.toBeInTheDocument();
      });
    });

    it('should have disabled create button when name is empty', async () => {
      render(
        <ThemeSelector
          themes={PARTY_THEMES}
          selectedTheme={null}
          onSelect={mockOnSelect}
          allowCustom={true}
          onCustomThemeCreate={mockOnCustomThemeCreate}
        />
      );

      // Open modal
      const customButton = screen.getByText('Custom').closest('button');
      fireEvent.click(customButton!);

      await waitFor(() => {
        expect(screen.getByText('Create Custom Theme')).toBeInTheDocument();
      });

      // Create button should be disabled
      const createButton = screen.getByText('Create Theme').closest('button');
      expect(createButton).toBeDisabled();
    });

    it('should call onCustomThemeCreate with theme data when form is submitted', async () => {
      render(
        <ThemeSelector
          themes={PARTY_THEMES}
          selectedTheme={null}
          onSelect={mockOnSelect}
          allowCustom={true}
          onCustomThemeCreate={mockOnCustomThemeCreate}
        />
      );

      // Open modal
      const customButton = screen.getByText('Custom').closest('button');
      fireEvent.click(customButton!);

      await waitFor(() => {
        expect(screen.getByText('Create Custom Theme')).toBeInTheDocument();
      });

      // Fill in the name
      const nameInput = screen.getByPlaceholderText('e.g., Summer Vibes');
      fireEvent.change(nameInput, { target: { value: 'My Custom Theme' } });

      // Click create
      const createButton = screen.getByText('Create Theme').closest('button');
      fireEvent.click(createButton!);

      expect(mockOnCustomThemeCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'My Custom Theme',
          icon: '🎵',
        })
      );
    });

    it('should allow selecting different icons', async () => {
      render(
        <ThemeSelector
          themes={PARTY_THEMES}
          selectedTheme={null}
          onSelect={mockOnSelect}
          allowCustom={true}
          onCustomThemeCreate={mockOnCustomThemeCreate}
        />
      );

      // Open modal
      const customButton = screen.getByText('Custom').closest('button');
      fireEvent.click(customButton!);

      await waitFor(() => {
        expect(screen.getByText('Create Custom Theme')).toBeInTheDocument();
      });

      // Fill in the name
      const nameInput = screen.getByPlaceholderText('e.g., Summer Vibes');
      fireEvent.change(nameInput, { target: { value: 'Rock Theme' } });

      // Select guitar icon
      const guitarIcon = screen.getByText('🎸');
      fireEvent.click(guitarIcon);

      // Click create
      const createButton = screen.getByText('Create Theme').closest('button');
      fireEvent.click(createButton!);

      expect(mockOnCustomThemeCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Rock Theme',
          icon: '🎸',
        })
      );
    });

    it('should allow selecting genre constraints', async () => {
      render(
        <ThemeSelector
          themes={PARTY_THEMES}
          selectedTheme={null}
          onSelect={mockOnSelect}
          allowCustom={true}
          onCustomThemeCreate={mockOnCustomThemeCreate}
        />
      );

      // Open modal
      const customButton = screen.getByText('Custom').closest('button');
      fireEvent.click(customButton!);

      await waitFor(() => {
        expect(screen.getByText('Create Custom Theme')).toBeInTheDocument();
      });

      // Fill in the name
      const nameInput = screen.getByPlaceholderText('e.g., Summer Vibes');
      fireEvent.change(nameInput, { target: { value: 'Rock Only' } });

      // Select Rock genre
      const rockButton = screen.getByText('Rock');
      fireEvent.click(rockButton);

      // Click create
      const createButton = screen.getByText('Create Theme').closest('button');
      fireEvent.click(createButton!);

      expect(mockOnCustomThemeCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Rock Only',
          constraints: expect.objectContaining({
            genres: ['Rock'],
          }),
        })
      );
    });
  });

  describe('Custom Theme Badge', () => {
    it('should display custom badge for custom themes', () => {
      const customTheme: PartyTheme = {
        id: 'custom-1',
        name: 'My Custom Theme',
        description: 'A custom theme',
        icon: '🎵',
        constraints: {},
        isCustom: true,
      };

      render(
        <ThemeSelector
          themes={[...PARTY_THEMES, customTheme]}
          selectedTheme={null}
          onSelect={mockOnSelect}
        />
      );

      // Should show "Custom" badge
      const customBadges = screen.getAllByText('Custom');
      expect(customBadges.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('should have accessible theme buttons', () => {
      render(
        <ThemeSelector
          themes={PARTY_THEMES}
          selectedTheme={null}
          onSelect={mockOnSelect}
        />
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should have aria-label for theme icons', () => {
      render(
        <ThemeSelector
          themes={PARTY_THEMES}
          selectedTheme={null}
          onSelect={mockOnSelect}
        />
      );

      // Icons should have aria-label
      PARTY_THEMES.forEach((theme) => {
        const icon = screen.getByRole('img', { name: theme.name });
        expect(icon).toBeInTheDocument();
      });
    });
  });
});
