import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PowerUp, PlayerPowerUp, POWER_UPS, PowerUpTiming } from '../../types';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import BoltIcon from '@mui/icons-material/Bolt';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

/**
 * Props for the PowerUpDock component.
 * **Validates: Requirement 22.4** - Power_Up_Dock component showing available power-ups and player point balance
 */
export interface PowerUpDockProps {
  /** Current point balance for the player */
  playerPoints: number;
  /** Power-ups the player currently owns (unused) */
  ownedPowerUps: PlayerPowerUp[];
  /** Current game phase timing for filtering available power-ups */
  currentTiming: 'submission' | 'voting' | 'anytime';
  /** Callback when purchasing a power-up */
  onPurchase: (powerUpId: string) => void;
  /** Callback when using an owned power-up */
  onUse: (playerPowerUpId: string) => void;
  /** Whether interactions are disabled */
  disabled?: boolean;
}

/**
 * Get the PowerUp definition from the POWER_UPS constant
 */
function getPowerUpById(powerUpId: string): PowerUp | undefined {
  return POWER_UPS.find((p) => p.id === powerUpId);
}

/**
 * Filter power-ups by timing - show power-ups that match current timing or 'anytime'
 */
function filterPowerUpsByTiming(timing: PowerUpTiming): PowerUp[] {
  return POWER_UPS.filter((p) => p.timing === timing || p.timing === 'anytime');
}

/**
 * Get timing badge color based on timing type
 */
function getTimingBadgeStyle(timing: PowerUpTiming): string {
  switch (timing) {
    case 'submission':
      return 'bg-blue-500/30 text-blue-300 border-blue-400/40';
    case 'voting':
      return 'bg-purple-500/30 text-purple-300 border-purple-400/40';
    case 'anytime':
      return 'bg-green-500/30 text-green-300 border-green-400/40';
    default:
      return 'bg-gray-500/30 text-gray-300 border-gray-400/40';
  }
}

/**
 * PowerUpCard - Individual power-up display card
 */
interface PowerUpCardProps {
  powerUp: PowerUp;
  playerPoints: number;
  isOwned: boolean;
  onPurchase: () => void;
  onUse: () => void;
  disabled?: boolean;
}

function PowerUpCard({
  powerUp,
  playerPoints,
  isOwned,
  onPurchase,
  onUse,
  disabled = false,
}: PowerUpCardProps) {
  const canAfford = playerPoints >= powerUp.cost;
  const isDisabled = disabled || (!isOwned && !canAfford);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={!isDisabled ? { scale: 1.02 } : undefined}
      className={`
        relative p-3 rounded-xl
        bg-gradient-to-br from-white/10 to-white/5
        border border-white/20
        backdrop-blur-sm
        transition-all duration-200
        ${isDisabled ? 'opacity-50' : 'hover:border-white/40 hover:shadow-lg'}
      `}
    >
      <div className="flex items-start gap-3">
        {/* Power-up Icon */}
        <motion.div
          animate={isOwned ? {
            boxShadow: [
              '0 0 10px rgba(34, 197, 94, 0.3)',
              '0 0 20px rgba(34, 197, 94, 0.5)',
              '0 0 10px rgba(34, 197, 94, 0.3)',
            ],
          } : undefined}
          transition={{ duration: 2, repeat: Infinity }}
          className={`
            flex-shrink-0 w-12 h-12 rounded-lg
            flex items-center justify-center text-2xl
            ${isOwned 
              ? 'bg-gradient-to-br from-green-500/30 to-emerald-500/30 border border-green-400/40' 
              : 'bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-purple-400/40'
            }
          `}
        >
          {powerUp.icon}
        </motion.div>

        {/* Power-up Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-semibold text-white truncate">
              {powerUp.name}
            </h4>
            <span className={`
              px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide
              border ${getTimingBadgeStyle(powerUp.timing)}
            `}>
              {powerUp.timing}
            </span>
          </div>
          <p className="text-xs text-gray-400 line-clamp-2 mb-2">
            {powerUp.description}
          </p>

          {/* Action Button */}
          {isOwned ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onUse}
              disabled={disabled}
              className={`
                w-full py-1.5 px-3 rounded-lg
                bg-gradient-to-r from-green-500 to-emerald-500
                text-white text-xs font-semibold
                flex items-center justify-center gap-1.5
                shadow-lg shadow-green-500/30
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-200
              `}
            >
              <BoltIcon sx={{ fontSize: 14 }} />
              Use Now
            </motion.button>
          ) : (
            <motion.button
              whileHover={canAfford && !disabled ? { scale: 1.05 } : undefined}
              whileTap={canAfford && !disabled ? { scale: 0.95 } : undefined}
              onClick={onPurchase}
              disabled={isDisabled}
              className={`
                w-full py-1.5 px-3 rounded-lg
                ${canAfford 
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg shadow-purple-500/30' 
                  : 'bg-gray-600/50'
                }
                text-white text-xs font-semibold
                flex items-center justify-center gap-1.5
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-200
              `}
            >
              <ShoppingCartIcon sx={{ fontSize: 14 }} />
              <span>{powerUp.cost} pts</span>
            </motion.button>
          )}
        </div>
      </div>

      {/* Owned Badge */}
      {isOwned && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shadow-lg"
        >
          <span className="text-white text-[10px]">✓</span>
        </motion.div>
      )}
    </motion.div>
  );
}

/**
 * PowerUpDock - Floating UI component showing available power-ups and player point balance
 * 
 * Features:
 * - Floating dock positioned at bottom-right
 * - Shows player's current point balance prominently
 * - Lists available power-ups filtered by current timing
 * - Shows owned (unused) power-ups with "Use" button
 * - Shows purchasable power-ups with cost and "Buy" button
 * - Disables buy button if insufficient points
 * - Glassmorphism styling matching other UI components
 * - Collapsible/expandable state
 * - Animations with framer-motion
 * 
 * **Validates: Requirement 22.4** - Power_Up_Dock component showing available power-ups and player point balance
 */
export function PowerUpDock({
  playerPoints,
  ownedPowerUps,
  currentTiming,
  onPurchase,
  onUse,
  disabled = false,
}: PowerUpDockProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Filter power-ups by current timing
  const availablePowerUps = useMemo(() => {
    return filterPowerUpsByTiming(currentTiming);
  }, [currentTiming]);

  // Get unused owned power-ups (those that haven't been used yet)
  const unusedOwnedPowerUps = useMemo(() => {
    return ownedPowerUps.filter((pp) => pp.usedAt === null);
  }, [ownedPowerUps]);

  // Create a map of owned power-up IDs to PlayerPowerUp for quick lookup
  const ownedPowerUpMap = useMemo(() => {
    const map = new Map<string, PlayerPowerUp>();
    unusedOwnedPowerUps.forEach((pp) => {
      // Only keep the first unused one for each power-up type
      if (!map.has(pp.powerUpId)) {
        map.set(pp.powerUpId, pp);
      }
    });
    return map;
  }, [unusedOwnedPowerUps]);

  // Count of owned power-ups that can be used now
  const usableCount = useMemo(() => {
    return unusedOwnedPowerUps.filter((pp) => {
      const powerUp = getPowerUpById(pp.powerUpId);
      return powerUp && (powerUp.timing === currentTiming || powerUp.timing === 'anytime');
    }).length;
  }, [unusedOwnedPowerUps, currentTiming]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-4 right-4 z-40 w-80 max-w-[calc(100vw-2rem)]"
    >
      {/* Main Container with Glassmorphism */}
      <motion.div
        layout
        className={`
          relative overflow-hidden rounded-2xl
          bg-gradient-to-br from-black/70 to-black/50
          border border-white/20
          backdrop-blur-xl
          shadow-2xl
        `}
        style={{
          boxShadow: '0 0 40px rgba(139, 92, 246, 0.2), 0 0 80px rgba(139, 92, 246, 0.1)',
        }}
      >
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 pointer-events-none" />

        {/* Header - Always Visible */}
        <motion.button
          onClick={() => setIsExpanded(!isExpanded)}
          className="relative z-10 w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-3">
            {/* Power-up Icon */}
            <motion.div
              animate={{
                rotate: [0, 5, -5, 0],
              }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg"
            >
              <AutoAwesomeIcon sx={{ fontSize: 20 }} className="text-white" />
            </motion.div>

            <div className="text-left">
              <h3 className="text-sm font-bold text-white">Power-Ups</h3>
              <p className="text-xs text-gray-400">
                {usableCount > 0 ? `${usableCount} ready to use` : 'Browse & purchase'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Point Balance */}
            <motion.div
              animate={{
                boxShadow: [
                  '0 0 10px rgba(234, 179, 8, 0.3)',
                  '0 0 20px rgba(234, 179, 8, 0.5)',
                  '0 0 10px rgba(234, 179, 8, 0.3)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="px-3 py-1.5 rounded-full bg-gradient-to-r from-yellow-500/30 to-amber-500/30 border border-yellow-400/40"
            >
              <span className="text-yellow-300 font-bold text-sm">
                {playerPoints} pts
              </span>
            </motion.div>

            {/* Expand/Collapse Icon */}
            <motion.div
              animate={{ rotate: isExpanded ? 0 : 180 }}
              transition={{ duration: 0.2 }}
              className="text-gray-400"
            >
              {isExpanded ? (
                <ExpandMoreIcon sx={{ fontSize: 24 }} />
              ) : (
                <ExpandLessIcon sx={{ fontSize: 24 }} />
              )}
            </motion.div>
          </div>
        </motion.button>

        {/* Expandable Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="relative z-10 px-4 pb-4">
                {/* Current Timing Indicator */}
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-xs text-gray-500">Showing for:</span>
                  <span className={`
                    px-2 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide
                    border ${getTimingBadgeStyle(currentTiming)}
                  `}>
                    {currentTiming} phase
                  </span>
                </div>

                {/* Power-ups List */}
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                  {availablePowerUps.length === 0 ? (
                    <div className="text-center py-4 text-gray-400 text-sm">
                      No power-ups available for this phase
                    </div>
                  ) : (
                    availablePowerUps.map((powerUp) => {
                      const ownedPowerUp = ownedPowerUpMap.get(powerUp.id);
                      return (
                        <PowerUpCard
                          key={powerUp.id}
                          powerUp={powerUp}
                          playerPoints={playerPoints}
                          isOwned={!!ownedPowerUp}
                          onPurchase={() => onPurchase(powerUp.id)}
                          onUse={() => ownedPowerUp && onUse(ownedPowerUp.id)}
                          disabled={disabled}
                        />
                      );
                    })
                  )}
                </div>

                {/* Footer Info */}
                <div className="mt-3 pt-3 border-t border-white/10">
                  <p className="text-[10px] text-gray-500 text-center">
                    Power-ups can only be used once per game
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Notification Badge for Usable Power-ups */}
      <AnimatePresence>
        {!isExpanded && usableCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shadow-lg"
          >
            <span className="text-white text-xs font-bold">{usableCount}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default PowerUpDock;
