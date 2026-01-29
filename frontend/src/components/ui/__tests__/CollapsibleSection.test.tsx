import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CollapsibleSection } from '../CollapsibleSection';

describe('CollapsibleSection', () => {
  it('renders title correctly', () => {
    render(
      <CollapsibleSection title="Test Section">
        Content
      </CollapsibleSection>
    );
    expect(screen.getByText('Test Section')).toBeInTheDocument();
  });

  it('renders children when open', () => {
    render(
      <CollapsibleSection title="Section" defaultOpen>
        Test Content
      </CollapsibleSection>
    );
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('is open by default', () => {
    render(
      <CollapsibleSection title="Section">
        Test Content
      </CollapsibleSection>
    );
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('hides content when defaultOpen is false', async () => {
    render(
      <CollapsibleSection title="Section" defaultOpen={false}>
        Test Content
      </CollapsibleSection>
    );
    // Content should not be visible when collapsed
    await waitFor(() => {
      expect(screen.queryByText('Test Content')).not.toBeInTheDocument();
    });
  });

  it('toggles content visibility on click', async () => {
    render(
      <CollapsibleSection title="Section" defaultOpen>
        Test Content
      </CollapsibleSection>
    );
    
    // Initially visible
    expect(screen.getByText('Test Content')).toBeInTheDocument();
    
    // Click to collapse
    fireEvent.click(screen.getByRole('button'));
    
    await waitFor(() => {
      expect(screen.queryByText('Test Content')).not.toBeInTheDocument();
    });
    
    // Click to expand
    fireEvent.click(screen.getByRole('button'));
    
    await waitFor(() => {
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });
  });

  it('calls onToggle callback when toggled', () => {
    const onToggle = vi.fn();
    render(
      <CollapsibleSection title="Section" defaultOpen onToggle={onToggle}>
        Content
      </CollapsibleSection>
    );
    
    fireEvent.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalledWith(false);
    
    fireEvent.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it('works in controlled mode', async () => {
    const onToggle = vi.fn();
    const { rerender } = render(
      <CollapsibleSection title="Section" isOpen={true} onToggle={onToggle}>
        Content
      </CollapsibleSection>
    );
    
    expect(screen.getByText('Content')).toBeInTheDocument();
    
    // Click should call onToggle but not change state (controlled)
    fireEvent.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalledWith(false);
    
    // Content still visible because isOpen is still true
    expect(screen.getByText('Content')).toBeInTheDocument();
    
    // Rerender with isOpen=false
    rerender(
      <CollapsibleSection title="Section" isOpen={false} onToggle={onToggle}>
        Content
      </CollapsibleSection>
    );
    
    await waitFor(() => {
      expect(screen.queryByText('Content')).not.toBeInTheDocument();
    });
  });

  it('supports keyboard navigation with Enter', async () => {
    render(
      <CollapsibleSection title="Section" defaultOpen>
        Content
      </CollapsibleSection>
    );
    
    const button = screen.getByRole('button');
    fireEvent.keyDown(button, { key: 'Enter' });
    
    await waitFor(() => {
      expect(screen.queryByText('Content')).not.toBeInTheDocument();
    });
  });

  it('supports keyboard navigation with Space', async () => {
    render(
      <CollapsibleSection title="Section" defaultOpen>
        Content
      </CollapsibleSection>
    );
    
    const button = screen.getByRole('button');
    fireEvent.keyDown(button, { key: ' ' });
    
    await waitFor(() => {
      expect(screen.queryByText('Content')).not.toBeInTheDocument();
    });
  });

  it('renders icon when provided', () => {
    render(
      <CollapsibleSection title="Section" icon={<span data-testid="icon">🎵</span>}>
        Content
      </CollapsibleSection>
    );
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('renders badge when provided', () => {
    render(
      <CollapsibleSection title="Section" badge={<span data-testid="badge">5</span>}>
        Content
      </CollapsibleSection>
    );
    expect(screen.getByTestId('badge')).toBeInTheDocument();
  });

  it('applies glass styling by default', () => {
    render(
      <CollapsibleSection title="Section">
        Content
      </CollapsibleSection>
    );
    const container = screen.getByText('Section').closest('.backdrop-blur-md');
    expect(container).toBeInTheDocument();
  });

  it('does not apply glass styling when glass is false', () => {
    render(
      <CollapsibleSection title="Section" glass={false}>
        Content
      </CollapsibleSection>
    );
    const container = screen.getByText('Section').closest('.backdrop-blur-md');
    expect(container).not.toBeInTheDocument();
  });

  it('is not collapsible when collapsible is false', () => {
    render(
      <CollapsibleSection title="Section" collapsible={false}>
        Content
      </CollapsibleSection>
    );
    
    // Should not have button role
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    
    // Content should always be visible
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('has correct aria-expanded attribute', () => {
    render(
      <CollapsibleSection title="Section" defaultOpen>
        Content
      </CollapsibleSection>
    );
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-expanded', 'true');
    
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('applies custom className', () => {
    render(
      <CollapsibleSection title="Section" className="custom-class">
        Content
      </CollapsibleSection>
    );
    const container = screen.getByText('Section').closest('.custom-class');
    expect(container).toBeInTheDocument();
  });

  it('applies custom headerClassName', () => {
    render(
      <CollapsibleSection title="Section" headerClassName="custom-header">
        Content
      </CollapsibleSection>
    );
    const header = screen.getByText('Section').closest('.custom-header');
    expect(header).toBeInTheDocument();
  });

  it('applies custom contentClassName', () => {
    render(
      <CollapsibleSection title="Section" contentClassName="custom-content">
        <span data-testid="content">Content</span>
      </CollapsibleSection>
    );
    const content = screen.getByTestId('content').closest('.custom-content');
    expect(content).toBeInTheDocument();
  });
});
