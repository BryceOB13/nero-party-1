import { useState, useEffect } from 'react';
import { FinalStanding } from '../../types';
import CelebrationIcon from '@mui/icons-material/Celebration';
import StarIcon from '@mui/icons-material/Star';
import TheaterComedyIcon from '@mui/icons-material/TheaterComedy';
import DiamondIcon from '@mui/icons-material/Diamond';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import MusicNoteIcon from '@mui/icons-material/MusicNote';

interface ChampionCrownedProps {
  champion: FinalStanding;
  achievementBonuses?: Map<string, { bonus: number; count: number }>;
}

export function ChampionCrowned({ champion, achievementBonuses }: ChampionCrownedProps) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowDetails(true), 800);
    return () => clearTimeout(timer);
  }, []);

  const championAchievementBonus = achievementBonuses?.get(champion.alias) || achievementBonuses?.get(champion.realName);

  const getCategoryIcon = (cat: string) => {
    if (cat === 'Crowd Favorite') return <StarIcon sx={{ fontSize: 16 }} className="text-yellow-400" />;
    if (cat === 'Cult Classic') return <TheaterComedyIcon sx={{ fontSize: 16 }} className="text-purple-400" />;
    if (cat === 'Hidden Gem') return <DiamondIcon sx={{ fontSize: 16 }} className="text-cyan-400" />;
    if (cat === 'Bold Move') return <GpsFixedIcon sx={{ fontSize: 16 }} className="text-red-400" />;
    return <EmojiEventsIcon sx={{ fontSize: 16 }} className="text-yellow-400" />;
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-400 bg-clip-text text-transparent flex items-center justify-center gap-2">
          <CelebrationIcon sx={{ fontSize: 28 }} className="text-yellow-400" />
          CHAMPION
          <CelebrationIcon sx={{ fontSize: 28 }} className="text-yellow-400" />
        </h2>
      </div>

      <div className="max-w-md mx-auto p-6 rounded-xl bg-gradient-to-br from-yellow-500/10 to-amber-500/10 backdrop-blur-md border border-yellow-500/30" style={{ boxShadow: '0 0 30px rgba(234, 179, 8, 0.2)' }}>
        <div className="text-center space-y-4">
          <div className="text-5xl">👑</div>
          <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center text-4xl text-white font-bold shadow-xl">
            {champion.realName.charAt(0).toUpperCase()}
          </div>

          <div>
            <h3 className="text-2xl font-bold text-white">{champion.realName}</h3>
            <p className="text-yellow-400 text-sm">formerly <span className="font-semibold">{champion.alias}</span></p>
          </div>

          <div className="inline-block px-6 py-3 rounded-xl bg-yellow-500/20 border border-yellow-500/30">
            <span className="text-gray-400 text-xs block">Final Score</span>
            <span className="text-4xl font-bold text-white">{(champion.finalScore ?? 0).toFixed(1)}</span>
          </div>

          {showDetails && (
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-lg bg-white/5">
                  <span className="text-gray-500 text-xs block">Base</span>
                  <span className="text-white font-bold">{(champion.totalBaseScore ?? 0).toFixed(1)}</span>
                </div>
                <div className="p-2 rounded-lg bg-white/5">
                  <span className="text-gray-500 text-xs block">Confidence</span>
                  <span className={`font-bold ${(champion.confidenceModifiers ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {(champion.confidenceModifiers ?? 0) >= 0 ? '+' : ''}{(champion.confidenceModifiers ?? 0).toFixed(1)}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-white/5">
                  <span className="text-gray-500 text-xs block">Bonus</span>
                  <span className="text-yellow-400 font-bold">+{(champion.bonusPoints ?? 0).toFixed(1)}</span>
                </div>
              </div>

              {championAchievementBonus && championAchievementBonus.bonus > 0 && (
                <div className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <span className="text-yellow-400 text-sm">+{championAchievementBonus.bonus} from {championAchievementBonus.count} achievement{championAchievementBonus.count !== 1 ? 's' : ''}</span>
                </div>
              )}

              <div className="flex flex-wrap justify-center gap-2">
                {(champion.bonusCategories || []).map(cat => (
                  <div key={cat} className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 border border-white/20">
                    {getCategoryIcon(cat)}
                    <span className="text-white text-xs">{cat}</span>
                  </div>
                ))}
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 border border-white/20">
                  <MusicNoteIcon sx={{ fontSize: 14 }} className="text-purple-400" />
                  <span className="text-white text-xs">{(champion.songs || []).length} Songs</span>
                </div>
              </div>

              {champion.highestSong && (
                <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <span className="text-purple-400 text-xs block mb-2">Highest Scoring Song</span>
                  <div className="flex items-center gap-3">
                    <img src={champion.highestSong.artworkUrl || 'https://via.placeholder.com/48?text=♪'} alt="" className="w-12 h-12 rounded object-cover" onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/48?text=♪'; }} />
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-white font-medium text-sm truncate">{champion.highestSong.title}</p>
                      <p className="text-gray-400 text-xs truncate">{champion.highestSong.artist}</p>
                    </div>
                    <span className="text-purple-400 font-bold">{champion.highestSong.finalScore?.toFixed(1) ?? '-'}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <p className="text-center text-gray-400 text-sm">Congratulations to our champion!</p>
    </div>
  );
}
