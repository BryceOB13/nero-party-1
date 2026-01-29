import { LeaderboardEntry } from '../../types';
import LockIcon from '@mui/icons-material/Lock';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech';

interface ScoresFrozenProps {
  standings: LeaderboardEntry[];
  currentPlayerAlias: string | null;
}

const getRankBadge = (rank: number) => {
  switch (rank) {
    case 1: return { icon: <WorkspacePremiumIcon sx={{ fontSize: 20 }} className="text-yellow-400" />, color: 'from-yellow-500 to-amber-500' };
    case 2: return { icon: <MilitaryTechIcon sx={{ fontSize: 20 }} className="text-gray-300" />, color: 'from-gray-400 to-gray-300' };
    case 3: return { icon: <MilitaryTechIcon sx={{ fontSize: 20 }} className="text-orange-400" />, color: 'from-orange-600 to-orange-500' };
    default: return { icon: <span className="text-sm font-bold">{rank}</span>, color: 'from-gray-600 to-gray-500' };
  }
};

export function ScoresFrozen({ standings, currentPlayerAlias }: ScoresFrozenProps) {
  const sortedStandings = [...standings].sort((a, b) => a.rank - b.rank);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-3 px-5 py-2 rounded-xl bg-purple-600/20 border border-purple-500/30">
          <LockIcon sx={{ fontSize: 24 }} className="text-purple-400" />
          <div>
            <h2 className="text-xl font-bold text-white">Scores Locked</h2>
            <p className="text-purple-300 text-xs">Final standings before bonus reveals</p>
          </div>
        </div>
      </div>

      {/* Standings List */}
      <div className="p-4 rounded-xl bg-white/5 backdrop-blur-md border border-white/10">
        <div className="space-y-2">
          {sortedStandings.map((entry) => {
            const rankBadge = getRankBadge(entry.rank);
            const isCurrentPlayer = entry.alias === currentPlayerAlias;

            return (
              <div
                key={entry.alias}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                  isCurrentPlayer 
                    ? 'bg-purple-500/20 border border-purple-500/30' 
                    : 'bg-white/5 border border-transparent'
                }`}
              >
                {/* Rank */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br ${rankBadge.color}`}>
                  {entry.rank <= 3 ? rankBadge.icon : <span className="text-xs font-bold text-white">{entry.rank}</span>}
                </div>

                {/* Avatar */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ backgroundColor: entry.color + '40', color: entry.color }}
                >
                  {entry.alias.charAt(0).toUpperCase()}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium truncate ${isCurrentPlayer ? 'text-purple-300' : 'text-white'}`}>
                      {entry.alias}
                    </span>
                    {isCurrentPlayer && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/30 text-purple-300">You</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">{entry.songCount} song{entry.songCount !== 1 ? 's' : ''}</span>
                </div>

                {/* Score */}
                <div className="text-right">
                  <div className="text-lg font-bold text-white">{entry.score.toFixed(1)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-center text-gray-500 text-sm">Who will claim the bonus categories?</p>
    </div>
  );
}
