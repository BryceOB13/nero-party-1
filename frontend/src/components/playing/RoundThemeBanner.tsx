import { motion } from 'framer-motion';
import { RoundTheme, PartyTheme, ThemeConstraints } from '../../types';
import { GlassCard } from '../ui';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import StyleIcon from '@mui/icons-material/Style';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import FavoriteIcon from '@mui/icons-material/Favorite';
import NightlifeIcon from '@mui/icons-material/Nightlife';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import NightsStayIcon from '@mui/icons-material/NightsStay';
import CelebrationIcon from '@mui/icons-material/Celebration';
import SentimentVerySatisfiedIcon from '@mui/icons-material/SentimentVerySatisfied';
import TheaterComedyIcon from '@mui/icons-material/TheaterComedy';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import WavesIcon from '@mui/icons-material/Waves';
import PsychologyIcon from '@mui/icons-material/Psychology';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import { ReactNode } from 'react';

/**
 * RoundThemeBanner - Displays current round theme prompt and party theme constraints
 * 
 * Features:
 * - Displays current round theme prompt and icon prominently
 * - Shows party theme constraints when applicable
 * - Glassmorphism design system
 * - Animated entrance
 * 
 * Requirements: 22.2, 3.3, 3.4
 */

export interface RoundThemeBannerProps {
  theme: RoundTheme;
  partyTheme?: PartyTheme;
  compact?: boolean;
  className?: string;
}

// Map theme IDs/names to MUI icons
function getThemeIcon(themeId: string, themeName: string): ReactNode {
  const iconMap: Record<string, ReactNode> = {
    // Round themes
    'nostalgia': <PsychologyIcon sx={{ fontSize: 28 }} />,
    'guilty-pleasure': <SentimentVerySatisfiedIcon sx={{ fontSize: 28 }} />,
    'road-trip': <DirectionsCarIcon sx={{ fontSize: 28 }} />,
    'late-night': <NightsStayIcon sx={{ fontSize: 28 }} />,
    'summer-vibes': <WbSunnyIcon sx={{ fontSize: 28 }} />,
    'party-starter': <CelebrationIcon sx={{ fontSize: 28 }} />,
    'chill': <WavesIcon sx={{ fontSize: 28 }} />,
    'workout': <LocalFireDepartmentIcon sx={{ fontSize: 28 }} />,
    'romance': <FavoriteIcon sx={{ fontSize: 28 }} />,
    'throwback': <TheaterComedyIcon sx={{ fontSize: 28 }} />,
    // Party themes
    'anything-goes': <MusicNoteIcon sx={{ fontSize: 28 }} />,
    'retro': <TheaterComedyIcon sx={{ fontSize: 28 }} />,
    'electronic': <NightlifeIcon sx={{ fontSize: 28 }} />,
    'indie': <AutoAwesomeIcon sx={{ fontSize: 28 }} />,
    'hip-hop': <SportsEsportsIcon sx={{ fontSize: 28 }} />,
    'rock': <LocalFireDepartmentIcon sx={{ fontSize: 28 }} />,
    'pop': <CelebrationIcon sx={{ fontSize: 28 }} />,
    'chill-vibes': <AcUnitIcon sx={{ fontSize: 28 }} />,
  };

  // Try to match by ID first, then by name keywords
  const id = themeId.toLowerCase();
  if (iconMap[id]) return iconMap[id];

  const name = themeName.toLowerCase();
  if (name.includes('nostalgia') || name.includes('memory')) return <PsychologyIcon sx={{ fontSize: 28 }} />;
  if (name.includes('guilty') || name.includes('pleasure')) return <SentimentVerySatisfiedIcon sx={{ fontSize: 28 }} />;
  if (name.includes('road') || name.includes('drive') || name.includes('car')) return <DirectionsCarIcon sx={{ fontSize: 28 }} />;
  if (name.includes('night') || name.includes('late')) return <NightsStayIcon sx={{ fontSize: 28 }} />;
  if (name.includes('summer') || name.includes('sun')) return <WbSunnyIcon sx={{ fontSize: 28 }} />;
  if (name.includes('party') || name.includes('dance')) return <CelebrationIcon sx={{ fontSize: 28 }} />;
  if (name.includes('chill') || name.includes('relax')) return <WavesIcon sx={{ fontSize: 28 }} />;
  if (name.includes('workout') || name.includes('energy') || name.includes('fire')) return <LocalFireDepartmentIcon sx={{ fontSize: 28 }} />;
  if (name.includes('love') || name.includes('romance')) return <FavoriteIcon sx={{ fontSize: 28 }} />;
  if (name.includes('retro') || name.includes('throwback')) return <TheaterComedyIcon sx={{ fontSize: 28 }} />;
  if (name.includes('electronic') || name.includes('edm')) return <NightlifeIcon sx={{ fontSize: 28 }} />;

  // Default icon
  return <MusicNoteIcon sx={{ fontSize: 28 }} />;
}

function getPartyThemeIcon(themeId: string, themeName: string): ReactNode {
  return getThemeIcon(themeId, themeName);
}

export function RoundThemeBanner({
  theme,
  partyTheme,
  compact = false,
  className = '',
}: RoundThemeBannerProps) {
  const hasPartyTheme = partyTheme && partyTheme.id !== 'anything-goes';
  const constraintsList = hasPartyTheme ? getConstraintsList(partyTheme.constraints) : [];

  return (
    <GlassCard
      className={`overflow-hidden ${className}`}
      padding={compact ? 'sm' : 'md'}
      opacity="medium"
      border="medium"
      animate={true}
    >
      {/* Round Theme Section */}
      <div className="flex items-start gap-3">
        {/* Theme Icon */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
          className={`
            flex-shrink-0 flex items-center justify-center rounded-xl
            bg-gradient-to-br from-purple-500/30 to-pink-500/30
            border border-purple-400/30 text-purple-300
            ${compact ? 'w-10 h-10' : 'w-12 h-12 sm:w-14 sm:h-14'}
          `}
        >
          {getThemeIcon(theme.id || '', theme.name)}
        </motion.div>

        {/* Theme Content */}
        <div className="flex-1 min-w-0">
          {/* Theme Header */}
          <div className="flex items-center gap-2 flex-wrap">
            <motion.h3
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className={`
                font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent
                ${compact ? 'text-sm' : 'text-base sm:text-lg'}
              `}
            >
              {theme.name}
            </motion.h3>
            
            {/* Bonus Multiplier Badge */}
            {theme.bonusMultiplier > 1.0 && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-400/30"
              >
                <AutoAwesomeIcon className="text-yellow-400" style={{ fontSize: compact ? 12 : 14 }} />
                <span className={`text-yellow-400 font-semibold ${compact ? 'text-[10px]' : 'text-xs'}`}>
                  {theme.bonusMultiplier}x Bonus
                </span>
              </motion.span>
            )}
          </div>

          {/* Theme Prompt */}
          <motion.p
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`
              text-gray-300 mt-1 leading-relaxed
              ${compact ? 'text-xs line-clamp-2' : 'text-sm sm:text-base'}
            `}
          >
            {theme.prompt}
          </motion.p>
        </div>
      </div>

      {/* Party Theme Constraints Section */}
      {hasPartyTheme && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className={`
            border-t border-white/10
            ${compact ? 'mt-2 pt-2' : 'mt-3 pt-3'}
          `}
        >
          {/* Party Theme Header */}
          <div className="flex items-center gap-2 mb-2">
            <StyleIcon 
              className="text-cyan-400" 
              style={{ fontSize: compact ? 14 : 16 }} 
            />
            <span className={`text-cyan-400 font-medium ${compact ? 'text-[10px]' : 'text-xs'}`}>
              Party Theme: {partyTheme.name}
            </span>
            <span className="text-cyan-300">
              {getPartyThemeIcon(partyTheme.id, partyTheme.name)}
            </span>
          </div>

          {/* Constraints Tags */}
          {constraintsList.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {constraintsList.map((constraint, idx) => (
                <motion.span
                  key={idx}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.35 + idx * 0.05 }}
                  className={`
                    px-2 py-0.5 rounded-full
                    bg-cyan-500/10 border border-cyan-400/20
                    text-cyan-300
                    ${compact ? 'text-[10px]' : 'text-xs'}
                  `}
                >
                  {constraint}
                </motion.span>
              ))}
            </div>
          )}

          {/* Party Theme Description (non-compact only) */}
          {!compact && partyTheme.description && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-gray-400 text-xs mt-2 italic"
            >
              {partyTheme.description}
            </motion.p>
          )}
        </motion.div>
      )}
    </GlassCard>
  );
}

/**
 * Helper function to convert constraints to a readable list
 */
function getConstraintsList(constraints: ThemeConstraints): string[] {
  const list: string[] = [];

  if (constraints.genres?.length) {
    list.push(`Genres: ${constraints.genres.join(', ')}`);
  }

  if (constraints.decades?.length) {
    list.push(`Decades: ${constraints.decades.join(', ')}`);
  }

  if (constraints.moods?.length) {
    list.push(`Moods: ${constraints.moods.join(', ')}`);
  }

  if (constraints.bpmRange) {
    list.push(`BPM: ${constraints.bpmRange.min}-${constraints.bpmRange.max}`);
  }

  if (constraints.explicit !== undefined && constraints.explicit !== null) {
    list.push(constraints.explicit ? 'Explicit allowed' : 'Clean only');
  }

  if (constraints.artistRestrictions) {
    list.push(constraints.artistRestrictions);
  }

  return list;
}

export default RoundThemeBanner;
