'use client';

import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import { type GamePlayer } from '@/types/multiplayer';

interface PlayerCardProps {
  player: GamePlayer;
  isCurrentTurn: boolean;
  guessCount: number;
  isYou: boolean;
}

export default function PlayerCard({
  player,
  isCurrentTurn,
  guessCount,
  isYou,
}: PlayerCardProps) {
  const { colors } = useTheme();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      className="flex flex-col items-center p-4 rounded-xl backdrop-blur-md transition-all"
      style={{
        backgroundColor: isCurrentTurn ? `${colors.primary}15` : colors.cardBg,
        border: `1px solid ${isCurrentTurn ? colors.primary : colors.cardBorder}`,
        boxShadow: isCurrentTurn ? `0 0 20px ${colors.accentGlow}` : undefined,
      }}
    >
      {/* Avatar */}
      <motion.div
        animate={isCurrentTurn ? {
          scale: [1, 1.05, 1],
        } : {}}
        transition={{ duration: 2, repeat: Infinity }}
        className="relative"
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg"
          style={{
            backgroundColor: player.avatarColor,
            boxShadow: isCurrentTurn ? `0 0 15px ${player.avatarColor}` : undefined,
          }}
        >
          {player.nickname[0].toUpperCase()}
        </div>
        {isCurrentTurn && (
          <motion.div
            className="absolute -inset-1 rounded-full"
            style={{ border: `2px solid ${colors.primary}` }}
            animate={{ scale: [1, 1.1, 1], opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </motion.div>

      {/* Name & Badge */}
      <div className="mt-3 flex items-center gap-2">
        <span
          className="font-semibold text-sm truncate max-w-[80px]"
          style={{ color: colors.textPrimary }}
        >
          {player.nickname}
        </span>
        {isYou && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{
              backgroundColor: `${colors.primary}30`,
              color: colors.primary,
            }}
          >
            You
          </motion.span>
        )}
      </div>

      {/* Guess count */}
      <p
        className="text-xs mt-1"
        style={{ color: colors.textMuted }}
      >
        {guessCount} {guessCount === 1 ? 'guess' : 'guesses'}
      </p>

      {/* Turn indicator */}
      {isCurrentTurn && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2"
        >
          <motion.span
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-xs font-medium"
            style={{ color: colors.primary }}
          >
            Playing...
          </motion.span>
        </motion.div>
      )}
    </motion.div>
  );
}
