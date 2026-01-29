import { BonusCategory, BonusResult, LeaderboardEntry } from '../../types';
import StarIcon from '@mui/icons-material/Star';
import TheaterComedyIcon from '@mui/icons-material/TheaterComedy';
import DiamondIcon from '@mui/icons-material/Diamond';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

interface BonusCategoryRevealProps {
  currentCategory: { category: BonusCategory; winner: BonusResult } | null;
  revealedCategories: { category: BonusCategory; winner: BonusResult }[];
  standings: LeaderboardEntry[];
  currentPlayerAlias: string | null;
  achievementBonuses?: Map<string, { bonus: number; count: number }>;
}

const getCategoryIcon = (categoryId: string) => {
  const icons: Record<string, JSX.Element> = {
    'crowd-favorite': <StarIcon sx={{ fontSize: 28 }} className="text-yellow-400" />,
    'cult-classic': <TheaterComedyIcon sx={{ fontSize: 28 }} className="text-purple-400" />,
    'hidden-gem': <DiamondIcon sx={{ fontSize: 28 }} className="text-cyan-400" />,
    'bold-move': <GpsFixedIcon sx={{ fontSize: 28 }} className="text-red-400" />,
  };
  return icons[categoryId] || <EmojiEventsIcon sx={{ fontSize: 28 }} className="text-yellow-400" />;
};

const CATEGORY_COLORS: Record<string, string> = {
  'crowd-favorite': 'from-yellow-500 to-amber-500',
  'cult-classic': 'from-purple-500 to-pink-500',
  'hidden-gem': 'from-cyan-500 to-blue-500',
  'bold-move': 'from-red-500 to-orange-500',
};

export function BonusCategoryReveal({ 
  currentCategory, 
  revealedCategories, 
  standings,
  currentPlayerAlias,
  achievementBonuses,
}: BonusCategoryRevealProps) {
  const sortedStandings = [...standings].sort((a, b) => a.rank - b.rank);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-white flex items-center justify-center gap-2">
          <EmojiEventsIcon sx={{ fontSize: 24 }} className="text-yellow-400" />
          Bonus Categories
        </h2>
        <p className="text-gray-400 text-sm">Special awards for outstanding performances</p>
      </div>

      {/* Current Category */}
      {currentCategory && (
        <div className="max-w-sm mx-auto p-5 rounded-xl bg-white/5 backdrop-blur-md border border-white/10">
          <div className="text-center space-y-3">
            {getCategoryIcon(currentCategory.category.id)}
            <h3 className={`text-lg font-bold bg-gradient-to-r ${CATEGORY_COLORS[currentCategory.category.id] || 'from-gray-400 to-gray-500'} bg-clip-text text-transparent`}>
              {currentCategory.category.name}
            </h3>
            <p className="text-gray-400 text-sm">{currentCategory.category.description}</p>
            <div className="pt-2">
              <span className="text-gray-500 text-xs">Winner</span>
              <p className="text-white font-semibold">{currentCategory.winner.categoryName}</p>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r ${CATEGORY_COLORS[currentCategory.category.id] || 'from-gray-400 to-gray-500'} text-white font-bold`}>
              +{currentCategory.winner.points} pts
            </span>
          </div>
        </div>
      )}

      {!currentCategory && revealedCategories.length === 0 && (
        <div className="text-center py-6">
          <p className="text-gray-400">Calculating bonus category winners...</p>
        </div>
      )}

      {/* Previously revealed categories */}
      {revealedCategories.length > 1 && (
        <div className="space-y-2">
          <h4 className="text-gray-500 text-xs text-center">Previously Revealed</h4>
          <div className="flex flex-wrap justify-center gap-2">
            {revealedCategories.slice(0, -1).map((item) => (
              <div key={item.category.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                {getCategoryIcon(item.category.id)}
                <span className="text-white text-sm">{item.category.name}</span>
                <span className="text-green-400 text-xs font-bold">+{item.winner.points}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Updated Standings */}
      <div className="p-4 rounded-xl bg-white/5 backdrop-blur-md border border-white/10">
        <h3 className="text-sm font-semibold text-gray-400 mb-3 text-center">Updated Standings</h3>
        <div className="space-y-1.5">
          {sortedStandings.slice(0, 5).map((entry) => {
            const isCurrentPlayer = entry.alias === currentPlayerAlias;
            const hasScoreChange = entry.previousScore !== null && entry.previousScore !== entry.score;
            const playerAchievements = achievementBonuses?.get(entry.alias) || achievementBonuses?.get(entry.revealedName ?? '');
            
            return (
              <div key={entry.alias} className={`flex items-center gap-2 p-2 rounded-lg ${isCurrentPlayer ? 'bg-purple-500/20 border border-purple-500/30' : 'bg-white/5'}`}>
                <span className="w-6 text-center text-sm font-bold text-gray-500">#{entry.rank}</span>
                <div className="flex-1 min-w-0">
                  <span className={`text-sm font-medium ${isCurrentPlayer ? 'text-purple-300' : 'text-white'}`}>{entry.alias}</span>
                  {playerAchievements && playerAchievements.bonus > 0 && (
                    <span className="text-yellow-400 text-xs ml-2">+{playerAchievements.bonus} achievements</span>
                  )}
                </div>
                <div className="text-right">
                  <span className={`font-bold text-sm ${hasScoreChange ? 'text-green-400' : 'text-white'}`}>{entry.score.toFixed(1)}</span>
                  {hasScoreChange && <span className="text-green-400 text-xs ml-1">+{(entry.score - (entry.previousScore ?? 0)).toFixed(1)}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
