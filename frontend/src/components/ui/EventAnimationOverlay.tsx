import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { MiniEvent, MiniEventEffect } from '../../types';

/**
 * Props for the EventAnimationOverlay component.
 * **Validates: Requirements 22.3, 11.4** - Event_Animation_Overlay component for dramatic mini-event reveals
 */
export interface EventAnimationOverlayProps {
  /** The mini-event to display */
  event: MiniEvent;
  /** Callback when the animation completes and overlay should be dismissed */
  onComplete: () => void;
  /** Optional callback for sound effect triggers */
  onSoundEffect?: (soundType: EventSoundType) => void;
  /** Duration in ms before auto-dismiss (default: 4000) */
  duration?: number;
  /** Whether to show the event immediately or with a delay */
  immediate?: boolean;
}

/**
 * Sound effect types that can be triggered during event animations.
 * Provides hooks for external sound systems to play appropriate audio.
 */
export type EventSoundType = 
  | 'event_intro'      // Initial dramatic reveal sound
  | 'event_impact'     // Main effect sound when event name appears
  | 'event_positive'   // Positive outcome sound (multipliers, bonuses)
  | 'event_negative'   // Negative outcome sound (steal, sabotage)
  | 'event_neutral'    // Neutral/chaotic sound (swap, shuffle)
  | 'event_dismiss';   // Fade out sound

/**
 * Animation style configuration per event effect type.
 * Each event type has unique visual styling to match its gameplay impact.
 */
interface EventAnimationStyle {
  gradient: string;
  glow: string;
  particleColors: string[];
  iconScale: number;
  shakeIntensity: number;
  soundType: EventSoundType;
}

/**
 * Get animation style based on event effect type.
 * **Validates: Requirement 11.4** - Support different animation styles per event type
 */
function getEventAnimationStyle(effect: MiniEventEffect): EventAnimationStyle {
  switch (effect.type) {
    case 'score_multiplier':
      return {
        gradient: 'from-yellow-400 via-amber-500 to-orange-500',
        glow: 'rgba(234, 179, 8, 0.6)',
        particleColors: ['#fbbf24', '#f59e0b', '#eab308', '#fcd34d'],
        iconScale: 1.3,
        shakeIntensity: 0,
        soundType: 'event_positive',
      };
    case 'steal_points':
      return {
        gradient: 'from-red-500 via-rose-500 to-pink-500',
        glow: 'rgba(239, 68, 68, 0.6)',
        particleColors: ['#ef4444', '#f43f5e', '#ec4899', '#fb7185'],
        iconScale: 1.2,
        shakeIntensity: 8,
        soundType: 'event_negative',
      };
    case 'swap_scores':
      return {
        gradient: 'from-purple-500 via-violet-500 to-indigo-500',
        glow: 'rgba(139, 92, 246, 0.6)',
        particleColors: ['#a855f7', '#8b5cf6', '#6366f1', '#c084fc'],
        iconScale: 1.2,
        shakeIntensity: 5,
        soundType: 'event_neutral',
      };
    case 'double_or_nothing':
      return {
        gradient: 'from-emerald-400 via-green-500 to-teal-500',
        glow: 'rgba(16, 185, 129, 0.6)',
        particleColors: ['#10b981', '#22c55e', '#14b8a6', '#34d399'],
        iconScale: 1.4,
        shakeIntensity: 3,
        soundType: 'event_positive',
      };
    case 'immunity':
      return {
        gradient: 'from-cyan-400 via-sky-500 to-blue-500',
        glow: 'rgba(6, 182, 212, 0.6)',
        particleColors: ['#06b6d4', '#0ea5e9', '#3b82f6', '#22d3ee'],
        iconScale: 1.2,
        shakeIntensity: 0,
        soundType: 'event_positive',
      };
    case 'vote_reveal':
      return {
        gradient: 'from-pink-400 via-fuchsia-500 to-purple-500',
        glow: 'rgba(236, 72, 153, 0.6)',
        particleColors: ['#ec4899', '#d946ef', '#a855f7', '#f472b6'],
        iconScale: 1.1,
        shakeIntensity: 2,
        soundType: 'event_neutral',
      };
    case 'sabotage':
      return {
        gradient: 'from-gray-500 via-slate-600 to-zinc-700',
        glow: 'rgba(100, 116, 139, 0.6)',
        particleColors: ['#64748b', '#475569', '#71717a', '#94a3b8'],
        iconScale: 1.3,
        shakeIntensity: 10,
        soundType: 'event_negative',
      };
    default:
      return {
        gradient: 'from-purple-400 via-pink-500 to-cyan-400',
        glow: 'rgba(168, 85, 247, 0.5)',
        particleColors: ['#a855f7', '#ec4899', '#22d3ee', '#c084fc'],
        iconScale: 1.2,
        shakeIntensity: 3,
        soundType: 'event_neutral',
      };
  }
}

/**
 * Particle configuration for the burst effect
 */
interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  delay: number;
  duration: number;
  angle: number;
  distance: number;
}

/**
 * Particle burst effect component
 */
function ParticleBurst({ colors, particleCount = 40 }: { colors: string[]; particleCount?: number }) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const newParticles: Particle[] = [];
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2 + Math.random() * 0.5;
      newParticles.push({
        id: i,
        x: 50,
        y: 50,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 4 + Math.random() * 8,
        delay: Math.random() * 0.3,
        duration: 1 + Math.random() * 0.5,
        angle,
        distance: 30 + Math.random() * 40,
      });
    }
    
    setParticles(newParticles);
  }, [colors, particleCount]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          initial={{ 
            x: `${particle.x}%`,
            y: `${particle.y}%`,
            scale: 0,
            opacity: 1,
          }}
          animate={{ 
            x: `${particle.x + Math.cos(particle.angle) * particle.distance}%`,
            y: `${particle.y + Math.sin(particle.angle) * particle.distance}%`,
            scale: [0, 1.5, 0],
            opacity: [0, 1, 0],
          }}
          transition={{ 
            duration: particle.duration,
            delay: 0.5 + particle.delay,
            ease: 'easeOut',
          }}
          style={{
            position: 'absolute',
            width: particle.size,
            height: particle.size,
            backgroundColor: particle.color,
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            boxShadow: `0 0 ${particle.size}px ${particle.color}`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Radial lines effect for dramatic impact
 */
function RadialLines({ color, lineCount = 12 }: { color: string; lineCount?: number }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(lineCount)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ scaleY: 0, opacity: 0 }}
          animate={{ 
            scaleY: [0, 1, 1],
            opacity: [0, 0.6, 0],
          }}
          transition={{ 
            duration: 1.2,
            delay: 0.3 + i * 0.05,
            ease: 'easeOut',
          }}
          className="absolute left-1/2 top-1/2 origin-bottom"
          style={{
            width: 3,
            height: '50%',
            background: `linear-gradient(to top, ${color}, transparent)`,
            transform: `translateX(-50%) rotate(${(i / lineCount) * 360}deg)`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Animation variants for the main container
 */
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.3 }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.5 }
  },
};

/**
 * Animation variants for the event card
 */
const cardVariants: Variants = {
  hidden: { 
    scale: 0.3,
    opacity: 0,
    rotateX: 90,
  },
  visible: { 
    scale: 1,
    opacity: 1,
    rotateX: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 20,
      delay: 0.2,
    }
  },
  exit: { 
    scale: 0.8,
    opacity: 0,
    y: -50,
    transition: { duration: 0.3 }
  },
};

/**
 * Animation variants for the icon
 */
const iconVariants: Variants = {
  hidden: { scale: 0, rotate: -180 },
  visible: { 
    scale: 1,
    rotate: 0,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 15,
      delay: 0.5,
    }
  },
};

/**
 * Animation variants for text elements
 */
const textVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      delay,
    }
  }),
};

/**
 * EventAnimationOverlay - Full-screen dramatic reveal animation for mini-events
 * 
 * Features:
 * - Full-screen overlay with backdrop blur
 * - Dramatic entrance animation with 3D rotation
 * - Event-type-specific color schemes and effects
 * - Particle burst and radial line effects
 * - Sound effect hooks for external audio integration
 * - Auto-dismiss after animation completes
 * - Screen shake effect for impactful events
 * 
 * **Validates: Requirements 22.3, 11.4**
 * - Event_Animation_Overlay component for dramatic mini-event reveals
 * - When a Mini_Event triggers, display a dramatic full-screen animation
 */
export function EventAnimationOverlay({
  event,
  onComplete,
  onSoundEffect,
  duration = 4000,
  immediate = false,
}: EventAnimationOverlayProps) {
  const [isVisible, setIsVisible] = useState(immediate);
  const [showParticles, setShowParticles] = useState(false);
  const hasTriggeredIntro = useRef(false);
  const hasTriggeredImpact = useRef(false);
  
  const style = getEventAnimationStyle(event.effect);

  // Trigger intro sound and show overlay
  useEffect(() => {
    if (!hasTriggeredIntro.current) {
      hasTriggeredIntro.current = true;
      onSoundEffect?.('event_intro');
      
      // Small delay before showing if not immediate
      const showDelay = immediate ? 0 : 100;
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, showDelay);
      
      return () => clearTimeout(timer);
    }
  }, [immediate, onSoundEffect]);

  // Trigger impact sound and particles after card appears
  useEffect(() => {
    if (isVisible && !hasTriggeredImpact.current) {
      const timer = setTimeout(() => {
        hasTriggeredImpact.current = true;
        onSoundEffect?.('event_impact');
        onSoundEffect?.(style.soundType);
        setShowParticles(true);
      }, 700);
      
      return () => clearTimeout(timer);
    }
  }, [isVisible, onSoundEffect, style.soundType]);

  // Auto-dismiss after duration
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onSoundEffect?.('event_dismiss');
        setIsVisible(false);
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onSoundEffect]);

  // Call onComplete after exit animation
  const handleExitComplete = useCallback(() => {
    onComplete();
  }, [onComplete]);

  // Screen shake effect
  const shakeAnimation = style.shakeIntensity > 0 ? {
    x: [0, -style.shakeIntensity, style.shakeIntensity, -style.shakeIntensity, style.shakeIntensity, 0],
    transition: { duration: 0.5, delay: 0.7 }
  } : {};

  return (
    <AnimatePresence onExitComplete={handleExitComplete}>
      {isVisible && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-[100] flex items-center justify-center"
        >
          {/* Backdrop with blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Radial lines effect */}
          <RadialLines color={style.glow} />

          {/* Particle burst effect */}
          {showParticles && <ParticleBurst colors={style.particleColors} />}

          {/* Main event card */}
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            {...shakeAnimation}
            className="relative z-10 w-full max-w-md mx-4"
          >
            {/* Glow effect behind card */}
            <motion.div
              animate={{
                opacity: [0.5, 0.8, 0.5],
                scale: [1, 1.05, 1],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className={`absolute inset-0 bg-gradient-to-br ${style.gradient} rounded-3xl blur-2xl opacity-50`}
            />

            {/* Card content */}
            <div
              className={`
                relative overflow-hidden
                p-8 rounded-3xl
                bg-gradient-to-br from-black/70 to-black/50
                border-2 border-white/20
                backdrop-blur-xl
                shadow-2xl
              `}
              style={{
                boxShadow: `0 0 60px ${style.glow}, 0 0 120px ${style.glow}`,
              }}
            >
              {/* Background gradient overlay */}
              <motion.div
                animate={{
                  opacity: [0.1, 0.2, 0.1],
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className={`absolute inset-0 bg-gradient-to-br ${style.gradient} opacity-20`}
              />

              {/* Content */}
              <div className="relative z-10 text-center">
                {/* Event Type Label */}
                <motion.div
                  variants={textVariants}
                  custom={0.4}
                  initial="hidden"
                  animate="visible"
                  className="mb-4"
                >
                  <span className={`
                    inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest
                    bg-gradient-to-r ${style.gradient} text-white
                    shadow-lg
                  `}>
                    ⚡ Event Triggered ⚡
                  </span>
                </motion.div>

                {/* Event Icon */}
                <motion.div
                  variants={iconVariants}
                  initial="hidden"
                  animate="visible"
                  className="mb-6"
                >
                  <motion.div
                    animate={{
                      scale: [1, style.iconScale, 1],
                      rotate: [0, 5, -5, 0],
                    }}
                    transition={{ 
                      duration: 1.5, 
                      repeat: Infinity,
                      repeatDelay: 0.5,
                    }}
                    className={`
                      inline-flex items-center justify-center
                      w-24 h-24 rounded-2xl
                      bg-gradient-to-br ${style.gradient}
                      text-6xl
                      shadow-xl
                    `}
                    style={{
                      boxShadow: `0 0 30px ${style.glow}`,
                    }}
                  >
                    {event.icon}
                  </motion.div>
                </motion.div>

                {/* Event Name */}
                <motion.h2
                  variants={textVariants}
                  custom={0.7}
                  initial="hidden"
                  animate="visible"
                  className={`
                    text-3xl sm:text-4xl font-black mb-3
                    bg-gradient-to-r ${style.gradient} bg-clip-text text-transparent
                    drop-shadow-lg
                  `}
                >
                  {event.name}
                </motion.h2>

                {/* Event Description */}
                <motion.p
                  variants={textVariants}
                  custom={0.9}
                  initial="hidden"
                  animate="visible"
                  className="text-lg text-gray-200 mb-6 leading-relaxed"
                >
                  {event.description}
                </motion.p>

                {/* Timing Badge */}
                <motion.div
                  variants={textVariants}
                  custom={1.1}
                  initial="hidden"
                  animate="visible"
                >
                  <span className="inline-block px-4 py-2 rounded-full bg-white/10 text-gray-300 text-sm font-medium border border-white/20">
                    {getTimingLabel(event.timing)}
                  </span>
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* Skip hint */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 text-gray-400 text-sm"
          >
            Event will dismiss automatically...
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Get human-readable label for event timing
 */
function getTimingLabel(timing: MiniEvent['timing']): string {
  switch (timing) {
    case 'pre-round':
      return '🎯 Applies to next round';
    case 'mid-round':
      return '⚡ Active now';
    case 'post-round':
      return '📊 Applied to results';
    case 'pre-finale':
      return '🏆 Finale modifier';
    default:
      return timing;
  }
}

/**
 * Hook for managing event animation overlay state
 * Provides a simple interface for triggering event animations
 */
export function useEventAnimationOverlay() {
  const [currentEvent, setCurrentEvent] = useState<MiniEvent | null>(null);
  const [isShowing, setIsShowing] = useState(false);

  const showEvent = useCallback((event: MiniEvent) => {
    setCurrentEvent(event);
    setIsShowing(true);
  }, []);

  const hideEvent = useCallback(() => {
    setIsShowing(false);
    // Clear event after animation completes
    setTimeout(() => setCurrentEvent(null), 500);
  }, []);

  return {
    currentEvent,
    isShowing,
    showEvent,
    hideEvent,
  };
}

export default EventAnimationOverlay;
