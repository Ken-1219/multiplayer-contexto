'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardBody, Button, Input, Spinner } from '@nextui-org/react';
import { useRouter, useParams } from 'next/navigation';
import { useMultiplayer } from '@/contexts/MultiplayerContext';
import TurnIndicator from '@/components/multiplayer/TurnIndicator';
import TurnTimer from '@/components/multiplayer/TurnTimer';
import PlayerCard from '@/components/multiplayer/PlayerCard';
import GameResult from '@/components/multiplayer/GameResult';

export default function MultiplayerGamePage() {
  const router = useRouter();
  const params = useParams();
  const gameId = params.gameId as string;

  const {
    player,
    gameState,
    isLoading,
    error,
    submitGuess,
    leaveGame,
    refreshGameState,
    handleTimeout,
    clearError,
    clearGameState,
  } = useMultiplayer();

  const [guessInput, setGuessInput] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Redirect if no player
  useEffect(() => {
    if (!player) {
      router.push('/multiplayer');
    } else {
      setIsReady(true);
    }
  }, [player, router]);

  // Refresh game state if not loaded
  useEffect(() => {
    if (!gameState?.game?.gameId && gameId && isReady) {
      refreshGameState();
    }
  }, [gameState?.game?.gameId, gameId, refreshGameState, isReady]);

  // Show result modal when game ends
  useEffect(() => {
    if (gameState?.game?.status === 'COMPLETED') {
      setShowResult(true);
    }
  }, [gameState?.game?.status]);

  // Compute isMyTurn early for use in effects
  const isMyTurn = Boolean(player && gameState?.game?.currentTurnPlayerId === player.playerId);

  // Focus input when it's player's turn
  useEffect(() => {
    if (isMyTurn && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isMyTurn]);

  // Show loading while checking player status
  if (!isReady || !player) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-center p-4">
        <Spinner size="lg" />
        <p className="text-slate-400 mt-4">Loading...</p>
      </div>
    );
  }

  // Loading state
  if (!gameState?.game) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-center p-4">
        <Spinner size="lg" />
        <p className="text-slate-400 mt-4">Loading game...</p>
      </div>
    );
  }

  const game = gameState.game;
  const players = gameState.players || [];
  const guesses = gameState.guesses || [];

  const currentPlayer = players.find(p => p.playerId === player.playerId);
  const opponent = players.find(p => p.playerId !== player.playerId);
  // isMyTurn is already computed above for the useEffect

  const myGuesses = guesses.filter(g => g.playerId === player.playerId);
  const opponentGuesses = guesses.filter(g => g.playerId !== player.playerId);

  const handleSubmitGuess = async (e: React.FormEvent) => {
    e.preventDefault();

    const word = guessInput.trim().toLowerCase();

    if (!word) {
      setLocalError('Please enter a word');
      return;
    }

    if (!isMyTurn) {
      setLocalError("It's not your turn");
      return;
    }

    setLocalError(null);
    clearError();

    try {
      await submitGuess(word);
      setGuessInput('');
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to submit guess');
    }
  };

  const handleLeaveGame = async () => {
    if (confirm('Are you sure you want to leave? You will forfeit the game.')) {
      await leaveGame();
      router.push('/multiplayer');
    }
  };

  const handlePlayAgain = () => {
    setShowResult(false);
    clearGameState();
    router.push('/multiplayer');
  };

  const handleExit = () => {
    setShowResult(false);
    clearGameState();
    router.push('/');
  };

  const isWinner = game.winnerId === player.playerId;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col p-4">
      {/* Header with players */}
      <div className="flex justify-between items-start mb-4">
        <PlayerCard
          player={currentPlayer!}
          isCurrentTurn={isMyTurn}
          guessCount={myGuesses.length}
          isYou={true}
        />

        <div className="text-center">
          <TurnIndicator
            isMyTurn={isMyTurn}
            currentPlayerName={isMyTurn ? 'Your' : `${opponent?.nickname}'s`}
            turnNumber={game.turnNumber}
          />
          {game.status === 'ACTIVE' && (
            <TurnTimer
              duration={game.turnDuration}
              turnStartedAt={game.turnStartedAt || Date.now()}
              isMyTurn={isMyTurn}
              isPaused={isLoading && isMyTurn}
              onTimeout={handleTimeout}
            />
          )}
        </div>

        {opponent && (
          <PlayerCard
            player={opponent}
            isCurrentTurn={!isMyTurn}
            guessCount={opponentGuesses.length}
            isYou={false}
          />
        )}
      </div>

      {/* Guess Input */}
      <Card className="mb-4 bg-slate-800/50 border border-slate-700">
        <CardBody className="p-4">
          <form onSubmit={handleSubmitGuess} className="flex gap-2">
            <Input
              ref={inputRef}
              aria-label="Guess input"
              placeholder={isMyTurn ? "Enter your guess..." : "Waiting for opponent..."}
              value={guessInput}
              onChange={(e) => setGuessInput(e.target.value)}
              isDisabled={!isMyTurn || isLoading}
              variant="bordered"
              size="lg"
              classNames={{
                input: 'text-white',
                inputWrapper: 'bg-slate-700/50 border-slate-600 hover:bg-slate-700',
              }}
            />
            <Button
              type="submit"
              color="primary"
              isLoading={isLoading}
              isDisabled={!isMyTurn || !guessInput.trim()}
            >
              Guess
            </Button>
          </form>

          {(localError || error) && (
            <p className="text-red-400 text-sm mt-2">{localError || error}</p>
          )}
        </CardBody>
      </Card>

      {/* Guess Lists */}
      <div className="flex-1 grid grid-cols-2 gap-4 overflow-hidden">
        {/* Your Guesses */}
        <Card className="bg-slate-800/50 border border-slate-700 overflow-hidden">
          <CardBody className="p-0">
            <div className="p-3 bg-slate-700/50 border-b border-slate-600">
              <h3 className="text-white font-medium text-center">Your Guesses ({myGuesses.length})</h3>
            </div>
            <div className="overflow-y-auto max-h-[400px] p-2">
              {myGuesses.length === 0 ? (
                <p className="text-slate-500 text-center py-4">No guesses yet</p>
              ) : (
                <div className="space-y-1">
                  {myGuesses.map((guess) => (
                    <div
                      key={guess.guessId}
                      className={`flex items-center justify-between p-2 rounded ${
                        guess.isCorrect
                          ? 'bg-emerald-500/20 border border-emerald-500/50'
                          : guess.distance <= 100
                          ? 'bg-yellow-500/10'
                          : guess.distance <= 500
                          ? 'bg-orange-500/10'
                          : 'bg-slate-700/30'
                      }`}
                    >
                      <span className="text-white">{guess.word}</span>
                      <span
                        className={`font-mono font-bold ${
                          guess.isCorrect
                            ? 'text-emerald-400'
                            : guess.distance <= 100
                            ? 'text-yellow-400'
                            : guess.distance <= 500
                            ? 'text-orange-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {guess.isCorrect ? '1' : guess.distance}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Opponent's Guesses */}
        <Card className="bg-slate-800/50 border border-slate-700 overflow-hidden">
          <CardBody className="p-0">
            <div className="p-3 bg-slate-700/50 border-b border-slate-600">
              <h3 className="text-white font-medium text-center">
                {opponent?.nickname || 'Opponent'}&apos;s Guesses ({opponentGuesses.length})
              </h3>
            </div>
            <div className="overflow-y-auto max-h-[400px] p-2">
              {opponentGuesses.length === 0 ? (
                <p className="text-slate-500 text-center py-4">No guesses yet</p>
              ) : (
                <div className="space-y-1">
                  {opponentGuesses.map((guess) => (
                    <div
                      key={guess.guessId}
                      className={`flex items-center justify-between p-2 rounded ${
                        guess.isCorrect
                          ? 'bg-emerald-500/20 border border-emerald-500/50'
                          : guess.distance <= 100
                          ? 'bg-yellow-500/10'
                          : guess.distance <= 500
                          ? 'bg-orange-500/10'
                          : 'bg-slate-700/30'
                      }`}
                    >
                      <span className="text-white">{guess.word}</span>
                      <span
                        className={`font-mono font-bold ${
                          guess.isCorrect
                            ? 'text-emerald-400'
                            : guess.distance <= 100
                            ? 'text-yellow-400'
                            : guess.distance <= 500
                            ? 'text-orange-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {guess.isCorrect ? '1' : guess.distance}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Footer */}
      <div className="mt-4 text-center">
        <Button
          variant="light"
          color="danger"
          size="sm"
          onPress={handleLeaveGame}
        >
          Give Up
        </Button>
      </div>

      {/* Game Result Modal */}
      {showResult && (
        <GameResult
          isOpen={showResult}
          isWinner={isWinner}
          winner={players.find(p => p.playerId === game.winnerId) || null}
          secretWord={game.secretWord}
          myGuessCount={myGuesses.length}
          opponentGuessCount={opponentGuesses.length}
          onPlayAgain={handlePlayAgain}
          onExit={handleExit}
        />
      )}
    </div>
  );
}
