'use client';

import { useState, useEffect, useRef } from 'react';
import { formatTimer } from '@/types/multiplayer';

interface TurnTimerProps {
  duration: number; // Total seconds for the turn
  turnStartedAt: number; // Timestamp when turn started
  isMyTurn: boolean;
  isPaused?: boolean; // Pause timer while processing
  onTimeout?: () => void;
}

export default function TurnTimer({
  duration,
  turnStartedAt,
  isMyTurn,
  isPaused = false,
  onTimeout,
}: TurnTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const timeoutCalledRef = useRef(false);

  useEffect(() => {
    // Reset timeout flag when turn changes
    timeoutCalledRef.current = false;

    const calculateTimeLeft = () => {
      const elapsed = Math.floor((Date.now() - turnStartedAt) / 1000);
      const remaining = Math.max(0, duration - elapsed);
      return remaining;
    };

    setTimeLeft(calculateTimeLeft());

    // Don't run interval if paused
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

  // Calculate progress percentage
  const progress = (timeLeft / duration) * 100;

  // Determine color based on time left
  const getColor = () => {
    if (timeLeft <= 10) return 'text-red-400';
    if (timeLeft <= 30) return 'text-yellow-400';
    return 'text-emerald-400';
  };

  const getProgressColor = () => {
    if (timeLeft <= 10) return 'bg-red-500';
    if (timeLeft <= 30) return 'bg-yellow-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="mt-2">
      {/* Time display */}
      <div
        className={`text-2xl font-mono font-bold text-center ${getColor()} ${
          timeLeft <= 10 ? 'animate-pulse' : ''
        }`}
      >
        {formatTimer(timeLeft)}
      </div>

      {/* Progress bar */}
      <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden mx-auto mt-1">
        <div
          className={`h-full transition-all duration-1000 ease-linear ${getProgressColor()}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Turn indicator text */}
      <p className="text-xs text-slate-500 text-center mt-1">
        {isPaused ? 'Processing...' : isMyTurn ? 'Your turn' : "Opponent's turn"}
      </p>
    </div>
  );
}
