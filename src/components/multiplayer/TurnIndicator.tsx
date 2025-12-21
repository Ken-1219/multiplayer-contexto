'use client';

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
  return (
    <div
      className={`px-4 py-2 rounded-lg transition-all ${
        isMyTurn
          ? 'bg-emerald-500/20 border border-emerald-500/50 animate-pulse'
          : 'bg-slate-700/50 border border-slate-600'
      }`}
    >
      <p
        className={`text-center font-medium ${
          isMyTurn ? 'text-emerald-400' : 'text-slate-400'
        }`}
      >
        {currentPlayerName} Turn
      </p>
      <p className="text-center text-xs text-slate-500">
        Turn #{turnNumber}
      </p>
    </div>
  );
}
