import { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '../../store/gameStore';
import { socket } from '../../lib/socket';
import { LeaderboardEntry, BonusCategory, BonusResult, FinalStanding, Achievement } from '../../types';
import { ScoresFrozen } from './ScoresFrozen';
import { BonusCategoryReveal } from './BonusCategoryReveal';
import { IdentityReveal } from './IdentityReveal';
import { ChampionCrowned } from './ChampionCrowned';
import { AchievementReveal } from './AchievementReveal';
import { CompactLayout } from '../ui/CompactLayout';
import { GlassButton } from '../ui/GlassButton';
import CelebrationIcon from '@mui/icons-material/Celebration';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

type FinalePhase = 'frozen' | 'achievements' | 'categories' | 'identities' | 'champion';

interface FinaleStartEvent {
  frozenStandings: LeaderboardEntry[];
}

interface CategoryRevealEvent {
  category: BonusCategory;
  winner: BonusResult;
}

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

interface ChampionEvent {
  champion: FinalStanding;
}

interface PlayerAchievementData {
  achievement: Achievement;
  playerName: string;
  playerId: string;
}

interface AchievementRevealEvent {
  achievement: Achievement;
  playerName: string;
  playerId: string;
  bonusPoints: number;
}

interface AchievementRevealStartEvent {
  achievements: AchievementRevealEvent[];
}

export function FinaleScreen() {
  const { 
    myIdentity,
    leaderboard,
    setLeaderboard,
    setBonusResults,
    setFinalStandings,
    currentPlayer,
  } = useGameStore();

  const isHost = currentPlayer?.isHost ?? false;

  const [phase, setPhase] = useState<FinalePhase>('frozen');
  const [frozenStandings, setFrozenStandings] = useState<LeaderboardEntry[]>(leaderboard);
  const [currentCategory, setCurrentCategory] = useState<{ category: BonusCategory; winner: BonusResult } | null>(null);
  const [revealedCategories, setRevealedCategories] = useState<{ category: BonusCategory; winner: BonusResult }[]>([]);
  const [currentReveal, setCurrentReveal] = useState<IdentityRevealedEvent | null>(null);
  const [revealedIdentities, setRevealedIdentities] = useState<IdentityRevealedEvent[]>([]);
  const [champion, setChampion] = useState<FinalStanding | null>(null);
  const [updatedStandings, setUpdatedStandings] = useState<LeaderboardEntry[]>(leaderboard);
  
  const [achievementsToReveal, setAchievementsToReveal] = useState<PlayerAchievementData[]>([]);
  const [achievementBonuses, setAchievementBonuses] = useState<Map<string, { bonus: number; count: number }>>(new Map());
  const [playerMap, setPlayerMap] = useState<Map<string, { name: string; alias: string; color: string }>>(() => {
    const map = new Map<string, { name: string; alias: string; color: string }>();
    leaderboard.forEach(entry => {
      map.set(entry.alias, {
        name: entry.revealedName || entry.alias,
        alias: entry.alias,
        color: entry.color,
      });
    });
    return map;
  });

  const handleHostAdvance = useCallback(() => {
    if (!isHost) return;
    
    if (phase === 'frozen') {
      setPhase('achievements');
    } else if (phase === 'achievements') {
      setPhase('categories');
    } else if (phase === 'categories') {
      setPhase('identities');
    } else if (phase === 'identities') {
      setPhase('champion');
    }
  }, [isHost, phase]);

  const handleAchievementPhaseComplete = useCallback(() => {
    // Only auto-advance if no host control needed
    if (!isHost) {
      setPhase('categories');
    }
  }, [isHost]);

  useEffect(() => {
    const handleFinaleStart = (data: FinaleStartEvent) => {
      setFrozenStandings(data.frozenStandings);
      setUpdatedStandings(data.frozenStandings);
      setLeaderboard(data.frozenStandings);
      setPhase('frozen');
      
      const newPlayerMap = new Map<string, { name: string; alias: string; color: string }>();
      data.frozenStandings.forEach(entry => {
        newPlayerMap.set(entry.alias, {
          name: entry.revealedName || entry.alias,
          alias: entry.alias,
          color: entry.color,
        });
      });
      setPlayerMap(newPlayerMap);
    };

    const handleAchievementRevealStart = (data: AchievementRevealStartEvent) => {
      const achievements: PlayerAchievementData[] = data.achievements.map(a => ({
        achievement: a.achievement,
        playerName: a.playerName,
        playerId: a.playerId,
      }));
      setAchievementsToReveal(achievements);
      
      const bonusMap = new Map<string, { bonus: number; count: number }>();
      data.achievements.forEach(a => {
        const existing = bonusMap.get(a.playerName) || { bonus: 0, count: 0 };
        bonusMap.set(a.playerName, {
          bonus: existing.bonus + a.bonusPoints,
          count: existing.count + 1,
        });
      });
      setAchievementBonuses(bonusMap);
      setPhase('achievements');
    };

    const handleCategoryReveal = (data: CategoryRevealEvent) => {
      setPhase('categories');
      setCurrentCategory(data);
      setRevealedCategories(prev => [...prev, data]);
      
      setUpdatedStandings(prev => prev.map(entry => {
        if (entry.alias === data.winner.winnerPlayerId) {
          return { ...entry, score: entry.score + data.winner.points, previousScore: entry.score };
        }
        return entry;
      }));
    };

    const handleIdentityRevealed = (data: IdentityRevealedEvent) => {
      setPhase('identities');
      setCurrentReveal(data);
      setRevealedIdentities(prev => [...prev, data]);
      
      setUpdatedStandings(prev => prev.map(entry => {
        if (entry.alias === data.alias) {
          return { ...entry, isRevealed: true, revealedName: data.realName };
        }
        return entry;
      }));
    };

    const handleChampion = (data: ChampionEvent) => {
      setPhase('champion');
      setChampion(data.champion);
      setFinalStandings([data.champion]);
    };

    const handleAchievementReveal = (data: AchievementRevealEvent) => {
      const playerAchievement: PlayerAchievementData = {
        achievement: data.achievement,
        playerName: data.playerName,
        playerId: data.playerId,
      };
      
      setAchievementsToReveal(prev => [...prev, playerAchievement]);
      
      setAchievementBonuses(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(data.playerName) || { bonus: 0, count: 0 };
        newMap.set(data.playerName, {
          bonus: existing.bonus + data.bonusPoints,
          count: existing.count + 1,
        });
        return newMap;
      });
      
      setUpdatedStandings(prev => prev.map(entry => {
        if (entry.alias === data.playerName || entry.revealedName === data.playerName) {
          return { ...entry, score: entry.score + data.bonusPoints, previousScore: entry.score };
        }
        return entry;
      }));
    };

    socket.on('finale:start', handleFinaleStart);
    socket.on('finale:achievement_reveal_start', handleAchievementRevealStart);
    socket.on('finale:category_reveal', handleCategoryReveal);
    socket.on('finale:identity_revealed', handleIdentityRevealed);
    socket.on('finale:champion', handleChampion);
    socket.on('achievement:reveal', handleAchievementReveal);

    return () => {
      socket.off('finale:start', handleFinaleStart);
      socket.off('finale:achievement_reveal_start', handleAchievementRevealStart);
      socket.off('finale:category_reveal', handleCategoryReveal);
      socket.off('finale:identity_revealed', handleIdentityRevealed);
      socket.off('finale:champion', handleChampion);
      socket.off('achievement:reveal', handleAchievementReveal);
    };
  }, [setLeaderboard, setBonusResults, setFinalStandings]);

  const getPhaseLabel = () => {
    switch (phase) {
      case 'frozen': return 'View Achievements';
      case 'achievements': return 'View Bonus Categories';
      case 'categories': return 'Reveal Identities';
      case 'identities': return 'Crown Champion';
      default: return '';
    }
  };

  const header = (
    <div className="text-center py-2 animate-fade-in">
      <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent flex items-center justify-center gap-2">
        <CelebrationIcon sx={{ fontSize: 24 }} className="text-purple-400" />
        The Finale
        <CelebrationIcon sx={{ fontSize: 24 }} className="text-purple-400" />
      </h1>
    </div>
  );

  return (
    <CompactLayout header={header} background="gradient" withOrbs={true} contentClassName="finale-content">
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-2 sm:px-4">
          <div className="max-w-4xl mx-auto py-2">
            {phase === 'frozen' && (
              <ScoresFrozen standings={frozenStandings} currentPlayerAlias={myIdentity?.alias ?? null} />
            )}

            {phase === 'achievements' && (
              achievementsToReveal.length > 0 ? (
                <AchievementReveal
                  achievements={achievementsToReveal}
                  players={playerMap}
                  onRevealComplete={handleAchievementPhaseComplete}
                  currentPlayerAlias={myIdentity?.alias ?? null}
                  isHost={isHost}
                />
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400">No achievements unlocked this game</p>
                </div>
              )
            )}

            {phase === 'categories' && (
              <BonusCategoryReveal
                currentCategory={currentCategory}
                revealedCategories={revealedCategories}
                standings={updatedStandings}
                currentPlayerAlias={myIdentity?.alias ?? null}
                achievementBonuses={achievementBonuses}
              />
            )}

            {phase === 'identities' && (
              <IdentityReveal
                currentReveal={currentReveal}
                revealedIdentities={revealedIdentities}
                standings={updatedStandings}
                currentPlayerAlias={myIdentity?.alias ?? null}
                achievementBonuses={achievementBonuses}
              />
            )}

            {phase === 'champion' && champion && (
              <ChampionCrowned champion={champion} achievementBonuses={achievementBonuses} />
            )}
          </div>
        </div>

        {/* Host advance button */}
        {isHost && phase !== 'champion' && (
          <div className="flex-shrink-0 p-3 border-t border-white/10 bg-black/20">
            <GlassButton
              onClick={handleHostAdvance}
              variant="primary"
              className="w-full flex items-center justify-center gap-2"
            >
              {getPhaseLabel()}
              <NavigateNextIcon sx={{ fontSize: 20 }} />
            </GlassButton>
          </div>
        )}
      </div>
    </CompactLayout>
  );
}
