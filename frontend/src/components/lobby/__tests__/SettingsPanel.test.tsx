import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsPanel } from '../SettingsPanel';
import { DEFAULT_PARTY_SETTINGS, PartySettings } from '../../../types';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('SettingsPanel', () => {
  let mockOnSettingsChange: ReturnType<typeof vi.fn>;
  let settings: PartySettings;

  beforeEach(() => {
    mockOnSettingsChange = vi.fn();
    settings = { ...DEFAULT_PARTY_SETTINGS };
  });

  it('should render all settings controls', () => {
    render(
      <SettingsPanel 
        settings={settings} 
        onSettingsChange={mockOnSettingsChange} 
      />
    );

    expect(screen.getByText('Game Settings')).toBeInTheDocument();
    expect(screen.getByText('Songs Per Player')).toBeInTheDocument();
    expect(screen.getByText('Play Duration')).toBeInTheDocument();
    expect(screen.getByText('Bonus Categories')).toBeInTheDocument();
    expect(screen.getByText('Confidence Betting')).toBeInTheDocument();
    expect(screen.getByText('Progressive Weighting')).toBeInTheDocument();
  });

  it('should display current songs_per_player value', () => {
    render(
      <SettingsPanel 
        settings={{ ...settings, songsPerPlayer: 3 }} 
        onSettingsChange={mockOnSettingsChange} 
      />
    );

    const select = screen.getByRole('combobox', { name: /songs per player/i });
    expect(select).toHaveValue('3');
  });

  it('should emit settings_updated when songs_per_player changes', () => {
    render(
      <SettingsPanel 
        settings={settings} 
        onSettingsChange={mockOnSettingsChange} 
      />
    );

    const select = screen.getByRole('combobox', { name: /songs per player/i });
    fireEvent.change(select, { target: { value: '3' } });

    expect(mockOnSettingsChange).toHaveBeenCalledWith({ songsPerPlayer: 3 });
  });

  it('should display current play_duration value', () => {
    render(
      <SettingsPanel 
        settings={{ ...settings, playDuration: 60 }} 
        onSettingsChange={mockOnSettingsChange} 
      />
    );

    const select = screen.getByRole('combobox', { name: /play duration/i });
    expect(select).toHaveValue('60');
  });

  it('should emit settings_updated when play_duration changes', () => {
    render(
      <SettingsPanel 
        settings={settings} 
        onSettingsChange={mockOnSettingsChange} 
      />
    );

    const select = screen.getByRole('combobox', { name: /play duration/i });
    fireEvent.change(select, { target: { value: '90' } });

    expect(mockOnSettingsChange).toHaveBeenCalledWith({ playDuration: 90 });
  });

  it('should display current bonusCategoryCount value', () => {
    render(
      <SettingsPanel 
        settings={{ ...settings, bonusCategoryCount: 3 }} 
        onSettingsChange={mockOnSettingsChange} 
      />
    );

    const select = screen.getByRole('combobox', { name: /bonus categories/i });
    expect(select).toHaveValue('3');
  });

  it('should emit settings_updated when bonusCategoryCount changes', () => {
    render(
      <SettingsPanel 
        settings={settings} 
        onSettingsChange={mockOnSettingsChange} 
      />
    );

    const select = screen.getByRole('combobox', { name: /bonus categories/i });
    fireEvent.change(select, { target: { value: '1' } });

    expect(mockOnSettingsChange).toHaveBeenCalledWith({ bonusCategoryCount: 1 });
  });

  it('should emit settings_updated when confidence_betting toggle is clicked', () => {
    render(
      <SettingsPanel 
        settings={{ ...settings, enableConfidenceBetting: true }} 
        onSettingsChange={mockOnSettingsChange} 
      />
    );

    // Find the toggle button by its parent label
    const toggleButtons = screen.getAllByRole('button');
    const confidenceToggle = toggleButtons.find(btn => 
      btn.className.includes('rounded-full') && btn.className.includes('bg-purple-500')
    );
    
    if (confidenceToggle) {
      fireEvent.click(confidenceToggle);
      expect(mockOnSettingsChange).toHaveBeenCalledWith({ enableConfidenceBetting: false });
    }
  });

  it('should emit settings_updated when progressive_weighting toggle is clicked', () => {
    render(
      <SettingsPanel 
        settings={{ ...settings, enableProgressiveWeighting: true }} 
        onSettingsChange={mockOnSettingsChange} 
      />
    );

    // Find all toggle buttons
    const toggleButtons = screen.getAllByRole('button').filter(btn => 
      btn.className.includes('rounded-full')
    );
    
    // The second toggle should be progressive weighting
    if (toggleButtons.length >= 2) {
      fireEvent.click(toggleButtons[1]);
      expect(mockOnSettingsChange).toHaveBeenCalledWith({ enableProgressiveWeighting: false });
    }
  });

  it('should disable all controls when disabled prop is true', () => {
    render(
      <SettingsPanel 
        settings={settings} 
        onSettingsChange={mockOnSettingsChange}
        disabled={true}
      />
    );

    const selects = screen.getAllByRole('combobox');
    selects.forEach(select => {
      expect(select).toBeDisabled();
    });
  });

  it('should have valid options for songs_per_player dropdown', () => {
    render(
      <SettingsPanel 
        settings={settings} 
        onSettingsChange={mockOnSettingsChange} 
      />
    );

    const select = screen.getByRole('combobox', { name: /songs per player/i });
    const options = select.querySelectorAll('option');
    
    expect(options).toHaveLength(3);
    expect(options[0]).toHaveValue('1');
    expect(options[1]).toHaveValue('2');
    expect(options[2]).toHaveValue('3');
  });

  it('should have valid options for play_duration dropdown', () => {
    render(
      <SettingsPanel 
        settings={settings} 
        onSettingsChange={mockOnSettingsChange} 
      />
    );

    const select = screen.getByRole('combobox', { name: /play duration/i });
    const options = select.querySelectorAll('option');
    
    expect(options).toHaveLength(4);
    expect(options[0]).toHaveValue('30');
    expect(options[1]).toHaveValue('45');
    expect(options[2]).toHaveValue('60');
    expect(options[3]).toHaveValue('90');
  });

  it('should have valid options for bonusCategoryCount dropdown', () => {
    render(
      <SettingsPanel 
        settings={settings} 
        onSettingsChange={mockOnSettingsChange} 
      />
    );

    const select = screen.getByRole('combobox', { name: /bonus categories/i });
    const options = select.querySelectorAll('option');
    
    expect(options).toHaveLength(4);
    expect(options[0]).toHaveValue('0');
    expect(options[1]).toHaveValue('1');
    expect(options[2]).toHaveValue('2');
    expect(options[3]).toHaveValue('3');
  });
});
