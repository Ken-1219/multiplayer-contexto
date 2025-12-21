'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { toast } from 'sonner';
import {
  type Player,
  type GameState,
  type GamePlayer,
  type Guess,
  type GuessResult,
  type CreateGameInput,
  type MultiplayerContextType,
  type Game,
} from '@/types/multiplayer';

/**
 * Multiplayer Context
 *
 * Provides global state management for multiplayer functionality.
 * Handles player session, game state, and real-time updates via polling.
 */

const MultiplayerContext = createContext<MultiplayerContextType | null>(null);

// Polling interval in ms
const POLL_INTERVAL = 2000;

export function MultiplayerProvider({ children }: { children: React.ReactNode }) {
  // Player state
  const [player, setPlayer] = useState<Player | null>(null);

  // Game state
  const [gameState, setGameState] = useState<GameState | null>(null);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Polling ref
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load player from cookie on mount
  useEffect(() => {
    const loadPlayer = async () => {
      try {
        const res = await fetch('/api/multiplayer/player/me');
        const data = await res.json();
        if (data.success && data.data) {
          setPlayer(data.data);
        }
      } catch (e) {
        console.error('Failed to load player:', e);
      }
    };
    loadPlayer();
  }, []);

  // Start/stop polling based on game state
  useEffect(() => {
    if (gameState?.game?.gameId && ['WAITING', 'ACTIVE'].includes(gameState.game.status)) {
      startPolling(gameState.game.gameId);
    } else {
      stopPolling();
    }

    return () => stopPolling();
  }, [gameState?.game?.gameId, gameState?.game?.status]);

  // Disconnect detection - call leave API when browser closes
  useEffect(() => {
    if (!gameState?.game?.gameId || gameState.game.status === 'COMPLETED') return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Send leave request via sendBeacon (works even when page is closing)
      const data = JSON.stringify({ gameId: gameState.game.gameId });
      navigator.sendBeacon('/api/multiplayer/game/leave', data);

      // Show confirmation dialog
      e.preventDefault();
      e.returnValue = 'You are in an active game. Leaving will forfeit the match.';
      return e.returnValue;
    };

    const handleVisibilityChange = () => {
      // Optional: handle tab switching/minimizing
      if (document.visibilityState === 'hidden' && gameState?.game?.status === 'ACTIVE') {
        // Could implement reconnection logic here
        console.log('[Multiplayer] Tab hidden while in game');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [gameState?.game?.gameId, gameState?.game?.status]);

  const startPolling = useCallback((gameId: string) => {
    if (pollIntervalRef.current) return;

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/multiplayer/game/state?gameId=${gameId}`);
        const data = await res.json();

        if (data.success && data.data) {
          setGameState((prev) => {
            // Only update if something changed
            const newGame = data.data.game as Game;
            const newPlayers = data.data.players as GamePlayer[];
            const newGuesses = data.data.guesses as Guess[];

            // Detect important changes and show toasts
            if (prev) {
              // Player joined
              if (newPlayers.length > (prev.players?.length || 0)) {
                const newPlayer = newPlayers.find(
                  np => !prev.players?.some(pp => pp.playerId === np.playerId)
                );
                if (newPlayer) {
                  toast.info(`${newPlayer.nickname} joined the game!`);
                }
              }

              // Game started
              if (prev.game?.status === 'WAITING' && newGame.status === 'ACTIVE') {
                toast.success('Game started!');
              }

              // Opponent guessed (new guess from opponent)
              if (newGuesses.length > (prev.guesses?.length || 0)) {
                const latestGuess = newGuesses[newGuesses.length - 1];
                const currentPlayerId = document.cookie
                  .split('; ')
                  .find(row => row.startsWith('playerId='))
                  ?.split('=')[1];

                if (latestGuess && latestGuess.playerId !== currentPlayerId) {
                  if (latestGuess.isCorrect) {
                    toast.error(`${latestGuess.playerNickname} found the word!`);
                  }
                }
              }

              // Game ended
              if (prev.game?.status === 'ACTIVE' && newGame.status === 'COMPLETED') {
                if (!newGame.winnerId) {
                  toast.info('Game ended');
                }
              }

              // Turn changed to you
              if (
                newGame.status === 'ACTIVE' &&
                prev.game?.currentTurnPlayerId !== newGame.currentTurnPlayerId
              ) {
                const currentPlayerId = document.cookie
                  .split('; ')
                  .find(row => row.startsWith('playerId='))
                  ?.split('=')[1];

                if (newGame.currentTurnPlayerId === currentPlayerId) {
                  toast.info("It's your turn!");
                }
              }
            }

            if (
              prev?.game?.status !== newGame.status ||
              prev?.game?.currentTurnPlayerId !== newGame.currentTurnPlayerId ||
              prev?.game?.turnNumber !== newGame.turnNumber ||
              prev?.players?.length !== newPlayers.length ||
              prev?.guesses?.length !== newGuesses.length ||
              prev?.players?.some((p, i) => p.isReady !== newPlayers[i]?.isReady)
            ) {
              return {
                game: newGame,
                players: newPlayers,
                guesses: newGuesses,
              };
            }
            return prev;
          });
        }
      } catch (e) {
        console.error('Polling error:', e);
      }
    }, POLL_INTERVAL);
  }, []);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // Create player
  const createPlayer = useCallback(async (nickname: string, avatarColor?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/multiplayer/player/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, avatarColor }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create player');
      }

      setPlayer(data.data);
      toast.success('Profile created!');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to create player';
      setError(message);
      toast.error(message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create game
  const createGame = useCallback(async (options: CreateGameInput): Promise<string> => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/multiplayer/game/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create game');
      }

      // Fetch full game state
      const stateRes = await fetch(`/api/multiplayer/game/state?gameId=${data.data.gameId}`);
      const stateData = await stateRes.json();

      if (stateData.success) {
        setGameState(stateData.data);
      }

      toast.success(`Game created! Room code: ${data.data.roomCode}`);
      return data.data.roomCode;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to create game';
      setError(message);
      toast.error(message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Join game
  const joinGame = useCallback(async (roomCode: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/multiplayer/game/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to join game');
      }

      // Fetch full game state
      const stateRes = await fetch(`/api/multiplayer/game/state?gameId=${data.data.gameId}`);
      const stateData = await stateRes.json();

      if (stateData.success) {
        setGameState(stateData.data);
      }

      toast.success('Joined game successfully!');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to join game';
      setError(message);
      toast.error(message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Leave game
  const leaveGame = useCallback(async () => {
    if (!gameState?.game?.gameId) return;

    setIsLoading(true);
    setError(null);

    try {
      await fetch('/api/multiplayer/game/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: gameState.game.gameId }),
      });

      stopPolling();
      setGameState(null);
      toast.info('Left the game');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to leave game';
      setError(message);
      toast.error(message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [gameState?.game?.gameId, stopPolling]);

  // Set ready
  const setReady = useCallback(async (isReady: boolean) => {
    if (!gameState?.game?.gameId) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/multiplayer/game/ready', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: gameState.game.gameId, isReady }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to set ready status');
      }

      // Update local state immediately
      setGameState((prev) => {
        if (!prev || !player) return prev;
        return {
          ...prev,
          players: prev.players.map((p) =>
            p.playerId === player.playerId ? { ...p, isReady } : p
          ),
        };
      });

      toast.success(isReady ? 'Ready!' : 'Not ready');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to set ready status';
      setError(message);
      toast.error(message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [gameState?.game?.gameId, player]);

  // Start game
  const startGame = useCallback(async () => {
    if (!gameState?.game?.gameId) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/multiplayer/game/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: gameState.game.gameId }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to start game');
      }

      setGameState(data.data);
      toast.success('Game started! Good luck!');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to start game';
      setError(message);
      toast.error(message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [gameState?.game?.gameId]);

  // Submit guess
  const submitGuess = useCallback(async (word: string): Promise<GuessResult> => {
    if (!gameState?.game?.gameId) {
      throw new Error('Not in a game');
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/multiplayer/game/guess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: gameState.game.gameId, word }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to submit guess');
      }

      const result = data.data as GuessResult;

      // Update local state
      setGameState((prev) => {
        if (!prev) return prev;

        const newGuesses = result.guess
          ? [...prev.guesses, result.guess].sort((a, b) => a.distance - b.distance)
          : prev.guesses;

        return {
          ...prev,
          game: {
            ...prev.game,
            status: result.gameStatus,
            currentTurnPlayerId: result.nextTurnPlayerId,
            winnerId: result.winnerId,
            turnNumber: prev.game.turnNumber + 1,
          },
          guesses: newGuesses,
        };
      });

      // Show toast based on result
      if (result.isCorrect) {
        toast.success('Correct! You won!');
      } else if (result.guess) {
        const distance = result.guess.distance;
        if (distance <= 100) {
          toast.success(`Getting close! Distance: ${distance}`);
        } else if (distance <= 500) {
          toast.info(`Not bad. Distance: ${distance}`);
        }
      }

      return result;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to submit guess';
      setError(message);
      toast.error(message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [gameState?.game?.gameId]);

  // Refresh game state
  const refreshGameState = useCallback(async () => {
    if (!gameState?.game?.gameId) return;

    try {
      const res = await fetch(`/api/multiplayer/game/state?gameId=${gameState.game.gameId}`);
      const data = await res.json();

      if (data.success) {
        setGameState(data.data);
      }
    } catch (e) {
      console.error('Failed to refresh game state:', e);
    }
  }, [gameState?.game?.gameId]);

  // Handle turn timeout
  const handleTimeout = useCallback(async () => {
    if (!gameState?.game?.gameId) return;

    try {
      const res = await fetch('/api/multiplayer/game/timeout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: gameState.game.gameId }),
      });

      const data = await res.json();

      if (data.success) {
        // Update local state with new turn info
        setGameState((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            game: {
              ...prev.game,
              currentTurnPlayerId: data.data.nextTurnPlayerId,
              turnNumber: data.data.turnNumber,
              turnStartedAt: Date.now(),
            },
          };
        });

        // Check if it's now our turn
        const currentPlayerId = document.cookie
          .split('; ')
          .find(row => row.startsWith('playerId='))
          ?.split('=')[1];

        if (data.data.nextTurnPlayerId === currentPlayerId) {
          toast.info("Your turn!");
        } else {
          toast.warning("Time's up! Turn skipped.");
        }
      }
    } catch (e) {
      console.error('Failed to handle timeout:', e);
      toast.error('Connection issue, refreshing...');
      // Fallback to refresh
      refreshGameState();
    }
  }, [gameState?.game?.gameId, refreshGameState]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: MultiplayerContextType = {
    player,
    gameState,
    isLoading,
    error,
    createPlayer,
    createGame,
    joinGame,
    leaveGame,
    setReady,
    startGame,
    submitGuess,
    refreshGameState,
    handleTimeout,
    clearError,
  };

  return (
    <MultiplayerContext.Provider value={value}>
      {children}
    </MultiplayerContext.Provider>
  );
}

export function useMultiplayer() {
  const context = useContext(MultiplayerContext);
  if (!context) {
    throw new Error('useMultiplayer must be used within MultiplayerProvider');
  }
  return context;
}
