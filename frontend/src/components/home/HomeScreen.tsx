import { useState, useEffect, useCallback } from 'react';
import { motion, useMotionValue, useTransform, useSpring, useReducedMotion } from 'framer-motion';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import type { ISourceOptions } from '@tsparticles/engine';
import { GlassButton, GlassInput, GlassCard, NeroLogo, BackButton } from '../ui';
import { socket } from '../../lib/socket';
import CelebrationIcon from '@mui/icons-material/Celebration';
import MusicNoteIcon from '@mui/icons-material/MusicNote';

type Mode = 'home' | 'host' | 'join';

// Particle configuration
const particlesOptions: ISourceOptions = {
  fullScreen: false,
  background: { color: { value: 'transparent' } },
  fpsLimit: 60,
  interactivity: {
    events: {
      onHover: { enable: true, mode: 'grab' },
      resize: { enable: true },
    },
    modes: {
      grab: { distance: 140, links: { opacity: 0.3 } },
    },
  },
  particles: {
    color: { value: ['#a855f7', '#ec4899', '#06b6d4'] },
    links: {
      color: '#a855f7',
      distance: 150,
      enable: true,
      opacity: 0.1,
      width: 1,
    },
    move: {
      enable: true,
      speed: 0.8,
      direction: 'none',
      random: true,
      straight: false,
      outModes: { default: 'out' },
    },
    number: { density: { enable: true, width: 1200, height: 800 }, value: 40 },
    opacity: { value: { min: 0.1, max: 0.4 } },
    shape: { type: 'circle' },
    size: { value: { min: 1, max: 3 } },
  },
  detectRetina: true,
};

export function HomeScreen() {
  const [mode, setMode] = useState<Mode>('home');
  const [name, setName] = useState('');
  const [partyCode, setPartyCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [particlesInit, setParticlesInit] = useState(false);
  
  const prefersReducedMotion = useReducedMotion();
  
  // Mouse position for parallax effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  // Smooth spring animation for mouse tracking
  const springConfig = { damping: 25, stiffness: 150 };
  const smoothMouseX = useSpring(mouseX, springConfig);
  const smoothMouseY = useSpring(mouseY, springConfig);
  
  // Transform mouse position to gradient shift
  const gradientX = useTransform(smoothMouseX, [0, 1], [30, 70]);
  const gradientY = useTransform(smoothMouseY, [0, 1], [30, 70]);

  // Initialize particles engine
  useEffect(() => {
    if (prefersReducedMotion) return;
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => setParticlesInit(true));
  }, [prefersReducedMotion]);

  // Handle mouse movement
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (prefersReducedMotion) return;
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    mouseX.set(clientX / innerWidth);
    mouseY.set(clientY / innerHeight);
  }, [mouseX, mouseY, prefersReducedMotion]);

  const handleHost = () => {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    setError(null);
    setIsLoading(true);
    socket.emit('lobby:create', { hostName: name.trim() });
  };

  const handleJoin = () => {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!partyCode.trim() || partyCode.length !== 4) {
      setError('Please enter a valid 4-character party code');
      return;
    }
    setError(null);
    setIsLoading(true);
    socket.emit('lobby:join', { code: partyCode.toUpperCase(), name: name.trim() });
  };

  // Button hover animation variants
  const buttonVariants = {
    initial: { scale: 1, y: 0 },
    hover: { 
      scale: 1.02, 
      y: -2,
      transition: { type: 'spring', stiffness: 400, damping: 17 }
    },
    tap: { scale: 0.98 }
  };

  const renderHome = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="flex flex-col sm:flex-col gap-4 sm:gap-5 w-full"
    >
      <motion.div
        variants={buttonVariants}
        initial="initial"
        whileHover="hover"
        whileTap="tap"
        className="w-full"
      >
        <GlassButton
          onClick={() => setMode('host')}
          className="w-full py-4 sm:py-5 text-base sm:text-lg font-medium relative overflow-hidden group"
        >
          <motion.span
            className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          />
          <span className="relative flex items-center justify-center gap-2">
            <CelebrationIcon className="text-xl" /> Host a Party
          </span>
        </GlassButton>
      </motion.div>
      
      <motion.div
        variants={buttonVariants}
        initial="initial"
        whileHover="hover"
        whileTap="tap"
        className="w-full"
      >
        <GlassButton
          onClick={() => setMode('join')}
          variant="outline"
          className="w-full py-4 sm:py-5 text-base sm:text-lg font-medium relative overflow-hidden group"
        >
          <motion.span
            className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          />
          <span className="relative flex items-center justify-center gap-2">
            <MusicNoteIcon className="text-xl" /> Join a Party
          </span>
        </GlassButton>
      </motion.div>
    </motion.div>
  );

  const renderHost = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-5 sm:space-y-6"
    >
      {/* Header with Back button and title */}
      <div className="space-y-4">
        <BackButton 
          onClick={() => { setMode('home'); setError(null); }}
        />
        <h2 className="text-xl sm:text-2xl font-semibold text-white">Host a New Party</h2>
      </div>
      
      <GlassInput
        label="Your Name"
        placeholder="Enter your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={20}
      />
      {error && (
        <motion.p 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-red-400 text-sm"
        >
          {error}
        </motion.p>
      )}
      <motion.div
        variants={buttonVariants}
        initial="initial"
        whileHover="hover"
        whileTap="tap"
      >
        <GlassButton
          onClick={handleHost}
          disabled={isLoading}
          className="w-full py-3 sm:py-4"
        >
          {isLoading ? 'Creating...' : 'Create Party'}
        </GlassButton>
      </motion.div>
    </motion.div>
  );

  const renderJoin = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-5 sm:space-y-6"
    >
      {/* Header with Back button and title */}
      <div className="space-y-4">
        <BackButton 
          onClick={() => { setMode('home'); setError(null); }}
        />
        <h2 className="text-xl sm:text-2xl font-semibold text-white">Join a Party</h2>
      </div>
      
      <GlassInput
        label="Your Name"
        placeholder="Enter your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={20}
      />
      <GlassInput
        label="Party Code"
        placeholder="XXXX"
        value={partyCode}
        onChange={(e) => setPartyCode(e.target.value.toUpperCase())}
        maxLength={4}
        className="uppercase tracking-widest text-center text-xl sm:text-2xl"
      />
      {error && (
        <motion.p 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-red-400 text-sm"
        >
          {error}
        </motion.p>
      )}
      <motion.div
        variants={buttonVariants}
        initial="initial"
        whileHover="hover"
        whileTap="tap"
      >
        <GlassButton
          onClick={handleJoin}
          disabled={isLoading}
          className="w-full py-3 sm:py-4"
        >
          {isLoading ? 'Joining...' : 'Join Party'}
        </GlassButton>
      </motion.div>
    </motion.div>
  );

  return (
    <div 
      className="min-h-screen relative overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      {/* Animated gradient background */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: prefersReducedMotion 
            ? 'radial-gradient(ellipse at 50% 50%, rgba(88, 28, 135, 0.4) 0%, rgba(15, 23, 42, 1) 70%)'
            : undefined,
        }}
      >
        {!prefersReducedMotion && (
          <motion.div
            className="absolute inset-0"
            style={{
              background: useTransform(
                [gradientX, gradientY],
                ([x, y]) => `radial-gradient(ellipse at ${x}% ${y}%, rgba(88, 28, 135, 0.5) 0%, rgba(15, 23, 42, 1) 70%)`
              ),
            }}
          />
        )}
      </motion.div>

      {/* Secondary gradient layer */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={prefersReducedMotion ? {} : {
          background: [
            'radial-gradient(ellipse at 20% 80%, rgba(6, 182, 212, 0.15) 0%, transparent 50%)',
            'radial-gradient(ellipse at 80% 20%, rgba(6, 182, 212, 0.15) 0%, transparent 50%)',
            'radial-gradient(ellipse at 20% 80%, rgba(6, 182, 212, 0.15) 0%, transparent 50%)',
          ],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
      />

      {/* Particles layer */}
      {particlesInit && !prefersReducedMotion && (
        <Particles
          id="tsparticles"
          className="absolute inset-0 pointer-events-auto"
          options={particlesOptions}
        />
      )}

      {/* Floating orbs with parallax */}
      {!prefersReducedMotion && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            style={{
              x: useTransform(smoothMouseX, [0, 1], [-30, 30]),
              y: useTransform(smoothMouseY, [0, 1], [-30, 30]),
            }}
            className="absolute top-1/4 left-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-purple-500/20 rounded-full blur-3xl"
          />
          <motion.div
            style={{
              x: useTransform(smoothMouseX, [0, 1], [20, -20]),
              y: useTransform(smoothMouseY, [0, 1], [20, -20]),
            }}
            className="absolute bottom-1/4 right-1/4 w-56 sm:w-80 h-56 sm:h-80 bg-cyan-500/15 rounded-full blur-3xl"
          />
          <motion.div
            style={{
              x: useTransform(smoothMouseX, [0, 1], [-15, 15]),
              y: useTransform(smoothMouseY, [0, 1], [15, -15]),
            }}
            className="absolute top-1/2 right-1/3 w-48 sm:w-64 h-48 sm:h-64 bg-pink-500/10 rounded-full blur-3xl"
          />
        </div>
      )}

      {/* Main content - centered */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
        <div className="w-full max-w-sm sm:max-w-md flex flex-col items-center">
          {/* Logo and subtitle */}
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="text-center mb-8 sm:mb-10"
          >
            <motion.div
              whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <NeroLogo className="mx-auto w-56 sm:w-72 md:w-80 h-auto" width={320} height={89} />
            </motion.div>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-gray-400 mt-3 sm:mt-4 text-sm sm:text-base tracking-wide"
            >
              The anonymous music guessing game
            </motion.p>
          </motion.div>

          {/* Card container */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="w-full"
          >
            <GlassCard className="p-5 sm:p-8">
              {mode === 'home' && renderHome()}
              {mode === 'host' && renderHost()}
              {mode === 'join' && renderJoin()}
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
