'use client';

import { useEffect, useState } from 'react';
import { Card, CardBody, Button, Spinner, Chip } from '@nextui-org/react';
import { useRouter, useParams } from 'next/navigation';
import { useMultiplayer } from '@/contexts/MultiplayerContext';

export default function WaitingRoomPage() {
  const router = useRouter();
  const params = useParams();
  const roomCode = params.roomCode as string;

  const {
    player,
    gameState,
    isLoading,
    error,
    setReady,
    startGame,
    leaveGame,
    joinGame,
    clearError,
  } = useMultiplayer();

  const [copied, setCopied] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Redirect if no player
  useEffect(() => {
    if (!player) {
      router.push('/multiplayer');
    } else {
      setIsReady(true);
    }
  }, [player, router]);

  // If no game state, try to join by room code
  useEffect(() => {
    if (!gameState?.game?.gameId && player && roomCode && isReady) {
      joinGame(roomCode).catch(() => {
        // Error handled by context
      });
    }
  }, [gameState?.game?.gameId, player, roomCode, joinGame, isReady]);

  // Redirect if game starts
  useEffect(() => {
    if (gameState?.game?.status === 'ACTIVE') {
      router.push(`/multiplayer/game/${gameState.game.gameId}`);
    }
  }, [gameState?.game?.status, gameState?.game?.gameId, router]);

  // Show loading while checking player status
  if (!isReady || !player) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-center p-4">
        <Spinner size="lg" />
        <p className="text-slate-400 mt-4">Loading...</p>
      </div>
    );
  }

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = roomCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLeaveGame = async () => {
    setLeaving(true);
    try {
      await leaveGame();
      router.push('/multiplayer');
    } catch {
      setLeaving(false);
    }
  };

  const handleToggleReady = async () => {
    const currentPlayer = gameState?.players?.find(p => p.playerId === player.playerId);
    if (currentPlayer) {
      await setReady(!currentPlayer.isReady);
    }
  };

  const handleStartGame = async () => {
    clearError();
    try {
      await startGame();
    } catch {
      // Error handled by context
    }
  };

  // Loading state while joining
  if (!gameState?.game) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-center p-4">
        <Spinner size="lg" />
        <p className="text-slate-400 mt-4">Joining game...</p>
        {error && (
          <div className="mt-4 text-red-400 text-sm bg-red-400/10 p-3 rounded-lg">
            {error}
            <Button
              variant="light"
              size="sm"
              className="ml-2 text-red-400"
              onPress={() => router.push('/multiplayer')}
            >
              Go Back
            </Button>
          </div>
        )}
      </div>
    );
  }

  const game = gameState.game;
  const players = gameState.players || [];
  const currentPlayer = players.find(p => p.playerId === player.playerId);
  // Determine host by comparing with game.hostPlayerId
  const isHost = player.playerId === game.hostPlayerId;
  // All connected, non-host players must be ready. Host is always considered ready.
  // Disconnected players don't block game start
  const connectedPlayers = players.filter(p => p.isConnected !== false);
  const allReady = connectedPlayers.length >= 2 && connectedPlayers.every(p => p.isReady || p.isHost || p.playerId === game.hostPlayerId);
  const canStart = isHost && allReady && connectedPlayers.length >= 2;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-center p-4">
      {/* Room Code Header */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        <Button
          variant="light"
          className="text-slate-400"
          onPress={handleLeaveGame}
          isLoading={leaving}
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Leave
        </Button>

        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-sm">Room:</span>
          <Button
            variant="flat"
            className="bg-slate-700 text-white font-mono text-lg tracking-wider"
            onPress={handleCopyCode}
          >
            {roomCode}
            {copied ? (
              <svg className="w-4 h-4 ml-2 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </Button>
        </div>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Waiting Room</h1>
        <p className="text-slate-400">
          {players.length}/{game.maxPlayers} players
        </p>
      </div>

      {/* Players List */}
      <Card className="w-full max-w-md bg-slate-800/50 border border-slate-700 mb-6">
        <CardBody className="p-4 space-y-3">
          {players.map((p) => (
            <div
              key={p.playerId}
              className={`flex items-center justify-between p-3 rounded-lg ${
                p.playerId === player.playerId
                  ? 'bg-blue-500/10 border border-blue-500/30'
                  : 'bg-slate-700/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: p.avatarColor }}
                >
                  {p.nickname[0].toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{p.nickname}</span>
                    {p.playerId === game.hostPlayerId && (
                      <Chip size="sm" color="warning" variant="flat">Host</Chip>
                    )}
                    {p.playerId === player.playerId && (
                      <Chip size="sm" color="primary" variant="flat">You</Chip>
                    )}
                  </div>
                </div>
              </div>

              {!p.isConnected ? (
                <Chip color="danger" variant="flat">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  Offline
                </Chip>
              ) : p.isReady || p.playerId === game.hostPlayerId ? (
                <Chip color="success" variant="flat">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Ready
                </Chip>
              ) : (
                <Chip color="default" variant="flat">
                  Waiting...
                </Chip>
              )}
            </div>
          ))}

          {/* Empty slots */}
          {Array.from({ length: game.maxPlayers - players.length }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="flex items-center justify-center p-3 rounded-lg bg-slate-700/20 border border-dashed border-slate-600"
            >
              <span className="text-slate-500">Waiting for player...</span>
            </div>
          ))}
        </CardBody>
      </Card>

      {/* Error message */}
      {error && (
        <div className="w-full max-w-md mb-4 text-red-400 text-sm bg-red-400/10 p-3 rounded-lg text-center">
          {error}
        </div>
      )}

      {/* Action Buttons */}
      <div className="w-full max-w-md space-y-3">
        {isHost ? (
          <Button
            color="primary"
            size="lg"
            className="w-full"
            onPress={handleStartGame}
            isLoading={isLoading}
            isDisabled={!canStart}
          >
            {!canStart && players.length < 2
              ? 'Waiting for players...'
              : !canStart
              ? 'Waiting for all players to be ready...'
              : 'Start Game'}
          </Button>
        ) : (
          <Button
            color={currentPlayer?.isReady ? 'default' : 'success'}
            size="lg"
            className="w-full"
            onPress={handleToggleReady}
            isLoading={isLoading}
          >
            {currentPlayer?.isReady ? 'Cancel Ready' : "I'm Ready!"}
          </Button>
        )}
      </div>

      {/* Game Settings Info */}
      <div className="mt-6 text-center text-slate-500 text-sm">
        <p>Game Mode: Competitive 1v1</p>
        <p>Turn Duration: {game.turnDuration} seconds</p>
      </div>
    </div>
  );
}
