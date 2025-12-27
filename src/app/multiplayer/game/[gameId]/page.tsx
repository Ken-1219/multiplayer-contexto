'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useParams } from 'next/navigation';
import { Sparkles, Home, Flag } from 'lucide-react';
import { useMultiplayer } from '@/contexts/MultiplayerContext';
import { useTheme } from '@/contexts/ThemeContext';
import ThemeToggle from '@/components/ui/ThemeToggle';
import GlassCard from '@/components/ui/GlassCard';
import GuessItem from '@/components/ui/GuessItem';
import AnimatedButton from '@/components/ui/AnimatedButton';
import AnimatedInput from '@/components/ui/AnimatedInput';
import TurnIndicator from '@/components/multiplayer/TurnIndicator';
import TurnTimer from '@/components/multiplayer/TurnTimer';
import PlayerCard from '@/components/multiplayer/PlayerCard';
import GameResult from '@/components/multiplayer/GameResult';

export default function MultiplayerGamePage() {
  const router = useRouter();
  const params = useParams();
  const gameId = params.gameId as string;
  const { colors } = useTheme();

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

  const isMyTurn = Boolean(player && gameState?.game?.currentTurnPlayerId === player.playerId);

  // Focus input when it's player's turn
  useEffect(() => {
    if (isMyTurn && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isMyTurn]);

  // Loading state
  if (!isReady || !player) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen flex flex-col items-center justify-center p-4"
        style={{
          background: `linear-gradient(135deg, ${colors.bgFrom} 0%, ${colors.bgTo} 100%)`,
        }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 border-3 rounded-full"
          style={{
            borderColor: `${colors.primary}30`,
            borderTopColor: colors.primary,
          }}
        />
        <p className="mt-4" style={{ color: colors.textMuted }}>Loading...</p>
      </motion.div>
    );
  }

  if (!gameState?.game) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen flex flex-col items-center justify-center p-4"
        style={{
          background: `linear-gradient(135deg, ${colors.bgFrom} 0%, ${colors.bgTo} 100%)`,
        }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 border-3 rounded-full"
          style={{
            borderColor: `${colors.primary}30`,
            borderTopColor: colors.primary,
          }}
        />
        <p className="mt-4" style={{ color: colors.textMuted }}>Loading game...</p>
      </motion.div>
    );
  }

  const game = gameState.game;
  const players = gameState.players || [];
  const guesses = gameState.guesses || [];

  const currentPlayer = players.find(p => p.playerId === player.playerId);
  const opponent = players.find(p => p.playerId !== player.playerId);

  const myGuesses = guesses
    .filter(g => g.playerId === player.playerId)
    .sort((a, b) => a.distance - b.distance);
  const opponentGuesses = guesses
    .filter(g => g.playerId !== player.playerId)
    .sort((a, b) => a.distance - b.distance);

  const maxDistance = Math.max(
    ...myGuesses.map(g => g.distance),
    ...opponentGuesses.map(g => g.distance),
    1
  );

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

  const handleExit = () => {
    setShowResult(false);
    clearGameState();
    router.push('/multiplayer');
  };

  const isWinner = game.winnerId === player.playerId;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen w-full"
      style={{
        background: `linear-gradient(135deg, ${colors.bgFrom} 0%, ${colors.bgTo} 100%)`,
      }}
    >
      {/* Background Pattern */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, ${colors.bgPattern} 1px, transparent 0)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Main Container */}
      <div className="relative min-h-screen w-full flex flex-col p-4">
        {/* Header with Theme Toggle and Home */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-4"
        >
          <AnimatedButton
            variant="ghost"
            size="sm"
            onClick={() => router.push('/')}
            leftIcon={<Home className="w-4 h-4" />}
          >
            Home
          </AnimatedButton>
          <ThemeToggle />
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-6"
        >
          <div className="flex items-center justify-center gap-2">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <Sparkles className="h-6 w-6" style={{ color: colors.primary }} />
            </motion.div>
            <h1
              className="text-3xl md:text-4xl font-black tracking-tight bg-clip-text text-transparent"
              style={{
                backgroundImage: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
              }}
            >
              CONTEXTO
            </h1>
            <motion.div
              animate={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, delay: 0.5 }}
            >
              <Sparkles className="h-6 w-6" style={{ color: colors.accent }} />
            </motion.div>
          </div>
          <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
            Multiplayer Mode
          </p>
        </motion.div>

        {/* Players and Turn Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex justify-between items-start mb-4 gap-4"
        >
          <PlayerCard
            player={currentPlayer!}
            isCurrentTurn={isMyTurn}
            guessCount={myGuesses.length}
            isYou={true}
          />

          <div className="flex flex-col items-center">
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
        </motion.div>

        {/* Input Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-4"
        >
          <form onSubmit={handleSubmitGuess} className="flex gap-3">
            <div className="flex-1">
              <AnimatedInput
                ref={inputRef}
                value={guessInput}
                onChange={(e) => setGuessInput(e.target.value)}
                placeholder={isMyTurn ? 'Enter your guess...' : 'Waiting for opponent...'}
                disabled={!isMyTurn || isLoading}
                isLoading={isLoading}
              />
            </div>
            <AnimatedButton
              type="submit"
              variant="primary"
              size="lg"
              disabled={!isMyTurn || !guessInput.trim()}
              isLoading={isLoading}
            >
              Guess
            </AnimatedButton>
          </form>

          {/* Error */}
          <AnimatePresence>
            {(localError || error) && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="text-sm mt-2 text-center"
                style={{ color: colors.error }}
              >
                {localError || error}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Guess Lists - Side by Side */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex-1 grid grid-cols-2 gap-4 overflow-hidden"
        >
          {/* Your Guesses */}
          <GlassCard className="overflow-hidden flex flex-col">
            <div
              className="p-3 border-b"
              style={{
                backgroundColor: `${colors.primary}10`,
                borderColor: colors.cardBorder,
              }}
            >
              <h3
                className="font-semibold text-center"
                style={{ color: colors.textPrimary }}
              >
                Your Guesses ({myGuesses.length})
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {myGuesses.length === 0 ? (
                <p
                  className="text-center py-8 text-sm"
                  style={{ color: colors.textMuted }}
                >
                  No guesses yet
                </p>
              ) : (
                myGuesses.map((guess, index) => (
                  <GuessItem
                    key={`${guess.guessId}-${guess.word}-${index}`}
                    word={guess.word}
                    distance={guess.isCorrect ? 1 : guess.distance}
                    isTopGuess={index === 0}
                    isCorrect={guess.isCorrect}
                    index={index}
                    maxDistance={maxDistance}
                  />
                ))
              )}
            </div>
          </GlassCard>

          {/* Opponent's Guesses */}
          <GlassCard className="overflow-hidden flex flex-col">
            <div
              className="p-3 border-b"
              style={{
                backgroundColor: `${colors.accent}10`,
                borderColor: colors.cardBorder,
              }}
            >
              <h3
                className="font-semibold text-center"
                style={{ color: colors.textPrimary }}
              >
                {opponent?.nickname || 'Opponent'}&apos;s Guesses ({opponentGuesses.length})
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {opponentGuesses.length === 0 ? (
                <p
                  className="text-center py-8 text-sm"
                  style={{ color: colors.textMuted }}
                >
                  No guesses yet
                </p>
              ) : (
                opponentGuesses.map((guess, index) => (
                  <GuessItem
                    key={`${guess.guessId}-${guess.word}-${index}`}
                    word={guess.word}
                    distance={guess.isCorrect ? 1 : guess.distance}
                    isTopGuess={index === 0}
                    isCorrect={guess.isCorrect}
                    index={index}
                    maxDistance={maxDistance}
                  />
                ))
              )}
            </div>
          </GlassCard>
        </motion.div>

        {/* Footer - Give Up Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-4 text-center"
        >
          <AnimatedButton
            variant="danger"
            size="sm"
            onClick={handleLeaveGame}
            leftIcon={<Flag className="w-4 h-4" />}
          >
            Give Up
          </AnimatedButton>
        </motion.div>
      </div>

      {/* Game Result Modal */}
      <GameResult
        isOpen={showResult}
        isWinner={isWinner}
        winner={players.find(p => p.playerId === game.winnerId) || null}
        secretWord={game.secretWord}
        myGuessCount={myGuesses.length}
        opponentGuessCount={opponentGuesses.length}
        onExit={handleExit}
      />
    </motion.div>
  );
}
