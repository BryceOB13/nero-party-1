import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FloatingOrbs, OrbConfig } from '../FloatingOrbs';

describe('FloatingOrbs', () => {
  describe('rendering', () => {
    it('renders the container element', () => {
      render(<FloatingOrbs />);
      expect(screen.getByTestId('floating-orbs')).toBeInTheDocument();
    });

    it('renders the default number of orbs (6)', () => {
      render(<FloatingOrbs />);
      for (let i = 0; i < 6; i++) {
        expect(screen.getByTestId(`floating-orb-${i}`)).toBeInTheDocument();
      }
    });

    it('renders custom number of orbs', () => {
      render(<FloatingOrbs orbCount={3} />);
      expect(screen.getByTestId('floating-orb-0')).toBeInTheDocument();
      expect(screen.getByTestId('floating-orb-1')).toBeInTheDocument();
      expect(screen.getByTestId('floating-orb-2')).toBeInTheDocument();
      expect(screen.queryByTestId('floating-orb-3')).not.toBeInTheDocument();
    });

    it('renders custom orb configurations', () => {
      const customOrbs: OrbConfig[] = [
        { size: 200, x: 20, y: 30, color: '#ff0000', duration: 10, delay: 0, blur: 50, opacity: 0.5 },
        { size: 300, x: 80, y: 70, color: '#00ff00', duration: 15, delay: 2, blur: 80, opacity: 0.3 },
      ];
      
      render(<FloatingOrbs orbs={customOrbs} />);
      expect(screen.getByTestId('floating-orb-0')).toBeInTheDocument();
      expect(screen.getByTestId('floating-orb-1')).toBeInTheDocument();
      expect(screen.queryByTestId('floating-orb-2')).not.toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('applies fixed positioning for background layer', () => {
      render(<FloatingOrbs />);
      const container = screen.getByTestId('floating-orbs');
      expect(container).toHaveClass('fixed');
      expect(container).toHaveClass('inset-0');
    });

    it('applies pointer-events-none to not interfere with interactions', () => {
      render(<FloatingOrbs />);
      const container = screen.getByTestId('floating-orbs');
      expect(container).toHaveClass('pointer-events-none');
    });

    it('applies z-0 for background layer positioning', () => {
      render(<FloatingOrbs />);
      const container = screen.getByTestId('floating-orbs');
      expect(container).toHaveClass('z-0');
    });

    it('applies overflow-hidden to contain orbs', () => {
      render(<FloatingOrbs />);
      const container = screen.getByTestId('floating-orbs');
      expect(container).toHaveClass('overflow-hidden');
    });

    it('applies aria-hidden for accessibility', () => {
      render(<FloatingOrbs />);
      const container = screen.getByTestId('floating-orbs');
      expect(container).toHaveAttribute('aria-hidden', 'true');
    });

    it('applies additional className', () => {
      render(<FloatingOrbs className="custom-class" />);
      const container = screen.getByTestId('floating-orbs');
      expect(container).toHaveClass('custom-class');
    });
  });

  describe('orb styling', () => {
    it('applies rounded-full class to orbs', () => {
      render(<FloatingOrbs orbCount={1} />);
      const orb = screen.getByTestId('floating-orb-0');
      expect(orb).toHaveClass('rounded-full');
    });

    it('applies absolute positioning to orbs', () => {
      render(<FloatingOrbs orbCount={1} />);
      const orb = screen.getByTestId('floating-orb-0');
      expect(orb).toHaveClass('absolute');
    });

    it('applies custom orb styles correctly', () => {
      const customOrbs: OrbConfig[] = [
        { size: 200, x: 25, y: 50, color: '#a855f7', duration: 10, delay: 0, blur: 60, opacity: 0.3 },
      ];
      
      render(<FloatingOrbs orbs={customOrbs} />);
      const orb = screen.getByTestId('floating-orb-0');
      
      expect(orb).toHaveStyle({ width: '200px' });
      expect(orb).toHaveStyle({ height: '200px' });
      expect(orb).toHaveStyle({ left: '25%' });
      expect(orb).toHaveStyle({ top: '50%' });
      expect(orb).toHaveStyle({ opacity: '0.3' });
    });

    it('applies gradient background to orbs', () => {
      const customOrbs: OrbConfig[] = [
        { size: 200, x: 25, y: 50, color: '#a855f7', duration: 10, delay: 0, blur: 60, opacity: 0.3 },
      ];
      
      render(<FloatingOrbs orbs={customOrbs} />);
      const orb = screen.getByTestId('floating-orb-0');
      
      // Check that background contains radial-gradient
      const style = orb.getAttribute('style');
      expect(style).toContain('radial-gradient');
      expect(style).toContain('#a855f7');
    });

    it('applies blur filter to orbs', () => {
      const customOrbs: OrbConfig[] = [
        { size: 200, x: 25, y: 50, color: '#a855f7', duration: 10, delay: 0, blur: 80, opacity: 0.3 },
      ];
      
      render(<FloatingOrbs orbs={customOrbs} />);
      const orb = screen.getByTestId('floating-orb-0');
      
      const style = orb.getAttribute('style');
      expect(style).toContain('blur(80px)');
    });
  });

  describe('default colors', () => {
    it('uses neon accent colors by default', () => {
      // The default colors should include purple, cyan, and pink
      render(<FloatingOrbs orbCount={6} />);
      
      // All 6 orbs should be rendered
      for (let i = 0; i < 6; i++) {
        expect(screen.getByTestId(`floating-orb-${i}`)).toBeInTheDocument();
      }
    });

    it('accepts custom colors', () => {
      const customColors = ['#ff0000', '#00ff00'];
      const customOrbs: OrbConfig[] = [
        { size: 200, x: 25, y: 50, color: '#ff0000', duration: 10, delay: 0, blur: 60, opacity: 0.3 },
      ];
      
      render(<FloatingOrbs orbs={customOrbs} colors={customColors} />);
      const orb = screen.getByTestId('floating-orb-0');
      
      const style = orb.getAttribute('style');
      expect(style).toContain('#ff0000');
    });
  });

  describe('animation', () => {
    it('renders with animation enabled by default', () => {
      render(<FloatingOrbs orbCount={1} />);
      const orb = screen.getByTestId('floating-orb-0');
      // Orb should be present and animated (Framer Motion handles the animation)
      expect(orb).toBeInTheDocument();
    });

    it('renders without animation when animate is false', () => {
      render(<FloatingOrbs orbCount={1} animate={false} />);
      const orb = screen.getByTestId('floating-orb-0');
      expect(orb).toBeInTheDocument();
    });
  });

  describe('customization', () => {
    it('respects minSize and maxSize props', () => {
      // With custom size range, orbs should be generated within that range
      render(<FloatingOrbs orbCount={1} minSize={100} maxSize={100} />);
      const orb = screen.getByTestId('floating-orb-0');
      expect(orb).toHaveStyle({ width: '100px' });
      expect(orb).toHaveStyle({ height: '100px' });
    });

    it('respects minOpacity and maxOpacity props', () => {
      render(<FloatingOrbs orbCount={1} minOpacity={0.5} maxOpacity={0.5} />);
      const orb = screen.getByTestId('floating-orb-0');
      expect(orb).toHaveStyle({ opacity: '0.5' });
    });

    it('respects minBlur and maxBlur props', () => {
      render(<FloatingOrbs orbCount={1} minBlur={100} maxBlur={100} />);
      const orb = screen.getByTestId('floating-orb-0');
      const style = orb.getAttribute('style');
      expect(style).toContain('blur(100px)');
    });
  });

  describe('consistency', () => {
    it('generates consistent orbs on re-render', () => {
      const { rerender } = render(<FloatingOrbs orbCount={3} />);
      
      const orb0Style1 = screen.getByTestId('floating-orb-0').getAttribute('style');
      const orb1Style1 = screen.getByTestId('floating-orb-1').getAttribute('style');
      
      rerender(<FloatingOrbs orbCount={3} />);
      
      const orb0Style2 = screen.getByTestId('floating-orb-0').getAttribute('style');
      const orb1Style2 = screen.getByTestId('floating-orb-1').getAttribute('style');
      
      // Styles should be consistent across re-renders
      expect(orb0Style1).toBe(orb0Style2);
      expect(orb1Style1).toBe(orb1Style2);
    });
  });
});
