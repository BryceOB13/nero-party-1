import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { CompactLayout } from '../CompactLayout';

describe('CompactLayout', () => {
  it('renders children correctly', () => {
    render(<CompactLayout>Test Content</CompactLayout>);
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('applies 100vh constraint class', () => {
    render(
      <CompactLayout data-testid="compact-layout">
        Content
      </CompactLayout>
    );
    // The component wraps content in a div with h-screen-fixed class
    const layout = screen.getByText('Content').closest('.h-screen-fixed');
    expect(layout).toBeInTheDocument();
  });

  it('renders sidebar when provided', () => {
    render(
      <CompactLayout sidebar={<div>Sidebar Content</div>}>
        Main Content
      </CompactLayout>
    );
    expect(screen.getByText('Sidebar Content')).toBeInTheDocument();
    expect(screen.getByText('Main Content')).toBeInTheDocument();
  });

  it('applies sidebar layout class when sidebar is provided', () => {
    render(
      <CompactLayout sidebar={<div>Sidebar</div>}>
        Main Content
      </CompactLayout>
    );
    const mainArea = screen.getByText('Main Content').closest('main');
    expect(mainArea).toHaveClass('layout-with-sidebar');
  });

  it('does not apply sidebar layout class when no sidebar', () => {
    render(<CompactLayout>Main Content</CompactLayout>);
    const mainArea = screen.getByText('Main Content').closest('main');
    expect(mainArea).not.toHaveClass('layout-with-sidebar');
  });

  it('renders overlay when provided', async () => {
    render(
      <CompactLayout overlay={<div>Overlay Content</div>}>
        Main Content
      </CompactLayout>
    );
    await waitFor(() => {
      expect(screen.getByText('Overlay Content')).toBeInTheDocument();
    });
  });

  it('renders header when provided', () => {
    render(
      <CompactLayout header={<div>Header Content</div>}>
        Main Content
      </CompactLayout>
    );
    expect(screen.getByText('Header Content')).toBeInTheDocument();
  });

  it('renders footer when provided', () => {
    render(
      <CompactLayout footer={<div>Footer Content</div>}>
        Main Content
      </CompactLayout>
    );
    expect(screen.getByText('Footer Content')).toBeInTheDocument();
  });

  it('applies gradient background by default', () => {
    render(<CompactLayout>Content</CompactLayout>);
    const layout = screen.getByText('Content').closest('.bg-gradient-to-br');
    expect(layout).toBeInTheDocument();
  });

  it('applies solid background when specified', () => {
    render(<CompactLayout background="solid">Content</CompactLayout>);
    const layout = screen.getByText('Content').closest('.bg-gray-900');
    expect(layout).toBeInTheDocument();
  });

  it('applies no background when specified', () => {
    render(<CompactLayout background="none">Content</CompactLayout>);
    const layout = screen.getByText('Content').closest('.h-screen-fixed');
    expect(layout).not.toHaveClass('bg-gradient-to-br');
    expect(layout).not.toHaveClass('bg-gray-900');
  });

  it('renders floating orbs by default', () => {
    render(<CompactLayout>Content</CompactLayout>);
    // Orbs are rendered as blur-3xl elements
    const orbs = document.querySelectorAll('.blur-3xl');
    expect(orbs.length).toBeGreaterThan(0);
  });

  it('does not render floating orbs when withOrbs is false', () => {
    render(<CompactLayout withOrbs={false}>Content</CompactLayout>);
    const orbs = document.querySelectorAll('.blur-3xl');
    expect(orbs.length).toBe(0);
  });

  it('hides sidebar on mobile by default', () => {
    render(
      <CompactLayout sidebar={<div>Sidebar</div>}>
        Main Content
      </CompactLayout>
    );
    const sidebar = screen.getByText('Sidebar').closest('aside');
    expect(sidebar).toHaveClass('hidden');
    expect(sidebar).toHaveClass('md:block');
  });

  it('shows sidebar on mobile when sidebarVisibleOnMobile is true', () => {
    render(
      <CompactLayout sidebar={<div>Sidebar</div>} sidebarVisibleOnMobile>
        Main Content
      </CompactLayout>
    );
    const sidebar = screen.getByText('Sidebar').closest('aside');
    expect(sidebar).not.toHaveClass('hidden');
  });

  it('applies custom className', () => {
    render(<CompactLayout className="custom-class">Content</CompactLayout>);
    const layout = screen.getByText('Content').closest('.custom-class');
    expect(layout).toBeInTheDocument();
  });

  it('applies custom contentClassName', () => {
    render(<CompactLayout contentClassName="custom-content">Content</CompactLayout>);
    const mainArea = screen.getByText('Content').closest('main');
    expect(mainArea).toHaveClass('custom-content');
  });

  it('applies custom sidebarClassName', () => {
    render(
      <CompactLayout sidebar={<div>Sidebar</div>} sidebarClassName="custom-sidebar">
        Content
      </CompactLayout>
    );
    const sidebar = screen.getByText('Sidebar').closest('aside');
    expect(sidebar).toHaveClass('custom-sidebar');
  });
});
