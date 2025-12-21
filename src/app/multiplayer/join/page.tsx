'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardBody, Button, Spinner } from '@nextui-org/react';
import { useRouter } from 'next/navigation';
import { useMultiplayer } from '@/contexts/MultiplayerContext';

export default function JoinGamePage() {
  const router = useRouter();
  const { player, isLoading, error, joinGame, clearError, gameState } = useMultiplayer();

  const [roomCode, setRoomCode] = useState(['', '', '', '', '', '']);
  const [isReady, setIsReady] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Redirect if no player
  useEffect(() => {
    if (!player) {
      router.push('/multiplayer');
    } else {
      setIsReady(true);
    }
  }, [player, router]);

  // Redirect if joined a game
  useEffect(() => {
    if (gameState?.game?.gameId) {
      router.push(`/multiplayer/lobby/${gameState.game.roomCode}`);
    }
  }, [gameState?.game?.gameId, gameState?.game?.roomCode, router]);

  // Focus first input when ready
  useEffect(() => {
    if (isReady) {
      inputRefs.current[0]?.focus();
    }
  }, [isReady]);

  // Show loading while checking player status
  if (!isReady || !player) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-center p-4">
        <Spinner size="lg" />
        <p className="text-slate-400 mt-4">Loading...</p>
      </div>
    );
  }

  const handleInputChange = (index: number, value: string) => {
    // Only allow alphanumeric characters
    const char = value.toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (char.length > 1) {
      // Handle paste
      const chars = char.split('').slice(0, 6);
      const newCode = [...roomCode];
      chars.forEach((c, i) => {
        if (index + i < 6) {
          newCode[index + i] = c;
        }
      });
      setRoomCode(newCode);

      // Focus appropriate input
      const nextIndex = Math.min(index + chars.length, 5);
      inputRefs.current[nextIndex]?.focus();
    } else {
      const newCode = [...roomCode];
      newCode[index] = char;
      setRoomCode(newCode);

      // Auto-advance to next input
      if (char && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !roomCode[index] && index > 0) {
      // Move to previous input on backspace if current is empty
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleJoinGame = async () => {
    const code = roomCode.join('');

    if (code.length !== 6) {
      return;
    }

    clearError();

    try {
      await joinGame(code);
      // Redirect will happen automatically due to gameState change
    } catch {
      // Error handled by context
    }
  };

  const isCodeComplete = roomCode.every(c => c !== '');

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-center p-4">
      {/* Back button */}
      <Button
        variant="light"
        className="absolute top-4 left-4 text-slate-400"
        onPress={() => router.push('/multiplayer')}
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </Button>

      {/* Player info */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-full"
          style={{ backgroundColor: player.avatarColor }}
        />
        <span className="text-white font-medium">{player.nickname}</span>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Join Game</h1>
        <p className="text-slate-400">Enter the 6-character room code</p>
      </div>

      <Card className="w-full max-w-md bg-slate-800/50 border border-slate-700">
        <CardBody className="p-6 space-y-6">
          {/* Room Code Input */}
          <div>
            <label className="text-sm text-slate-400 mb-3 block text-center">Room Code</label>
            <div className="flex justify-center gap-2">
              {roomCode.map((char, index) => (
                <input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el; }}
                  type="text"
                  maxLength={6}
                  value={char}
                  onChange={(e) => handleInputChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-14 text-center text-2xl font-bold bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 uppercase"
                />
              ))}
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg text-center">
              {error}
            </div>
          )}

          {/* Join button */}
          <Button
            color="primary"
            size="lg"
            className="w-full"
            onPress={handleJoinGame}
            isLoading={isLoading}
            isDisabled={!isCodeComplete}
          >
            Join Game
          </Button>

          {/* Help text */}
          <p className="text-xs text-slate-500 text-center">
            Ask your friend for the room code to join their game
          </p>
        </CardBody>
      </Card>

      {isLoading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      )}
    </div>
  );
}
