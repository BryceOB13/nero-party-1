import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TabbedContainer, Tab } from '../TabbedContainer';

const mockTabs: Tab[] = [
  { id: 'tab1', label: 'Tab 1', content: <div>Content 1</div> },
  { id: 'tab2', label: 'Tab 2', content: <div>Content 2</div> },
  { id: 'tab3', label: 'Tab 3', content: <div>Content 3</div> },
];

describe('TabbedContainer', () => {
  it('renders all tab labels', () => {
    render(<TabbedContainer tabs={mockTabs} />);
    expect(screen.getByText('Tab 1')).toBeInTheDocument();
    expect(screen.getByText('Tab 2')).toBeInTheDocument();
    expect(screen.getByText('Tab 3')).toBeInTheDocument();
  });

  it('shows first tab content by default', () => {
    render(<TabbedContainer tabs={mockTabs} />);
    expect(screen.getByText('Content 1')).toBeInTheDocument();
  });

  it('shows specified defaultTab content', () => {
    render(<TabbedContainer tabs={mockTabs} defaultTab="tab2" />);
    expect(screen.getByText('Content 2')).toBeInTheDocument();
  });

  it('switches content when tab is clicked', async () => {
    render(<TabbedContainer tabs={mockTabs} />);
    
    // Initially shows tab 1 content
    expect(screen.getByText('Content 1')).toBeInTheDocument();
    
    // Click tab 2
    fireEvent.click(screen.getByText('Tab 2'));
    
    await waitFor(() => {
      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });
  });

  it('calls onTabChange when tab is clicked', () => {
    const onTabChange = vi.fn();
    render(<TabbedContainer tabs={mockTabs} onTabChange={onTabChange} />);
    
    fireEvent.click(screen.getByText('Tab 2'));
    expect(onTabChange).toHaveBeenCalledWith('tab2');
  });

  it('works in controlled mode', async () => {
    const onTabChange = vi.fn();
    const { rerender } = render(
      <TabbedContainer tabs={mockTabs} activeTab="tab1" onTabChange={onTabChange} />
    );
    
    expect(screen.getByText('Content 1')).toBeInTheDocument();
    
    // Click tab 2 - should call onTabChange but not change content (controlled)
    fireEvent.click(screen.getByText('Tab 2'));
    expect(onTabChange).toHaveBeenCalledWith('tab2');
    
    // Content still shows tab 1 because activeTab is still 'tab1'
    expect(screen.getByText('Content 1')).toBeInTheDocument();
    
    // Rerender with activeTab='tab2'
    rerender(
      <TabbedContainer tabs={mockTabs} activeTab="tab2" onTabChange={onTabChange} />
    );
    
    await waitFor(() => {
      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });
  });

  it('renders tab icons when provided', () => {
    const tabsWithIcons: Tab[] = [
      { id: 'tab1', label: 'Tab 1', content: <div>Content</div>, icon: <span data-testid="icon1">🎵</span> },
    ];
    render(<TabbedContainer tabs={tabsWithIcons} />);
    expect(screen.getByTestId('icon1')).toBeInTheDocument();
  });

  it('renders tab badges when provided', () => {
    const tabsWithBadges: Tab[] = [
      { id: 'tab1', label: 'Tab 1', content: <div>Content</div>, badge: <span data-testid="badge1">5</span> },
    ];
    render(<TabbedContainer tabs={tabsWithBadges} />);
    expect(screen.getByTestId('badge1')).toBeInTheDocument();
  });

  it('disables tabs when disabled is true', () => {
    const tabsWithDisabled: Tab[] = [
      { id: 'tab1', label: 'Tab 1', content: <div>Content 1</div> },
      { id: 'tab2', label: 'Tab 2', content: <div>Content 2</div>, disabled: true },
    ];
    render(<TabbedContainer tabs={tabsWithDisabled} />);
    
    const disabledTab = screen.getByText('Tab 2').closest('button');
    expect(disabledTab).toBeDisabled();
  });

  it('does not switch to disabled tab on click', () => {
    const onTabChange = vi.fn();
    const tabsWithDisabled: Tab[] = [
      { id: 'tab1', label: 'Tab 1', content: <div>Content 1</div> },
      { id: 'tab2', label: 'Tab 2', content: <div>Content 2</div>, disabled: true },
    ];
    render(<TabbedContainer tabs={tabsWithDisabled} onTabChange={onTabChange} />);
    
    fireEvent.click(screen.getByText('Tab 2'));
    expect(onTabChange).not.toHaveBeenCalled();
    expect(screen.getByText('Content 1')).toBeInTheDocument();
  });

  it('supports keyboard navigation with ArrowRight', async () => {
    render(<TabbedContainer tabs={mockTabs} />);
    
    const tab1 = screen.getByText('Tab 1').closest('button')!;
    fireEvent.keyDown(tab1, { key: 'ArrowRight' });
    
    await waitFor(() => {
      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });
  });

  it('supports keyboard navigation with ArrowLeft', async () => {
    render(<TabbedContainer tabs={mockTabs} defaultTab="tab2" />);
    
    const tab2 = screen.getByText('Tab 2').closest('button')!;
    fireEvent.keyDown(tab2, { key: 'ArrowLeft' });
    
    await waitFor(() => {
      expect(screen.getByText('Content 1')).toBeInTheDocument();
    });
  });

  it('supports keyboard navigation with Home', async () => {
    render(<TabbedContainer tabs={mockTabs} defaultTab="tab3" />);
    
    const tab3 = screen.getByText('Tab 3').closest('button')!;
    fireEvent.keyDown(tab3, { key: 'Home' });
    
    await waitFor(() => {
      expect(screen.getByText('Content 1')).toBeInTheDocument();
    });
  });

  it('supports keyboard navigation with End', async () => {
    render(<TabbedContainer tabs={mockTabs} />);
    
    const tab1 = screen.getByText('Tab 1').closest('button')!;
    fireEvent.keyDown(tab1, { key: 'End' });
    
    await waitFor(() => {
      expect(screen.getByText('Content 3')).toBeInTheDocument();
    });
  });

  it('wraps around with ArrowRight at end', async () => {
    render(<TabbedContainer tabs={mockTabs} defaultTab="tab3" />);
    
    const tab3 = screen.getByText('Tab 3').closest('button')!;
    fireEvent.keyDown(tab3, { key: 'ArrowRight' });
    
    await waitFor(() => {
      expect(screen.getByText('Content 1')).toBeInTheDocument();
    });
  });

  it('wraps around with ArrowLeft at start', async () => {
    render(<TabbedContainer tabs={mockTabs} />);
    
    const tab1 = screen.getByText('Tab 1').closest('button')!;
    fireEvent.keyDown(tab1, { key: 'ArrowLeft' });
    
    await waitFor(() => {
      expect(screen.getByText('Content 3')).toBeInTheDocument();
    });
  });

  it('applies glass styling by default', () => {
    render(<TabbedContainer tabs={mockTabs} />);
    const container = screen.getByText('Tab 1').closest('.backdrop-blur-md');
    expect(container).toBeInTheDocument();
  });

  it('does not apply glass styling when glass is false', () => {
    render(<TabbedContainer tabs={mockTabs} glass={false} />);
    const container = screen.getByText('Tab 1').closest('.backdrop-blur-md');
    expect(container).not.toBeInTheDocument();
  });

  it('renders tabs at bottom when tabPosition is bottom', () => {
    render(<TabbedContainer tabs={mockTabs} tabPosition="bottom" />);
    // The tablist should come after the content in the DOM
    const tablist = screen.getByRole('tablist');
    const tabpanel = screen.getByRole('tabpanel');
    
    // Check that tabpanel comes before tablist in DOM order
    expect(tabpanel.compareDocumentPosition(tablist) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('has correct ARIA attributes', () => {
    render(<TabbedContainer tabs={mockTabs} />);
    
    const tablist = screen.getByRole('tablist');
    expect(tablist).toHaveAttribute('aria-orientation', 'horizontal');
    
    const tabs = screen.getAllByRole('tab');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
    
    const tabpanel = screen.getByRole('tabpanel');
    expect(tabpanel).toHaveAttribute('id', 'tabpanel-tab1');
  });

  it('applies custom className', () => {
    render(<TabbedContainer tabs={mockTabs} className="custom-class" />);
    const container = screen.getByRole('tablist').closest('.custom-class');
    expect(container).toBeInTheDocument();
  });

  it('applies custom tabBarClassName', () => {
    render(<TabbedContainer tabs={mockTabs} tabBarClassName="custom-tabbar" />);
    const tablist = screen.getByRole('tablist');
    expect(tablist).toHaveClass('custom-tabbar');
  });

  it('applies custom contentClassName', () => {
    render(<TabbedContainer tabs={mockTabs} contentClassName="custom-content" />);
    const tabpanel = screen.getByRole('tabpanel');
    expect(tabpanel).toHaveClass('custom-content');
  });

  it('supports pills variant', () => {
    render(<TabbedContainer tabs={mockTabs} variant="pills" />);
    const activeTab = screen.getByText('Tab 1').closest('button');
    expect(activeTab).toHaveClass('rounded-lg');
  });

  it('supports underline variant', () => {
    render(<TabbedContainer tabs={mockTabs} variant="underline" />);
    const activeTab = screen.getByText('Tab 1').closest('button');
    expect(activeTab).toHaveClass('border-b-2');
  });
});
