'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Zap, Clock, Globe, Lock, Sparkles } from 'lucide-react';
import { useMultiplayer } from '@/contexts/MultiplayerContext';
import { useTheme } from '@/contexts/ThemeContext';
import { TURN_DURATION_OPTIONS } from '@/types/multiplayer';
import ThemeToggle from '@/components/ui/ThemeToggle';
import GlassCard from '@/components/ui/GlassCard';
import AnimatedButton from '@/components/ui/AnimatedButton';
import ProfileButton from '@/components/multiplayer/ProfileButton';

export default function CreateGamePage() {
  const router = useRouter();
  const { colors } = useTheme();
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

  const handleCreateGame = async () => {
    clearError();

    try {
      const roomCode = await createGame({
        gameMode: 'COMPETITIVE',
        maxPlayers: 2,
        turnDuration,
        isPublic,
      });

      if (roomCode) {
        setTimeout(() => {
          router.push(`/multiplayer/lobby/${roomCode}`);
        }, 100);
      }
    } catch {
      // Error handled by context
    }
  };

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
          onClick={() => router.push('/multiplayer')}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Back
        </AnimatedButton>

        <div className="flex items-center gap-3">
          <ProfileButton />
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
          <motion.div variants={itemVariants} className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="h-6 w-6" style={{ color: colors.primary }} />
              <h1
                className="text-3xl font-bold bg-clip-text text-transparent"
                style={{
                  backgroundImage: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
                }}
              >
                Create Game
              </h1>
              <Sparkles className="h-6 w-6" style={{ color: colors.accent }} />
            </div>
            <p style={{ color: colors.textMuted }}>Configure your game settings</p>
          </motion.div>

          {/* Settings Card */}
          <motion.div variants={itemVariants}>
            <GlassCard className="p-6 space-y-6">
              {/* Game Mode */}
              <div>
                <label
                  className="text-sm font-medium mb-2 block"
                  style={{ color: colors.textMuted }}
                >
                  Game Mode
                </label>
                <motion.div
                  className="p-4 rounded-xl"
                  style={{
                    backgroundColor: `${colors.primary}15`,
                    border: `1px solid ${colors.primary}30`,
                  }}
                  whileHover={{ scale: 1.01 }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${colors.primary}30` }}
                    >
                      <Zap className="w-5 h-5" style={{ color: colors.primary }} />
                    </div>
                    <div>
                      <p className="font-medium" style={{ color: colors.textPrimary }}>
                        Competitive 1v1
                      </p>
                      <p className="text-sm" style={{ color: colors.textMuted }}>
                        Alternating turns, first to find wins
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Turn Duration */}
              <div>
                <label
                  className="text-sm font-medium mb-2 block"
                  style={{ color: colors.textMuted }}
                >
                  <Clock className="w-4 h-4 inline mr-2" />
                  Turn Duration
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {TURN_DURATION_OPTIONS.map((duration) => (
                    <motion.button
                      key={duration}
                      onClick={() => setTurnDuration(duration)}
                      className="py-3 px-2 rounded-xl text-center font-medium transition-all cursor-pointer"
                      style={{
                        backgroundColor:
                          turnDuration === duration
                            ? `${colors.primary}30`
                            : colors.inputBg,
                        border: `1px solid ${
                          turnDuration === duration ? colors.primary : colors.inputBorder
                        }`,
                        color:
                          turnDuration === duration
                            ? colors.primary
                            : colors.textSecondary,
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {duration}s
                    </motion.button>
                  ))}
                </div>
                <p className="text-xs mt-2" style={{ color: colors.textMuted }}>
                  Time limit for each turn
                </p>
              </div>

              {/* Public/Private Toggle */}
              <div
                className="flex items-center justify-between p-4 rounded-xl"
                style={{
                  backgroundColor: colors.inputBg,
                  border: `1px solid ${colors.inputBorder}`,
                }}
              >
                <div className="flex items-center gap-3">
                  {isPublic ? (
                    <Globe className="w-5 h-5" style={{ color: colors.accent }} />
                  ) : (
                    <Lock className="w-5 h-5" style={{ color: colors.warning }} />
                  )}
                  <div>
                    <p className="font-medium" style={{ color: colors.textPrimary }}>
                      {isPublic ? 'Public Game' : 'Private Game'}
                    </p>
                    <p className="text-sm" style={{ color: colors.textMuted }}>
                      {isPublic
                        ? 'Anyone can find and join'
                        : 'Only players with code can join'}
                    </p>
                  </div>
                </div>
                <motion.button
                  onClick={() => setIsPublic(!isPublic)}
                  className="w-14 h-8 rounded-full p-1 transition-colors cursor-pointer"
                  style={{
                    backgroundColor: isPublic ? colors.primary : colors.inputBorder,
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  <motion.div
                    className="w-6 h-6 rounded-full bg-white"
                    animate={{ x: isPublic ? 22 : 0 }}
                    transition={{ type: 'spring' as const, stiffness: 500, damping: 30 }}
                  />
                </motion.button>
              </div>

              {/* Error message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-3 rounded-lg text-sm"
                    style={{
                      backgroundColor: colors.errorBg,
                      color: colors.error,
                    }}
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Create button */}
              <AnimatedButton
                variant="primary"
                size="lg"
                fullWidth
                glow
                onClick={handleCreateGame}
                isLoading={isLoading}
              >
                Create Room
              </AnimatedButton>
            </GlassCard>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}
