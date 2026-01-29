import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FinalStanding } from '../../types';
import CelebrationIcon from '@mui/icons-material/Celebration';
import StarIcon from '@mui/icons-material/Star';
import TheaterComedyIcon from '@mui/icons-material/TheaterComedy';
import DiamondIcon from '@mui/icons-material/Diamond';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import GradeIcon from '@mui/icons-material/Grade';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

interface ChampionCrownedProps {
  champion: FinalStanding;
  /** Achievement bonuses per player (keyed by player name/alias) */
  achievementBonuses?: Map<string, { bonus: number; count: number }>;
}

// Confetti particle component
interface ConfettiParticle {
  id: number;
  x: number;
  color: string;
  delay: number;
  duration: number;
  rotation: number;
  size: number;
}

function Confetti() {
  const [particles, setParticles] = useState<ConfettiParticle[]>([]);
  
  useEffect(() => {
    const colors = ['#a855f7', '#ec4899', '#06b6d4', '#eab308', '#22c55e', '#f97316'];
    const newParticles: ConfettiParticle[] = [];
    
    for (let i = 0; i < 100; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 2,
        duration: 3 + Math.random() * 2,
        rotation: Math.random() * 360,
        size: 8 + Math.random() * 8,
      });
    }
    
    setParticles(newParticles);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          initial={{ 
            y: -20, 
            x: `${particle.x}vw`,
            rotate: 0,
            opacity: 1,
          }}
          animate={{ 
            y: '110vh',
            rotate: particle.rotation + 720,
            opacity: [1, 1, 0],
          }}
          transition={{ 
            duration: particle.duration,
            delay: particle.delay,
            ease: 'linear',
          }}
          style={{
            position: 'absolute',
            width: particle.size,
            height: particle.size,
            backgroundColor: particle.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          }}
        />
      ))}
    </div>
  );
}

// Crown animation component
function CrownAnimation({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ y: -200, scale: 2, rotate: -10 }}
      animate={{ 
        y: 0, 
        scale: 1, 
        rotate: 0,
      }}
      transition={{ 
        type: 'spring',
        stiffness: 100,
        damping: 10,
        duration: 1.5,
      }}
      className="text-8xl"
    >
      👑
    </motion.div>
  );
}

// Achievement badge component
interface AchievementBadgeProps {
  icon: React.ReactNode;
  label: string;
  delay: number;
}

function AchievementBadge({ icon, label, delay }: AchievementBadgeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ 
        delay,
        type: 'spring',
        stiffness: 300,
      }}
      className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm"
    >
      <span className="text-xl">{icon}</span>
      <span className="text-white text-sm font-medium">{label}</span>
    </motion.div>
  );
}

export function ChampionCrowned({ champion, achievementBonuses }: ChampionCrownedProps) {
  const [showConfetti, setShowConfetti] = useState(true);
  const [crownLanded, setCrownLanded] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Stop confetti after 5 seconds
    const confettiTimer = setTimeout(() => setShowConfetti(false), 5000);
    
    // Show details after crown lands
    const detailsTimer = setTimeout(() => setShowDetails(true), 2500);
    
    return () => {
      clearTimeout(confettiTimer);
      clearTimeout(detailsTimer);
    };
  }, []);

  // Get champion's achievement bonus
  const championAchievementBonus = achievementBonuses?.get(champion.alias) || achievementBonuses?.get(champion.realName);

  // Generate achievements based on champion data
  const achievements = [
    ...(champion.bonusCategories.map(cat => ({
      icon: cat === 'Crowd Favorite' ? <StarIcon className="text-yellow-400" /> : 
            cat === 'Cult Classic' ? <TheaterComedyIcon className="text-purple-400" /> : 
            cat === 'Hidden Gem' ? <DiamondIcon className="text-cyan-400" /> : 
            cat === 'Bold Move' ? <GpsFixedIcon className="text-red-400" /> : <EmojiEventsIcon className="text-yellow-400" />,
      label: cat,
    }))),
    // Add achievement bonus badge if they have achievements
    ...(championAchievementBonus && championAchievementBonus.count > 0 ? [{
      icon: <EmojiEventsIcon className="text-yellow-400" />,
      label: `${championAchievementBonus.count} Achievement${championAchievementBonus.count !== 1 ? 's' : ''} (+${championAchievementBonus.bonus} pts)`,
    }] : []),
    { icon: <MusicNoteIcon className="text-purple-400" />, label: `${champion.songs.length} Song${champion.songs.length !== 1 ? 's' : ''} Submitted` },
    { icon: <GradeIcon className="text-yellow-400" />, label: `Top Score: ${champion.highestSong?.finalScore?.toFixed(1) ?? '-'}` },
  ];

  return (
    <div className="relative">
      {/* Confetti Effect */}
      {showConfetti && <Confetti />}

      {/* Main Content */}
      <div className="space-y-8">
        {/* Champion Header */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.h2
            animate={{
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
            }}
            transition={{ duration: 3, repeat: Infinity }}
            className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-400 bg-[length:200%_auto] bg-clip-text text-transparent mb-2 flex items-center justify-center gap-3"
          >
            <CelebrationIcon sx={{ fontSize: 40 }} className="text-yellow-400" /> CHAMPION <CelebrationIcon sx={{ fontSize: 40 }} className="text-yellow-400" />
          </motion.h2>
        </motion.div>

        {/* Champion Card */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="max-w-2xl mx-auto"
        >
          <motion.div
            animate={{
              boxShadow: [
                '0 0 30px rgba(234, 179, 8, 0.3)',
                '0 0 60px rgba(234, 179, 8, 0.5)',
                '0 0 30px rgba(234, 179, 8, 0.3)',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="p-8 rounded-3xl bg-gradient-to-br from-yellow-500/20 via-amber-500/10 to-orange-500/20 backdrop-blur-md border-2 border-yellow-500/30"
          >
            {/* Crown and Avatar */}
            <div className="flex flex-col items-center mb-6">
              {/* Crown Animation */}
              <CrownAnimation onComplete={() => setCrownLanded(true)} />
              
              {/* Champion Avatar */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
                className="relative -mt-4"
              >
                <motion.div
                  animate={crownLanded ? {
                    boxShadow: [
                      '0 0 20px rgba(234, 179, 8, 0.4)',
                      '0 0 40px rgba(234, 179, 8, 0.6)',
                      '0 0 20px rgba(234, 179, 8, 0.4)',
                    ],
                  } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-32 h-32 rounded-full bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center text-5xl text-white font-bold shadow-2xl"
                >
                  {champion.realName.charAt(0).toUpperCase()}
                </motion.div>
                
                {/* Sparkle effects */}
                {crownLanded && (
                  <>
                    {[...Array(6)].map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ 
                          opacity: [0, 1, 0],
                          scale: [0, 1, 0],
                        }}
                        transition={{ 
                          duration: 1.5,
                          delay: i * 0.2,
                          repeat: Infinity,
                          repeatDelay: 1,
                        }}
                        className="absolute text-2xl"
                        style={{
                          top: `${20 + Math.sin(i * Math.PI / 3) * 50}%`,
                          left: `${50 + Math.cos(i * Math.PI / 3) * 60}%`,
                        }}
                      >
                        <AutoAwesomeIcon sx={{ fontSize: 16 }} className="text-yellow-400" />
                      </motion.div>
                    ))}
                  </>
                )}
              </motion.div>
            </div>

            {/* Champion Name */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className="text-center mb-6"
            >
              <motion.h3
                animate={{
                  textShadow: [
                    '0 0 10px rgba(234, 179, 8, 0.5)',
                    '0 0 20px rgba(234, 179, 8, 0.8)',
                    '0 0 10px rgba(234, 179, 8, 0.5)',
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-4xl font-bold text-white mb-2"
              >
                {champion.realName}
              </motion.h3>
              <p className="text-yellow-400 text-lg">
                formerly known as <span className="font-semibold">{champion.alias}</span>
              </p>
            </motion.div>

            {/* Final Score */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.2 }}
              className="text-center mb-8"
            >
              <div className="inline-block px-8 py-4 rounded-2xl bg-gradient-to-r from-yellow-500/30 to-amber-500/30 border border-yellow-500/50">
                <span className="text-gray-300 text-sm block mb-1">Final Score</span>
                <motion.span
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-5xl font-bold text-white"
                >
                  {champion.finalScore.toFixed(1)}
                </motion.span>
              </div>
            </motion.div>

            {/* Score Breakdown */}
            <AnimatePresence>
              {showDetails && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-4"
                >
                  {/* Score Components */}
                  <div className={`grid ${championAchievementBonus && championAchievementBonus.bonus > 0 ? 'grid-cols-4' : 'grid-cols-3'} gap-4 text-center`}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="p-3 rounded-xl bg-white/5"
                    >
                      <span className="text-gray-400 text-xs block">Base Score</span>
                      <span className="text-white font-bold text-lg">
                        {champion.totalBaseScore.toFixed(1)}
                      </span>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="p-3 rounded-xl bg-white/5"
                    >
                      <span className="text-gray-400 text-xs block">Confidence</span>
                      <span className={`font-bold text-lg ${champion.confidenceModifiers >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {champion.confidenceModifiers >= 0 ? '+' : ''}{champion.confidenceModifiers.toFixed(1)}
                      </span>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="p-3 rounded-xl bg-white/5"
                    >
                      <span className="text-gray-400 text-xs block">Bonus</span>
                      <span className="text-yellow-400 font-bold text-lg">
                        +{champion.bonusPoints.toFixed(1)}
                      </span>
                    </motion.div>
                    {/* Achievement Bonus */}
                    {championAchievementBonus && championAchievementBonus.bonus > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                        className="p-3 rounded-xl bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-500/30"
                      >
                        <span className="text-yellow-400 text-xs block flex items-center justify-center gap-1">
                          <span>🏆</span> Achievements
                        </span>
                        <span className="text-yellow-400 font-bold text-lg">
                          +{championAchievementBonus.bonus}
                        </span>
                      </motion.div>
                    )}
                  </div>

                  {/* Achievements */}
                  <div className="flex flex-wrap justify-center gap-2 mt-4">
                    {achievements.map((achievement, index) => (
                      <AchievementBadge
                        key={achievement.label}
                        icon={achievement.icon}
                        label={achievement.label}
                        delay={0.4 + index * 0.1}
                      />
                    ))}
                  </div>

                  {/* Highest Scoring Song */}
                  {champion.highestSong && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.8 }}
                      className="mt-6 p-4 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30"
                    >
                      <div className="flex items-center gap-4">
                        {/* Song Artwork */}
                        <motion.div
                          animate={{ 
                            boxShadow: [
                              '0 0 10px rgba(168, 85, 247, 0.3)',
                              '0 0 20px rgba(168, 85, 247, 0.5)',
                              '0 0 10px rgba(168, 85, 247, 0.3)',
                            ],
                          }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0"
                        >
                          <img
                            src={champion.highestSong.artworkUrl || 'https://via.placeholder.com/64?text=♪'}
                            alt={champion.highestSong.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/64?text=♪';
                            }}
                          />
                        </motion.div>
                        
                        {/* Song Info */}
                        <div className="flex-1 min-w-0">
                          <span className="text-purple-400 text-xs font-medium">
                            🎵 Highest Scoring Song
                          </span>
                          <p className="text-white font-semibold truncate">
                            {champion.highestSong.title}
                          </p>
                          <p className="text-gray-400 text-sm truncate">
                            {champion.highestSong.artist}
                          </p>
                        </div>
                        
                        {/* Score */}
                        <div className="text-right">
                          <motion.span
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="text-2xl font-bold text-purple-400"
                          >
                            {champion.highestSong.finalScore?.toFixed(1) ?? '-'}
                          </motion.span>
                          <p className="text-xs text-gray-500">pts</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>

        {/* Celebration Message */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3 }}
          className="text-center"
        >
          <motion.p
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-gray-400 text-lg"
          >
            🎊 Congratulations to our champion! 🎊
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
