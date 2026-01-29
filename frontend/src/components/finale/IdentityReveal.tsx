import { useState, useEffect } from 'react';
import { LeaderboardEntry } from '../../types';
import TheaterComedyIcon from '@mui/icons-material/TheaterComedy';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import StarIcon from '@mui/icons-material/Star';

interface VoteComment {
  voterAlias: string;
  voterColor: string;
  rating: number;
  comment: string;
  superVote: boolean;
}

interface SongWithComments {
  id: string;
  title: string;
  artist: string;
  artworkUrl: string;
  finalScore: number | null;
  confidence: 1 | 2 | 3 | 4 | 5;
  comments?: VoteComment[];
}

interface IdentityRevealedEvent {
  alias: string;
  realName: string;
  songs: SongWithComments[];
  playerId: string;
  rank: number;
  finalScore: number;
}

interface IdentityRevealProps {
  currentReveal: IdentityRevealedEvent | null;
  revealedIdentities: IdentityRevealedEvent[];
  standings: LeaderboardEntry[];
  currentPlayerAlias: string | null;
  achievementBonuses?: Map<string, { bonus: number; count: number }>;
}

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1: return <WorkspacePremiumIcon sx={{ fontSize: 32 }} className="text-yellow-400" />;
    case 2: return <MilitaryTechIcon sx={{ fontSize: 32 }} className="text-gray-300" />;
    case 3: return <MilitaryTechIcon sx={{ fontSize: 32 }} className="text-orange-400" />;
    default: return <span className="text-lg font-bold text-gray-400">#{rank}</span>;
  }
};

export function IdentityReveal({ currentReveal, revealedIdentities, standings, currentPlayerAlias, achievementBonuses }: IdentityRevealProps) {
  const [showSongs, setShowSongs] = useState(false);
  const currentStanding = currentReveal ? standings.find(s => s.alias === currentReveal.alias) : null;

  useEffect(() => {
    setShowSongs(false);
    const timer = setTimeout(() => setShowSongs(true), 1000);
    return () => clearTimeout(timer);
  }, [currentReveal?.alias]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-white flex items-center justify-center gap-2">
          <TheaterComedyIcon sx={{ fontSize: 24 }} className="text-purple-400" />
          Identity Reveals
        </h2>
        <p className="text-gray-400 text-sm">Who is behind each alias?</p>
      </div>

      {/* Current Reveal Card */}
      {currentReveal && currentStanding && (
        <div className="max-w-md mx-auto p-5 rounded-xl bg-white/5 backdrop-blur-md border border-white/10" style={{ boxShadow: `0 0 20px ${currentStanding.color}30` }}>
          <div className="text-center space-y-3">
            {/* Rank */}
            <div className="flex justify-center">{getRankIcon(currentReveal.rank)}</div>
            
            {/* Avatar */}
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-3xl text-white font-bold">
              {currentReveal.realName.charAt(0).toUpperCase()}
            </div>

            {/* Names */}
            <div>
              <span className="text-gray-500 text-xs">Known as</span>
              <p className="text-lg font-bold" style={{ color: currentStanding.color }}>{currentReveal.alias}</p>
            </div>
            <div>
              <span className="text-gray-500 text-xs">Is actually</span>
              <p className="text-2xl font-bold text-white">{currentReveal.realName}</p>
            </div>

            {/* Songs */}
            {showSongs && currentReveal.songs.length > 0 && (
              <div className="space-y-2 pt-2">
                <h4 className="text-gray-500 text-xs">Submitted Songs</h4>
                {currentReveal.songs.map((song) => (
                  <div key={song.id} className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
                    <img src={song.artworkUrl || 'https://via.placeholder.com/40?text=♪'} alt="" className="w-10 h-10 rounded object-cover" onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/40?text=♪'; }} />
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-white text-sm truncate">{song.title}</p>
                      <p className="text-gray-400 text-xs truncate">{song.artist}</p>
                    </div>
                    <span className="text-purple-400 font-bold text-sm">{song.finalScore?.toFixed(1) ?? '-'}</span>
                  </div>
                ))}

                {/* Comments */}
                {currentReveal.songs.some(s => s.comments && s.comments.length > 0) && (
                  <div className="pt-2 border-t border-white/10">
                    <h4 className="text-gray-500 text-xs mb-2 flex items-center justify-center gap-1">
                      <FormatQuoteIcon sx={{ fontSize: 12 }} /> What People Said
                    </h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto scrollbar-thin">
                      {currentReveal.songs.flatMap(song => (song.comments || []).slice(0, 2).map((comment, idx) => (
                        <div key={`${song.id}-${idx}`} className="bg-white/5 rounded-lg p-2 text-left">
                          <p className="text-white/80 text-xs italic">"{comment.comment}"</p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs" style={{ color: comment.voterColor }}>{comment.voterAlias}</span>
                            <div className="flex items-center gap-0.5">
                              <StarIcon sx={{ fontSize: 10 }} className="text-yellow-400" />
                              <span className="text-yellow-400 text-xs">{comment.rating}</span>
                            </div>
                          </div>
                        </div>
                      )))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Final Score */}
            <div className="pt-2">
              <span className="text-gray-500 text-xs">Final Score</span>
              <p className="text-2xl font-bold text-white">{(currentReveal.finalScore ?? 0).toFixed(1)}</p>
              {achievementBonuses?.get(currentReveal.alias)?.bonus && (
                <span className="text-yellow-400 text-xs">+{achievementBonuses.get(currentReveal.alias)?.bonus} from achievements</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Previously revealed */}
      {revealedIdentities.length > 1 && (
        <div className="space-y-2">
          <h4 className="text-gray-500 text-xs text-center">Already Revealed</h4>
          <div className="flex flex-wrap justify-center gap-2">
            {revealedIdentities.slice(0, -1).map((identity) => {
              const standing = standings.find(s => s.alias === identity.alias);
              const isCurrentPlayer = identity.alias === currentPlayerAlias;
              return (
                <div key={identity.alias} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${isCurrentPlayer ? 'bg-purple-500/20 border border-purple-500/30' : 'bg-white/5 border border-white/10'}`}>
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs text-white font-bold">
                    {identity.realName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-white text-sm">{identity.realName}</span>
                  <span className="text-xs" style={{ color: standing?.color ?? '#9ca3af' }}>{identity.alias}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Remaining count */}
      {standings.filter(s => !s.isRevealed).length > 0 && (
        <p className="text-center text-gray-500 text-sm">
          {standings.filter(s => !s.isRevealed).length} player{standings.filter(s => !s.isRevealed).length !== 1 ? 's' : ''} remaining...
        </p>
      )}
    </div>
  );
}
