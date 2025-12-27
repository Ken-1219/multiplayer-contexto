'use client';

import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

interface GuessItemProps {
  word: string;
  distance: number;
  isTopGuess?: boolean;
  isCorrect?: boolean;
  index: number;
  maxDistance?: number;
}

export default function GuessItem({
  word,
  distance,
  isTopGuess = false,
  isCorrect = false,
  index,
  maxDistance = 50000,
}: GuessItemProps) {
  const { colors } = useTheme();

  // Calculate progress percentage for visual bar
  // For correct answers (distance === 1 or isCorrect), fill 100%
  const progressPercentage = (isCorrect || distance === 1)
    ? 100
    : Math.max(5, Math.min(95, ((maxDistance - distance) / maxDistance) * 100));

  // Determine colors based on distance
  const getDistanceColors = () => {
    if (isCorrect || distance === 1) {
      return {
        bg: `linear-gradient(135deg, ${colors.success}40, ${colors.success}20)`,
        border: colors.success,
        text: colors.textPrimary,
        rank: colors.success,
        progress: colors.success,
      };
    }
    if (distance <= 100) {
      return {
        bg: `linear-gradient(135deg, ${colors.primary}30, ${colors.primary}15)`,
        border: colors.primary,
        text: colors.textPrimary,
        rank: colors.primary,
        progress: colors.primary,
      };
    }
    if (distance <= 500) {
      return {
        bg: `linear-gradient(135deg, ${colors.primary}20, ${colors.primary}10)`,
        border: `${colors.primary}80`,
        text: colors.textSecondary,
        rank: colors.accent,
        progress: colors.accent,
      };
    }
    if (distance <= 1000) {
      return {
        bg: `linear-gradient(135deg, ${colors.primary}15, transparent)`,
        border: `${colors.primary}50`,
        text: colors.textSecondary,
        rank: colors.textMuted,
        progress: colors.textMuted,
      };
    }
    if (distance <= 3000) {
      return {
        bg: `linear-gradient(135deg, ${colors.warning}15, transparent)`,
        border: `${colors.warning}30`,
        text: colors.textSecondary,
        rank: colors.warning,
        progress: colors.warning,
      };
    }
    if (distance <= 10000) {
      return {
        bg: 'rgba(251, 146, 60, 0.1)',
        border: 'rgba(251, 146, 60, 0.3)',
        text: colors.textSecondary,
        rank: '#fb923c',
        progress: '#fb923c',
      };
    }
    return {
      bg: `rgba(239, 68, 68, 0.08)`,
      border: `rgba(239, 68, 68, 0.2)`,
      text: colors.textMuted,
      rank: '#ef4444',
      progress: '#ef4444',
    };
  };

  const distanceColors = getDistanceColors();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      transition={{
        duration: 0.3,
        delay: index * 0.02,
        layout: { duration: 0.3 },
      }}
      className={cn(
        'relative overflow-hidden rounded-lg backdrop-blur-sm',
        isTopGuess && 'ring-2 shadow-lg'
      )}
      style={{
        background: distanceColors.bg,
        border: `1px solid ${distanceColors.border}`,
        ...(isTopGuess && {
          ringColor: colors.primary,
          boxShadow: `0 4px 20px ${colors.accentGlow}`,
        }),
      }}
      whileHover={{ scale: 1.02, x: 4 }}
    >
      {/* Progress bar for close guesses */}
      {distance <= 1000 && (
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progressPercentage}%` }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="absolute left-0 top-0 bottom-0 opacity-30"
          style={{ backgroundColor: distanceColors.progress }}
        />
      )}

      {/* Content */}
      <div className="relative z-10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isTopGuess && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: colors.primary }}
            >
              <motion.div
                animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-full h-full rounded-full"
                style={{ backgroundColor: colors.primary }}
              />
            </motion.div>
          )}
          <span
            className="text-base font-semibold"
            style={{ color: distanceColors.text }}
          >
            {word}
          </span>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="px-3 py-1.5 rounded-md backdrop-blur-sm"
          style={{
            backgroundColor: colors.cardBg,
            border: `1px solid ${colors.cardBorder}`,
          }}
        >
          <span
            className="text-sm font-bold font-mono"
            style={{ color: distanceColors.rank }}
          >
            #{isCorrect ? 1 : distance}
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}
