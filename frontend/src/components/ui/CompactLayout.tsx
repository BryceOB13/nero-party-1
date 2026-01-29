import { forwardRef, ReactNode } from 'react';
import { motion, AnimatePresence, HTMLMotionProps } from 'framer-motion';

export interface CompactLayoutProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  /** Main content to render */
  children: ReactNode;
  /** Optional sidebar content (renders on the left) */
  sidebar?: ReactNode;
  /** Optional overlay content (renders above everything) */
  overlay?: ReactNode;
  /** Additional CSS classes for the main container */
  className?: string;
  /** Additional CSS classes for the content area */
  contentClassName?: string;
  /** Additional CSS classes for the sidebar */
  sidebarClassName?: string;
  /** Whether to show the sidebar on mobile (default: false, sidebar collapses) */
  sidebarVisibleOnMobile?: boolean;
  /** Background style variant */
  background?: 'gradient' | 'solid' | 'none';
  /** Whether to include floating orbs decoration */
  withOrbs?: boolean;
  /** Header content (fixed at top) */
  header?: ReactNode;
  /** Footer content (fixed at bottom) */
  footer?: ReactNode;
}

/**
 * CompactLayout - A wrapper component ensuring 100vh constraint with no body scroll
 * 
 * Features:
 * - Enforces 100vh/100dvh height constraint
 * - Supports optional sidebar layout (CSS Grid)
 * - Supports overlay content for modals/events
 * - Internal scrolling within designated containers
 * - Mobile-first responsive design
 * - Optional floating orbs background decoration
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */
export const CompactLayout = forwardRef<HTMLDivElement, CompactLayoutProps>(
  (
    {
      children,
      sidebar,
      overlay,
      className = '',
      contentClassName = '',
      sidebarClassName = '',
      sidebarVisibleOnMobile = false,
      background = 'gradient',
      withOrbs = true,
      header,
      footer,
      ...motionProps
    },
    ref
  ) => {
    const backgroundClasses = {
      gradient: 'bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900',
      solid: 'bg-gray-900',
      none: '',
    };

    const hasSidebar = !!sidebar;

    return (
      <div
        ref={ref}
        className={`
          h-screen-fixed
          ${backgroundClasses[background]}
          relative
          flex flex-col
          ${className}
        `}
      >
        {/* Floating orbs background decoration */}
        {withOrbs && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            <motion.div
              animate={{
                x: [0, 100, 0],
                y: [0, -50, 0],
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: 'linear',
              }}
              className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"
            />
            <motion.div
              animate={{
                x: [0, -80, 0],
                y: [0, 80, 0],
              }}
              transition={{
                duration: 25,
                repeat: Infinity,
                ease: 'linear',
              }}
              className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl"
            />
            <motion.div
              animate={{
                x: [0, 60, 0],
                y: [0, 60, 0],
              }}
              transition={{
                duration: 15,
                repeat: Infinity,
                ease: 'linear',
              }}
              className="absolute top-1/2 right-1/3 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl"
            />
          </div>
        )}

        {/* Header (fixed at top) */}
        {header && (
          <header className="relative z-10 flex-shrink-0">
            {header}
          </header>
        )}

        {/* Main content area */}
        <main
          className={`
            relative z-10
            flex-fill
            ${hasSidebar ? 'layout-with-sidebar' : ''}
            p-[var(--layout-spacing-md)]
            ${contentClassName}
          `}
        >
          {/* Sidebar */}
          {hasSidebar && (
            <aside
              className={`
                ${sidebarVisibleOnMobile ? '' : 'hidden md:block'}
                flex-shrink-0
                overflow-hidden
                ${sidebarClassName}
              `}
            >
              <div className="h-full scroll-container scrollbar-thin">
                {sidebar}
              </div>
            </aside>
          )}

          {/* Main content */}
          <div className="flex-fill min-h-0 flex flex-col">
            {children}
          </div>
        </main>

        {/* Footer (fixed at bottom) */}
        {footer && (
          <footer className="relative z-10 flex-shrink-0">
            {footer}
          </footer>
        )}

        {/* Overlay layer for modals, events, power-ups */}
        <AnimatePresence>
          {overlay && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 z-50 flex items-center justify-center"
            >
              {overlay}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

CompactLayout.displayName = 'CompactLayout';

export default CompactLayout;
