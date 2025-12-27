'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import { formatTimer } from '@/types/multiplayer';

interface TurnTimerProps {
  duration: number;
  turnStartedAt: number;
  isMyTurn: boolean;
  isPaused?: boolean;
  onTimeout?: () => void;
}

export default function TurnTimer({
  duration,
  turnStartedAt,
  isMyTurn,
  isPaused = false,
  onTimeout,
}: TurnTimerProps) {
  const { colors } = useTheme();
  const [timeLeft, setTimeLeft] = useState(duration);
  const timeoutCalledRef = useRef(false);

  useEffect(() => {
    timeoutCalledRef.current = false;

    const calculateTimeLeft = () => {
      const elapsed = Math.floor((Date.now() - turnStartedAt) / 1000);
      const remaining = Math.max(0, duration - elapsed);
      return remaining;
    };

    setTimeLeft(calculateTimeLeft());

    if (isPaused) return;

    const interval = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);

      if (remaining === 0 && !timeoutCalledRef.current) {
        timeoutCalledRef.current = true;
        onTimeout?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [duration, turnStartedAt, onTimeout, isPaused]);

  const progress = (timeLeft / duration) * 100;

  const getColor = () => {
    if (timeLeft <= 10) return colors.error;
    if (timeLeft <= 30) return colors.warning;
    return colors.primary;
  };

  const timerColor = getColor();
  const isUrgent = timeLeft <= 10;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mt-3"
    >
      {/* Time display */}
      <motion.div
        animate={isUrgent ? {
          scale: [1, 1.05, 1],
          x: [0, -2, 2, -2, 0],
        } : {}}
        transition={{ duration: 0.5, repeat: isUrgent ? Infinity : 0 }}
        className="text-3xl font-mono font-bold text-center"
        style={{ color: timerColor }}
      >
        {formatTimer(timeLeft)}
      </motion.div>

      {/* Progress bar */}
      <div
        className="w-36 h-2 rounded-full overflow-hidden mx-auto mt-2"
        style={{ backgroundColor: colors.cardBg }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: timerColor }}
          initial={{ width: '100%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'linear' }}
        />
      </div>

      {/* Status text */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-xs text-center mt-2"
        style={{ color: colors.textMuted }}
      >
        {isPaused ? (
          <motion.span
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            Processing...
          </motion.span>
        ) : isMyTurn ? (
          'Your turn'
        ) : (
          "Opponent's turn"
        )}
      </motion.p>
    </motion.div>
  );
}
