'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';

interface TurnIndicatorProps {
  isMyTurn: boolean;
  currentPlayerName: string;
  turnNumber: number;
}

export default function TurnIndicator({
  isMyTurn,
  currentPlayerName,
  turnNumber,
}: TurnIndicatorProps) {
  const { colors } = useTheme();

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-5 py-3 rounded-xl backdrop-blur-md transition-all"
      style={{
        backgroundColor: isMyTurn ? `${colors.primary}20` : colors.cardBg,
        border: `1px solid ${isMyTurn ? `${colors.primary}50` : colors.cardBorder}`,
        boxShadow: isMyTurn ? `0 0 15px ${colors.accentGlow}` : undefined,
      }}
    >
      <AnimatePresence mode="wait">
        <motion.p
          key={currentPlayerName}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 5 }}
          className="text-center font-semibold"
          style={{ color: isMyTurn ? colors.primary : colors.textSecondary }}
        >
          {isMyTurn && (
            <motion.span
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
              className="inline-block mr-1"
            >
              ⚡
            </motion.span>
          )}
          {currentPlayerName} Turn
        </motion.p>
      </AnimatePresence>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-center text-xs mt-1"
        style={{ color: colors.textMuted }}
      >
        Turn #{turnNumber}
      </motion.p>
    </motion.div>
  );
}
