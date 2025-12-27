'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import { type GamePlayer, type GameEndReason } from '@/types/multiplayer';
import AnimatedButton from '@/components/ui/AnimatedButton';
import { Trophy, Frown, LogOut, Flag } from 'lucide-react';

interface GameResultProps {
  isOpen: boolean;
  isWinner: boolean;
  winner: GamePlayer | null;
  secretWord: string;
  myGuessCount: number;
  opponentGuessCount: number;
  opponentName?: string;
  endReason?: GameEndReason;
  didIForfeit?: boolean;
  onExit: () => void;
}

// Confetti particle component
function ConfettiParticle({ delay, color }: { delay: number; color: string }) {
  const randomX = Math.random() * 100 - 50;
  const randomRotate = Math.random() * 360;

  return (
    <motion.div
      className="absolute w-3 h-3 rounded-sm"
      style={{ backgroundColor: color }}
      initial={{ y: -20, x: 0, rotate: 0, opacity: 1 }}
      animate={{
        y: 400,
        x: randomX,
        rotate: randomRotate,
        opacity: [1, 1, 0],
      }}
      transition={{
        duration: 2,
        delay,
        ease: 'easeOut',
      }}
    />
  );
}

export default function GameResult({
  isOpen,
  isWinner,
  winner,
  secretWord,
  myGuessCount,
  opponentGuessCount,
  opponentName,
  endReason,
  didIForfeit,
  onExit,
}: GameResultProps) {
  const { colors } = useTheme();

  const confettiColors = [colors.primary, colors.accent, colors.warning, '#ec4899', '#8b5cf6'];

  // Determine the result message based on the scenario
  const getResultContent = () => {
    // Player forfeited (gave up)
    if (didIForfeit) {
      return {
        icon: <Flag className="w-20 h-20 mx-auto" style={{ color: colors.warning }} />,
        title: 'You Gave Up',
        titleColor: colors.warning,
        subtitle: 'Better luck next time!',
        showConfetti: false,
        iconAnimation: { rotate: [0, -10, 10, -10, 0] },
      };
    }

    // Won because opponent forfeited
    if (isWinner && endReason === 'FORFEIT') {
      return {
        icon: <Trophy className="w-20 h-20 mx-auto" style={{ color: colors.warning }} />,
        title: 'You Win!',
        titleColor: colors.primary,
        subtitle: `${opponentName || 'Your opponent'} gave up!`,
        showConfetti: true,
        iconAnimation: { y: [0, -10, 0] },
      };
    }

    // Won by finding the word
    if (isWinner) {
      return {
        icon: <Trophy className="w-20 h-20 mx-auto" style={{ color: colors.warning }} />,
        title: 'You Win!',
        titleColor: colors.primary,
        subtitle: 'Congratulations! You found the word!',
        showConfetti: true,
        iconAnimation: { y: [0, -10, 0] },
      };
    }

    // Lost because opponent found the word
    if (endReason === 'WORD_FOUND' || !endReason) {
      return {
        icon: <Frown className="w-20 h-20 mx-auto" style={{ color: colors.error }} />,
        title: 'You Lost',
        titleColor: colors.error,
        subtitle: `${winner?.nickname || 'Your opponent'} found the word first!`,
        showConfetti: false,
        iconAnimation: { x: [-2, 2, -2, 2, 0] },
      };
    }

    // Lost because of timeout
    if (endReason === 'TIMEOUT') {
      return {
        icon: <Frown className="w-20 h-20 mx-auto" style={{ color: colors.error }} />,
        title: 'Time Out!',
        titleColor: colors.error,
        subtitle: 'You ran out of time!',
        showConfetti: false,
        iconAnimation: { x: [-2, 2, -2, 2, 0] },
      };
    }

    // Default lost state
    return {
      icon: <Frown className="w-20 h-20 mx-auto" style={{ color: colors.error }} />,
      title: 'You Lost',
      titleColor: colors.error,
      subtitle: `${winner?.nickname || 'Your opponent'} won the game!`,
      showConfetti: false,
      iconAnimation: { x: [-2, 2, -2, 2, 0] },
    };
  };

  const result = getResultContent();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
        >
          {/* Confetti for winner */}
          {result.showConfetti && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {Array.from({ length: 30 }).map((_, i) => (
                <div key={i} className="absolute top-0" style={{ left: `${(i / 30) * 100}%` }}>
                  <ConfettiParticle
                    delay={i * 0.05}
                    color={confettiColors[i % confettiColors.length]}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="relative w-full max-w-md rounded-2xl backdrop-blur-xl p-8 overflow-hidden"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              border: `1px solid ${colors.cardBorder}`,
              boxShadow: `0 0 40px ${result.showConfetti ? colors.accentGlow : 'rgba(0,0,0,0.5)'}`,
            }}
          >
            {/* Glow effect */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                background: `radial-gradient(circle at center, ${result.titleColor} 0%, transparent 70%)`,
              }}
            />

            <div className="relative z-10 text-center space-y-6">
              {/* Result Icon & Text */}
              <motion.div
                initial={{ scale: 0, rotate: didIForfeit ? 0 : -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
              >
                <motion.div
                  animate={result.iconAnimation}
                  transition={{
                    duration: didIForfeit ? 0.5 : 2,
                    repeat: didIForfeit ? 0 : Infinity,
                    delay: didIForfeit ? 0.5 : 0,
                  }}
                  className="text-7xl mb-4"
                >
                  {result.icon}
                </motion.div>
                <h2
                  className="text-4xl font-black"
                  style={{ color: result.titleColor }}
                >
                  {result.title}
                </h2>
                <p className="mt-2" style={{ color: colors.textSecondary }}>
                  {result.subtitle}
                </p>
              </motion.div>

              {/* Secret Word */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <p className="text-sm mb-2" style={{ color: colors.textMuted }}>
                  The secret word was:
                </p>
                <div
                  className="inline-block px-6 py-3 rounded-xl"
                  style={{
                    backgroundColor: colors.cardBg,
                    border: `1px solid ${colors.cardBorder}`,
                  }}
                >
                  <span
                    className="text-2xl font-black uppercase tracking-wider"
                    style={{ color: colors.textPrimary }}
                  >
                    {secretWord}
                  </span>
                </div>
              </motion.div>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="grid grid-cols-2 gap-4"
              >
                <div
                  className="p-4 rounded-xl"
                  style={{ backgroundColor: colors.cardBg }}
                >
                  <p className="text-sm" style={{ color: colors.textMuted }}>
                    Your guesses
                  </p>
                  <p
                    className="text-3xl font-bold"
                    style={{ color: colors.textPrimary }}
                  >
                    {myGuessCount}
                  </p>
                </div>
                <div
                  className="p-4 rounded-xl"
                  style={{ backgroundColor: colors.cardBg }}
                >
                  <p className="text-sm" style={{ color: colors.textMuted }}>
                    {opponentName || 'Opponent'}
                  </p>
                  <p
                    className="text-3xl font-bold"
                    style={{ color: colors.textPrimary }}
                  >
                    {opponentGuessCount}
                  </p>
                </div>
              </motion.div>

              {/* Exit Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <AnimatedButton
                  variant="primary"
                  size="lg"
                  glow
                  fullWidth
                  onClick={onExit}
                  leftIcon={<LogOut className="w-5 h-5" />}
                >
                  Exit Game
                </AnimatedButton>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
