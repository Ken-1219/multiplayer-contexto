'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Copy, Check, Play, UserCheck, Clock, WifiOff } from 'lucide-react';
import { useMultiplayer } from '@/contexts/MultiplayerContext';
import { useTheme } from '@/contexts/ThemeContext';
import ThemeToggle from '@/components/ui/ThemeToggle';
import GlassCard from '@/components/ui/GlassCard';
import AnimatedButton from '@/components/ui/AnimatedButton';

export default function WaitingRoomPage() {
  const router = useRouter();
  const params = useParams();
  const roomCode = params.roomCode as string;
  const { colors } = useTheme();

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

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
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
        <p className="mt-4" style={{ color: colors.textMuted }}>Joining game...</p>
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mt-4 p-3 rounded-lg flex items-center gap-2"
              style={{
                backgroundColor: colors.errorBg,
                color: colors.error,
              }}
            >
              {error}
              <AnimatedButton
                variant="ghost"
                size="sm"
                onClick={() => router.push('/multiplayer')}
              >
                Go Back
              </AnimatedButton>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  const game = gameState.game;
  const players = gameState.players || [];
  const currentPlayer = players.find(p => p.playerId === player.playerId);
  const isHost = player.playerId === game.hostPlayerId;
  const connectedPlayers = players.filter(p => p.isConnected !== false);
  const allReady = connectedPlayers.length >= 2 && connectedPlayers.every(p => p.isReady || p.isHost || p.playerId === game.hostPlayerId);
  const canStart = isHost && allReady && connectedPlayers.length >= 2;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 100,
        damping: 15,
      },
    },
  };

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

      {/* Header */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20">
        <AnimatedButton
          variant="ghost"
          size="sm"
          onClick={handleLeaveGame}
          isLoading={leaving}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Leave
        </AnimatedButton>

        <div className="flex items-center gap-3">
          {/* Room Code */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCopyCode}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg tracking-wider cursor-pointer"
            style={{
              backgroundColor: colors.cardBg,
              border: `1px solid ${colors.cardBorder}`,
              color: colors.textPrimary,
            }}
          >
            {roomCode}
            <motion.div
              initial={false}
              animate={copied ? { scale: [1, 1.2, 1] } : {}}
            >
              {copied ? (
                <Check className="w-4 h-4" style={{ color: colors.success }} />
              ) : (
                <Copy className="w-4 h-4" style={{ color: colors.textMuted }} />
              )}
            </motion.div>
          </motion.button>
          <ThemeToggle />
        </div>
      </div>

      <div className="relative min-h-screen flex flex-col items-center justify-center p-4">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-md space-y-6"
        >
          {/* Title */}
          <motion.div variants={itemVariants} className="text-center">
            <h1
              className="text-3xl font-bold mb-2"
              style={{ color: colors.textPrimary }}
            >
              Waiting Room
            </h1>
            <p style={{ color: colors.textMuted }}>
              {players.length}/{game.maxPlayers} players
            </p>
          </motion.div>

          {/* Players List */}
          <motion.div variants={itemVariants}>
            <GlassCard className="p-4 space-y-3">
              {players.map((p, index) => (
                <motion.div
                  key={p.playerId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 rounded-xl"
                  style={{
                    backgroundColor: p.playerId === player.playerId
                      ? `${colors.primary}15`
                      : 'rgba(0,0,0,0.2)',
                    border: `1px solid ${p.playerId === player.playerId ? `${colors.primary}30` : 'transparent'}`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <motion.div
                      animate={p.isReady || p.playerId === game.hostPlayerId ? {
                        scale: [1, 1.05, 1],
                      } : {}}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: p.avatarColor }}
                    >
                      {p.nickname[0].toUpperCase()}
                    </motion.div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className="font-medium"
                          style={{ color: colors.textPrimary }}
                        >
                          {p.nickname}
                        </span>
                        {p.playerId === game.hostPlayerId && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: `${colors.warning}30`,
                              color: colors.warning,
                            }}
                          >
                            Host
                          </span>
                        )}
                        {p.playerId === player.playerId && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: `${colors.primary}30`,
                              color: colors.primary,
                            }}
                          >
                            You
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {!p.isConnected ? (
                    <div
                      className="flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                      style={{
                        backgroundColor: colors.errorBg,
                        color: colors.error,
                      }}
                    >
                      <WifiOff className="w-3 h-3" />
                      Offline
                    </div>
                  ) : p.isReady || p.playerId === game.hostPlayerId ? (
                    <div
                      className="flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                      style={{
                        backgroundColor: colors.successBg,
                        color: colors.success,
                      }}
                    >
                      <UserCheck className="w-3 h-3" />
                      Ready
                    </div>
                  ) : (
                    <div
                      className="flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                      style={{
                        backgroundColor: colors.cardBg,
                        color: colors.textMuted,
                      }}
                    >
                      <Clock className="w-3 h-3" />
                      Waiting...
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Empty slots */}
              {Array.from({ length: game.maxPlayers - players.length }).map((_, i) => (
                <motion.div
                  key={`empty-${i}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: players.length * 0.1 + i * 0.1 }}
                  className="flex items-center justify-center p-3 rounded-xl border-2 border-dashed"
                  style={{ borderColor: colors.cardBorder }}
                >
                  <span style={{ color: colors.textMuted }}>
                    Waiting for player...
                  </span>
                </motion.div>
              ))}
            </GlassCard>
          </motion.div>

          {/* Error message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-3 rounded-lg text-sm text-center"
                style={{
                  backgroundColor: colors.errorBg,
                  color: colors.error,
                }}
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons */}
          <motion.div variants={itemVariants} className="space-y-3">
            {isHost ? (
              <AnimatedButton
                variant="primary"
                size="lg"
                fullWidth
                glow={canStart}
                onClick={handleStartGame}
                isLoading={isLoading}
                disabled={!canStart}
                leftIcon={<Play className="w-5 h-5" />}
              >
                {!canStart && players.length < 2
                  ? 'Waiting for players...'
                  : !canStart
                  ? 'Waiting for all players...'
                  : 'Start Game'}
              </AnimatedButton>
            ) : (
              <AnimatedButton
                variant={currentPlayer?.isReady ? 'secondary' : 'primary'}
                size="lg"
                fullWidth
                glow={!currentPlayer?.isReady}
                onClick={handleToggleReady}
                isLoading={isLoading}
                leftIcon={<UserCheck className="w-5 h-5" />}
              >
                {currentPlayer?.isReady ? 'Cancel Ready' : "I'm Ready!"}
              </AnimatedButton>
            )}
          </motion.div>

          {/* Game Settings Info */}
          <motion.div
            variants={itemVariants}
            className="text-center space-y-1"
          >
            <p className="text-sm" style={{ color: colors.textMuted }}>
              Game Mode: Competitive 1v1
            </p>
            <p className="text-sm" style={{ color: colors.textMuted }}>
              Turn Duration: {game.turnDuration} seconds
            </p>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}
