import { useState } from 'react';
import { motion } from 'framer-motion';

interface JoinCodeDisplayProps {
  code: string;
  /** Compact mode for space-constrained layouts */
  compact?: boolean;
}

export function JoinCodeDisplay({ code, compact = false }: JoinCodeDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  if (compact) {
    return (
      <div className="text-center">
        <div className="relative inline-block">
          <motion.button
            onClick={handleCopy}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="group relative px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 hover:border-purple-400/50 transition-all duration-300"
          >
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-purple-300 uppercase tracking-wider">
                Code:
              </span>
              <span className="text-xl font-bold tracking-[0.15em] text-white font-mono">
                {code}
              </span>
              <span className="text-[10px] text-gray-400">
                {copied ? '✓' : '(tap to copy)'}
              </span>
            </div>
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/20 to-cyan-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center"
    >
      <p className="text-xs sm:text-sm text-purple-300 uppercase tracking-wider mb-1 sm:mb-2">
        Party Code
      </p>
      <div className="relative inline-block">
        <motion.button
          onClick={handleCopy}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="group relative px-4 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 hover:border-purple-400/50 transition-all duration-300"
        >
          <span className="text-3xl sm:text-5xl font-bold tracking-[0.2em] sm:tracking-[0.3em] text-white font-mono">
            {code}
          </span>
          <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-r from-purple-500/20 to-cyan-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </motion.button>
        
        {/* Copy indicator */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: copied ? 1 : 0, y: copied ? 0 : 10 }}
          className="absolute -bottom-6 sm:-bottom-8 left-1/2 -translate-x-1/2 text-xs sm:text-sm text-green-400"
        >
          Copied!
        </motion.div>
      </div>
      
      <p className="mt-4 sm:mt-6 text-xs sm:text-sm text-gray-400">
        Share this code with friends to join
      </p>
    </motion.div>
  );
}
