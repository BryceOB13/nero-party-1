import { useState } from 'react';
import { Achievement } from '../../types';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import StarIcon from '@mui/icons-material/Star';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { GlassButton } from '../ui/GlassButton';

export interface AchievementRevealProps {
  achievements: Array<{ achievement: Achievement; playerName: string; playerId: string }>;
  players: Map<string, { name: string; alias: string; color: string }>;
  onRevealComplete: () => void;
  currentPlayerAlias?: string | null;
  isHost?: boolean;
}

const RARITY_STYLES: Record<Achievement['rarity'], { gradient: string; badge: string }> = {
  common: { gradient: 'from-gray-400 to-gray-500', badge: 'bg-gray-500/30 text-gray-300' },
  uncommon: { gradient: 'from-green-400 to-emerald-500', badge: 'bg-green-500/30 text-green-300' },
  rare: { gradient: 'from-purple-400 to-pink-500', badge: 'bg-purple-500/30 text-purple-300' },
  legendary: { gradient: 'from-yellow-400 to-orange-500', badge: 'bg-yellow-500/30 text-yellow-300' },
};

export function AchievementReveal({ achievements, players, onRevealComplete, currentPlayerAlias, isHost }: AchievementRevealProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    if (currentIndex < achievements.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onRevealComplete();
    }
  };

  const isCurrentPlayer = (playerName: string) => {
    const player = Array.from(players.values()).find(p => p.name === playerName);
    return player?.alias === currentPlayerAlias;
  };

  if (achievements.length === 0) {
    return <div className="text-center py-8"><p className="text-gray-400">No achievements to reveal</p></div>;
  }

  const current = achievements[currentIndex];
  const styles = RARITY_STYLES[current.achievement.rarity];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-white flex items-center justify-center gap-2">
          <EmojiEventsIcon sx={{ fontSize: 24 }} className="text-yellow-400" />
          Achievements
        </h2>
        <p className="text-gray-400 text-sm">{currentIndex + 1} of {achievements.length}</p>
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-1.5">
        {achievements.map((_, i) => (
          <div key={i} className={`w-2 h-2 rounded-full ${i < currentIndex ? 'bg-purple-500' : i === currentIndex ? 'bg-yellow-400' : 'bg-gray-600'}`} />
        ))}
      </div>

      {/* Current Achievement Card */}
      <div className="max-w-sm mx-auto p-6 rounded-xl bg-white/5 backdrop-blur-md border border-white/10">
        <div className="text-center space-y-4">
          <div className={`w-16 h-16 mx-auto rounded-xl bg-gradient-to-br ${styles.gradient} flex items-center justify-center text-3xl shadow-lg`}>
            {current.achievement.icon}
          </div>
          
          <div>
            <h3 className={`text-xl font-bold bg-gradient-to-r ${styles.gradient} bg-clip-text text-transparent`}>
              {current.achievement.name}
            </h3>
            <p className="text-gray-400 text-sm mt-1">{current.achievement.description}</p>
          </div>

          <div>
            <span className="text-gray-500 text-xs">Earned by</span>
            <p className={`font-semibold ${isCurrentPlayer(current.playerName) ? 'text-purple-300' : 'text-white'}`}>
              {current.playerName}
              {isCurrentPlayer(current.playerName) && <span className="text-purple-400 text-xs ml-1">(You)</span>}
            </p>
          </div>

          <div className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r ${styles.gradient} text-white font-bold shadow-lg`}>
            <StarIcon sx={{ fontSize: 16 }} />
            +{current.achievement.bonusPoints} pts
          </div>

          <span className={`block text-xs px-3 py-1 rounded-full ${styles.badge} uppercase tracking-wider`}>
            {current.achievement.rarity}
          </span>
        </div>
      </div>

      {/* Previously revealed */}
      {currentIndex > 0 && (
        <div className="space-y-2">
          <h4 className="text-gray-500 text-xs text-center">Previously Revealed</h4>
          <div className="flex flex-wrap justify-center gap-2">
            {achievements.slice(0, currentIndex).map((item, i) => {
              const s = RARITY_STYLES[item.achievement.rarity];
              return (
                <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-lg">{item.achievement.icon}</span>
                  <span className="text-white text-sm">{item.playerName}</span>
                  <span className={`text-xs font-bold bg-gradient-to-r ${s.gradient} bg-clip-text text-transparent`}>
                    +{item.achievement.bonusPoints}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Host next button */}
      {isHost && (
        <div className="pt-2">
          <GlassButton onClick={handleNext} variant="outline" className="w-full flex items-center justify-center gap-2">
            {currentIndex < achievements.length - 1 ? 'Next Achievement' : 'Continue to Categories'}
            <NavigateNextIcon sx={{ fontSize: 18 }} />
          </GlassButton>
        </div>
      )}
    </div>
  );
}

export default AchievementReveal;
