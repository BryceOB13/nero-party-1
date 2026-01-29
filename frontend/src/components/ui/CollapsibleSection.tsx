import { forwardRef, ReactNode, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

export interface CollapsibleSectionProps {
  /** Section title displayed in the header */
  title: string;
  /** Content to render when expanded */
  children: ReactNode;
  /** Whether the section is open by default */
  defaultOpen?: boolean;
  /** Controlled open state (makes component controlled) */
  isOpen?: boolean;
  /** Callback when open state changes */
  onToggle?: (isOpen: boolean) => void;
  /** Additional CSS classes for the container */
  className?: string;
  /** Additional CSS classes for the header */
  headerClassName?: string;
  /** Additional CSS classes for the content */
  contentClassName?: string;
  /** Icon to display in the header (optional) */
  icon?: ReactNode;
  /** Whether to apply glass styling */
  glass?: boolean;
  /** Whether the section can be collapsed (false = always open) */
  collapsible?: boolean;
  /** Badge or count to display in header */
  badge?: ReactNode;
  /** Animation duration in seconds */
  animationDuration?: number;
}

/**
 * CollapsibleSection - A collapsible container for space management
 * 
 * Features:
 * - Smooth expand/collapse animations
 * - Controlled and uncontrolled modes
 * - Glass styling option
 * - Icon and badge support
 * - Keyboard accessible
 * 
 * Requirements: 1.3 (collapsible sections for limited viewport height)
 */
export const CollapsibleSection = forwardRef<HTMLDivElement, CollapsibleSectionProps>(
  (
    {
      title,
      children,
      defaultOpen = true,
      isOpen: controlledIsOpen,
      onToggle,
      className = '',
      headerClassName = '',
      contentClassName = '',
      icon,
      glass = true,
      collapsible = true,
      badge,
      animationDuration = 0.3,
    },
    ref
  ) => {
    // Internal state for uncontrolled mode
    const [internalIsOpen, setInternalIsOpen] = useState(defaultOpen);
    
    // Determine if controlled or uncontrolled
    const isControlled = controlledIsOpen !== undefined;
    const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

    const handleToggle = useCallback(() => {
      if (!collapsible) return;
      
      const newState = !isOpen;
      
      if (!isControlled) {
        setInternalIsOpen(newState);
      }
      
      onToggle?.(newState);
    }, [isOpen, isControlled, collapsible, onToggle]);

    const handleKeyDown = useCallback(
      (event: React.KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleToggle();
        }
      },
      [handleToggle]
    );

    const glassClasses = glass
      ? 'bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl'
      : '';

    const headerGlassClasses = glass
      ? 'hover:bg-white/5'
      : '';

    return (
      <div
        ref={ref}
        className={`
          ${glassClasses}
          overflow-hidden
          ${className}
        `}
      >
        {/* Header */}
        <div
          role={collapsible ? 'button' : undefined}
          tabIndex={collapsible ? 0 : undefined}
          aria-expanded={collapsible ? isOpen : undefined}
          onClick={handleToggle}
          onKeyDown={collapsible ? handleKeyDown : undefined}
          className={`
            flex items-center justify-between
            h-[var(--layout-collapsible-header-height)]
            px-4
            ${collapsible ? 'cursor-pointer' : ''}
            ${headerGlassClasses}
            transition-colors duration-200
            ${headerClassName}
          `}
        >
          <div className="flex items-center gap-2 min-w-0">
            {icon && (
              <span className="flex-shrink-0 text-purple-400">
                {icon}
              </span>
            )}
            <h3 className="text-sm font-semibold text-white truncate">
              {title}
            </h3>
            {badge && (
              <span className="flex-shrink-0">
                {badge}
              </span>
            )}
          </div>
          
          {collapsible && (
            <motion.span
              animate={{ rotate: isOpen ? 0 : -90 }}
              transition={{ duration: animationDuration * 0.5 }}
              className="flex-shrink-0 text-gray-400"
            >
              {isOpen ? (
                <ExpandLessIcon fontSize="small" />
              ) : (
                <ExpandMoreIcon fontSize="small" />
              )}
            </motion.span>
          )}
        </div>

        {/* Content */}
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{
                height: { duration: animationDuration, ease: 'easeInOut' },
                opacity: { duration: animationDuration * 0.5, ease: 'easeInOut' },
              }}
              className="overflow-hidden"
            >
              <div
                className={`
                  px-4 pb-4
                  ${contentClassName}
                `}
              >
                {children}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

CollapsibleSection.displayName = 'CollapsibleSection';

export default CollapsibleSection;
