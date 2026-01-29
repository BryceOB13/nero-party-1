import { forwardRef, ReactNode, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface Tab {
  /** Unique identifier for the tab */
  id: string;
  /** Display label for the tab */
  label: string;
  /** Content to render when tab is active */
  content: ReactNode;
  /** Optional icon to display in tab */
  icon?: ReactNode;
  /** Optional badge/count to display in tab */
  badge?: ReactNode;
  /** Whether the tab is disabled */
  disabled?: boolean;
}

export interface TabbedContainerProps {
  /** Array of tab configurations */
  tabs: Tab[];
  /** ID of the default active tab */
  defaultTab?: string;
  /** Controlled active tab ID */
  activeTab?: string;
  /** Callback when active tab changes */
  onTabChange?: (tabId: string) => void;
  /** Additional CSS classes for the container */
  className?: string;
  /** Additional CSS classes for the tab bar */
  tabBarClassName?: string;
  /** Additional CSS classes for the content area */
  contentClassName?: string;
  /** Whether to apply glass styling */
  glass?: boolean;
  /** Tab bar position */
  tabPosition?: 'top' | 'bottom';
  /** Whether to animate tab content transitions */
  animated?: boolean;
  /** Whether content should scroll internally */
  scrollableContent?: boolean;
  /** Tab bar variant */
  variant?: 'default' | 'pills' | 'underline';
}

/**
 * TabbedContainer - A tabbed interface for content switching
 * 
 * Features:
 * - Multiple tab variants (default, pills, underline)
 * - Smooth content transitions
 * - Controlled and uncontrolled modes
 * - Icon and badge support
 * - Keyboard navigation
 * - Internal scrolling for content
 * 
 * Requirements: 1.3 (tabbed interfaces for limited viewport height)
 */
export const TabbedContainer = forwardRef<HTMLDivElement, TabbedContainerProps>(
  (
    {
      tabs,
      defaultTab,
      activeTab: controlledActiveTab,
      onTabChange,
      className = '',
      tabBarClassName = '',
      contentClassName = '',
      glass = true,
      tabPosition = 'top',
      animated = true,
      scrollableContent = true,
      variant = 'default',
    },
    ref
  ) => {
    // Determine initial tab
    const initialTab = defaultTab || tabs[0]?.id || '';
    
    // Internal state for uncontrolled mode
    const [internalActiveTab, setInternalActiveTab] = useState(initialTab);
    
    // Determine if controlled or uncontrolled
    const isControlled = controlledActiveTab !== undefined;
    const activeTabId = isControlled ? controlledActiveTab : internalActiveTab;

    // Find active tab content
    const activeTabContent = useMemo(
      () => tabs.find((tab) => tab.id === activeTabId)?.content,
      [tabs, activeTabId]
    );

    // Find active tab index for animation direction
    const activeTabIndex = useMemo(
      () => tabs.findIndex((tab) => tab.id === activeTabId),
      [tabs, activeTabId]
    );

    const handleTabClick = useCallback(
      (tabId: string) => {
        const tab = tabs.find((t) => t.id === tabId);
        if (tab?.disabled) return;

        if (!isControlled) {
          setInternalActiveTab(tabId);
        }
        
        onTabChange?.(tabId);
      },
      [tabs, isControlled, onTabChange]
    );

    const handleKeyDown = useCallback(
      (event: React.KeyboardEvent, currentIndex: number) => {
        let newIndex = currentIndex;

        switch (event.key) {
          case 'ArrowLeft':
            event.preventDefault();
            newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
            break;
          case 'ArrowRight':
            event.preventDefault();
            newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
            break;
          case 'Home':
            event.preventDefault();
            newIndex = 0;
            break;
          case 'End':
            event.preventDefault();
            newIndex = tabs.length - 1;
            break;
          default:
            return;
        }

        // Skip disabled tabs
        while (tabs[newIndex]?.disabled && newIndex !== currentIndex) {
          if (event.key === 'ArrowLeft' || event.key === 'End') {
            newIndex = newIndex > 0 ? newIndex - 1 : tabs.length - 1;
          } else {
            newIndex = newIndex < tabs.length - 1 ? newIndex + 1 : 0;
          }
        }

        if (!tabs[newIndex]?.disabled) {
          handleTabClick(tabs[newIndex].id);
        }
      },
      [tabs, handleTabClick]
    );

    const glassClasses = glass
      ? 'bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl'
      : '';

    // Tab bar styles based on variant
    const getTabStyles = (tab: Tab, isActive: boolean) => {
      const baseStyles = `
        flex items-center justify-center gap-1.5
        h-[var(--layout-tab-height)]
        px-4
        text-sm font-medium
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-purple-400/50
        ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `;

      switch (variant) {
        case 'pills':
          return `
            ${baseStyles}
            rounded-lg
            ${isActive
              ? 'bg-purple-500/30 text-white border border-purple-400/30'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
            }
          `;
        case 'underline':
          return `
            ${baseStyles}
            border-b-2
            ${isActive
              ? 'text-white border-purple-400'
              : 'text-gray-400 border-transparent hover:text-white hover:border-white/30'
            }
          `;
        default:
          return `
            ${baseStyles}
            ${isActive
              ? 'text-white bg-white/10'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
            }
          `;
      }
    };

    const tabBar = (
      <div
        role="tablist"
        aria-orientation="horizontal"
        className={`
          flex items-center
          ${variant === 'pills' ? 'gap-2 p-2' : ''}
          ${variant === 'underline' ? 'border-b border-white/10' : ''}
          ${variant === 'default' ? 'border-b border-white/10' : ''}
          ${tabBarClassName}
        `}
      >
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeTabId;
          
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              disabled={tab.disabled}
              onClick={() => handleTabClick(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={getTabStyles(tab, isActive)}
            >
              {tab.icon && (
                <span className="flex-shrink-0">
                  {tab.icon}
                </span>
              )}
              <span className="truncate">{tab.label}</span>
              {tab.badge && (
                <span className="flex-shrink-0 ml-1">
                  {tab.badge}
                </span>
              )}
              
              {/* Active indicator for default variant */}
              {variant === 'default' && isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-400"
                  transition={{ duration: 0.2 }}
                />
              )}
            </button>
          );
        })}
      </div>
    );

    const content = (
      <div
        role="tabpanel"
        id={`tabpanel-${activeTabId}`}
        aria-labelledby={activeTabId}
        className={`
          flex-fill min-h-0
          ${scrollableContent ? 'scroll-container scrollbar-thin' : ''}
          ${contentClassName}
        `}
      >
        {animated ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTabId}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {activeTabContent}
            </motion.div>
          </AnimatePresence>
        ) : (
          activeTabContent
        )}
      </div>
    );

    return (
      <div
        ref={ref}
        className={`
          ${glassClasses}
          flex flex-col
          overflow-hidden
          h-full
          ${className}
        `}
      >
        {tabPosition === 'top' && tabBar}
        {content}
        {tabPosition === 'bottom' && tabBar}
      </div>
    );
  }
);

TabbedContainer.displayName = 'TabbedContainer';

export default TabbedContainer;
