// Glassmorphism UI Components
// These components implement the glassmorphism design system with:
// - Frosted glass effect with backdrop blur
// - Semi-transparent backgrounds
// - Subtle borders
// - Rounded corners
// - Smooth animations

export { GlassCard, type GlassCardProps } from './GlassCard';
export { GlassButton, type GlassButtonProps, type GlassButtonVariant, type GlassButtonSize } from './GlassButton';
export { GlassInput, type GlassInputProps, type GlassInputSize } from './GlassInput';
export { PlayerAvatar, type PlayerAvatarProps, type PlayerAvatarSize } from './PlayerAvatar';
export { ScoreDisplay, type ScoreDisplayProps, type ScoreDisplaySize } from './ScoreDisplay';
export { FloatingOrbs, type FloatingOrbsProps, type OrbConfig } from './FloatingOrbs';
export { NeroLogo } from './NeroLogo';
export { BackButton } from './BackButton';

// Layout System Components (Phase 0)
// These components ensure 100vh constraint with no body scroll
export { CompactLayout, type CompactLayoutProps } from './CompactLayout';
export { CollapsibleSection, type CollapsibleSectionProps } from './CollapsibleSection';
export { TabbedContainer, type TabbedContainerProps, type Tab } from './TabbedContainer';

// Toast notification system
export { ToastItem, ToastContainer, type Toast, type ToastOptions, type ToastType, type ToastAction, type ToastProps, type ToastContainerProps } from './Toast';
export { ToastProvider, useToast, type ToastProviderProps } from './ToastProvider';

// Achievement notification system (Phase 2)
// **Validates: Requirement 22.6** - Achievement_Toast component for celebration animations
export { AchievementToast, AchievementToastContainer, type AchievementToastProps, type AchievementToastContainerProps } from './AchievementToast';

// Event animation system (Phase 3)
// **Validates: Requirements 22.3, 11.4** - Event_Animation_Overlay component for dramatic mini-event reveals
export { EventAnimationOverlay, useEventAnimationOverlay, type EventAnimationOverlayProps, type EventSoundType } from './EventAnimationOverlay';

// Event effect display (Phase 3)
// **Validates: Requirement 11.4** - Show affected players and score changes with animations
export { EventEffectDisplay, EventEffectDisplayContainer, type EventEffectDisplayProps, type EventEffectDisplayContainerProps } from './EventEffectDisplay';

// Error handling components
export { ReconnectionIndicator, type ReconnectionIndicatorProps } from './ReconnectionIndicator';
export { ErrorBoundary, type ErrorBoundaryProps, type ErrorBoundaryState } from './ErrorBoundary';
