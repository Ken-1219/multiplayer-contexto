'use client';

import { useState, useEffect } from 'react';
import { Card, CardBody, Button, Select, SelectItem, Switch, Spinner } from '@nextui-org/react';
import { useRouter } from 'next/navigation';
import { useMultiplayer } from '@/contexts/MultiplayerContext';
import { TURN_DURATION_OPTIONS } from '@/types/multiplayer';

export default function CreateGamePage() {
  const router = useRouter();
  const { player, isLoading, error, createGame, clearError, gameState } = useMultiplayer();

  const [turnDuration, setTurnDuration] = useState<number>(60);
  const [isPublic, setIsPublic] = useState(true);
  const [isReady, setIsReady] = useState(false);

  // Redirect if no player
  useEffect(() => {
    if (!player) {
      router.push('/multiplayer');
    } else {
      setIsReady(true);
    }
  }, [player, router]);

  // Redirect if already in a game
  useEffect(() => {
    if (gameState?.game?.gameId) {
      router.push(`/multiplayer/lobby/${gameState.game.roomCode}`);
    }
  }, [gameState?.game?.gameId, gameState?.game?.roomCode, router]);

  // Show loading while checking player status
  if (!isReady || !player) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-center p-4">
        <Spinner size="lg" />
        <p className="text-slate-400 mt-4">Loading...</p>
      </div>
    );
  }

  const handleCreateGame = async () => {
    clearError();

    try {
      const roomCode = await createGame({
        gameMode: 'COMPETITIVE',
        maxPlayers: 2,
        turnDuration,
        isPublic,
      });

      // Get the game ID from context after creation
      // The context will have been updated by createGame
      // We need to redirect to the lobby
      if (roomCode) {
        // Small delay to ensure state is updated
        setTimeout(() => {
          router.push(`/multiplayer/lobby/${roomCode}`);
        }, 100);
      }
    } catch {
      // Error handled by context
    }
  };

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
        <h1 className="text-3xl font-bold text-white mb-2">Create Game</h1>
        <p className="text-slate-400">Configure your game settings</p>
      </div>

      <Card className="w-full max-w-md bg-slate-800/50 border border-slate-700">
        <CardBody className="p-6 space-y-6">
          {/* Game Mode (Fixed for now) */}
          <div>
            <label className="text-sm text-slate-400 mb-2 block">Game Mode</label>
            <div className="bg-slate-700/50 p-4 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-medium">Competitive 1v1</p>
                  <p className="text-slate-400 text-sm">Alternating turns, first to find wins</p>
                </div>
              </div>
            </div>
          </div>

          {/* Turn Duration */}
          <div>
            <label className="text-sm text-slate-400 mb-2 block">Turn Duration</label>
            <Select
              aria-label="Turn Duration"
              placeholder="Select duration"
              selectedKeys={new Set([turnDuration.toString()])}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0];
                if (selected) setTurnDuration(Number(selected));
              }}
              className="w-full"
              variant="bordered"
              classNames={{
                trigger: 'bg-slate-700/50 border-slate-600 hover:bg-slate-700 data-[hover=true]:bg-slate-700',
                value: 'text-white',
                listboxWrapper: 'bg-slate-800',
                popoverContent: 'bg-slate-800 border border-slate-700',
              }}
            >
              {TURN_DURATION_OPTIONS.map((duration) => (
                <SelectItem
                  key={duration.toString()}
                  textValue={`${duration} seconds`}
                  className="text-white data-[hover=true]:bg-slate-700 data-[selected=true]:bg-slate-600"
                >
                  {duration} seconds
                </SelectItem>
              ))}
            </Select>
            <p className="text-xs text-slate-500 mt-1">
              Time limit for each turn
            </p>
          </div>

          {/* Public/Private */}
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-white font-medium">Public Game</p>
              <p className="text-slate-400 text-sm">Allow anyone to find and join</p>
            </div>
            <Switch
              isSelected={isPublic}
              onValueChange={setIsPublic}
              color="primary"
              size="lg"
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Create button */}
          <Button
            color="primary"
            size="lg"
            className="w-full"
            onPress={handleCreateGame}
            isLoading={isLoading}
          >
            Create Room
          </Button>
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
