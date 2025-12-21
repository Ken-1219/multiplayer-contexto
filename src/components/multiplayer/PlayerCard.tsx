'use client';

import { Chip } from '@nextui-org/react';
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
  return (
    <div
      className={`flex flex-col items-center p-3 rounded-lg transition-all ${
        isCurrentTurn
          ? 'bg-emerald-500/10 border border-emerald-500/30 scale-105'
          : 'bg-slate-800/50 border border-slate-700'
      }`}
    >
      {/* Avatar */}
      <div
        className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
          isCurrentTurn ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-slate-900' : ''
        }`}
        style={{ backgroundColor: player.avatarColor }}
      >
        {player.nickname[0].toUpperCase()}
      </div>

      {/* Name */}
      <div className="mt-2 flex items-center gap-1">
        <span className="text-white font-medium text-sm truncate max-w-[80px]">
          {player.nickname}
        </span>
        {isYou && (
          <Chip size="sm" color="primary" variant="flat" className="text-xs">
            You
          </Chip>
        )}
      </div>

      {/* Guess count */}
      <p className="text-slate-400 text-xs mt-1">
        {guessCount} {guessCount === 1 ? 'guess' : 'guesses'}
      </p>

      {/* Turn indicator */}
      {isCurrentTurn && (
        <div className="mt-1">
          <span className="text-emerald-400 text-xs animate-pulse">
            Playing...
          </span>
        </div>
      )}
    </div>
  );
}
