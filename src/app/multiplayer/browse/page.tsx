'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, RefreshCw, Users, Zap, Clock, Plus } from 'lucide-react';
import { useMultiplayer } from '@/contexts/MultiplayerContext';
import { useTheme } from '@/contexts/ThemeContext';
import { type GameListItem, formatRelativeTime } from '@/types/multiplayer';
import ThemeToggle from '@/components/ui/ThemeToggle';
import GlassCard from '@/components/ui/GlassCard';
import AnimatedButton from '@/components/ui/AnimatedButton';
import ProfileButton from '@/components/multiplayer/ProfileButton';

export default function BrowseGamesPage() {
  const router = useRouter();
  const { colors } = useTheme();
  const { player, isLoading, error, joinGame, clearError, gameState, isInitialized } = useMultiplayer();

  const [games, setGames] = useState<GameListItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [joiningGameId, setJoiningGameId] = useState<string | null>(null);

  // Fetch public games
  const fetchPublicGames = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setFetchError(null);

      const response = await fetch('/api/multiplayer/games/public?limit=20');
      const data = await response.json();

      if (data.success) {
        setGames(data.data || []);
      } else {
        setFetchError(data.error || 'Failed to fetch games');
      }
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to fetch games');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Redirect if no player
  useEffect(() => {
    if (isInitialized && !player) {
      router.push('/multiplayer');
    }
  }, [player, router, isInitialized]);

  // Redirect if joined a game
  useEffect(() => {
    if (gameState?.game?.gameId) {
      router.push(`/multiplayer/lobby/${gameState.game.roomCode}`);
    }
  }, [gameState?.game?.gameId, gameState?.game?.roomCode, router]);

  // Initial fetch and auto-refresh
  useEffect(() => {
    if (isInitialized && player) {
      fetchPublicGames();

      // Auto-refresh every 5 seconds
      const interval = setInterval(fetchPublicGames, 5000);
      return () => clearInterval(interval);
    }
  }, [fetchPublicGames, isInitialized, player]);

  // Handle join game
  const handleJoinGame = async (roomCode: string, gameId: string) => {
    setJoiningGameId(gameId);
    clearError();

    try {
      await joinGame(roomCode);
    } catch {
      // Error handled by context
    } finally {
      setJoiningGameId(null);
    }
  };

  // Show loading state while checking player status
  if (!isInitialized || !player) {
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

      <div className="relative min-h-screen flex flex-col items-center justify-center p-4 pt-20">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-2xl space-y-6"
        >
          {/* Title */}
          <motion.div variants={itemVariants} className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Search className="h-6 w-6" style={{ color: colors.primary }} />
              <h1
                className="text-3xl font-bold bg-clip-text text-transparent"
                style={{
                  backgroundImage: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
                }}
              >
                Browse Games
              </h1>
            </div>
            <p style={{ color: colors.textMuted }}>Find and join public games</p>
          </motion.div>

          {/* Games List Card */}
          <motion.div variants={itemVariants}>
            <GlassCard className="p-4 space-y-4">
              {/* Refresh Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" style={{ color: colors.textMuted }} />
                  <span className="text-sm" style={{ color: colors.textMuted }}>
                    {games.length} {games.length === 1 ? 'game' : 'games'} available
                  </span>
                </div>
                <motion.button
                  onClick={fetchPublicGames}
                  disabled={isRefreshing}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                  style={{
                    backgroundColor: colors.inputBg,
                    border: `1px solid ${colors.inputBorder}`,
                    color: colors.textSecondary,
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <motion.div
                    animate={isRefreshing ? { rotate: 360 } : {}}
                    transition={{ duration: 1, repeat: isRefreshing ? Infinity : 0, ease: 'linear' }}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </motion.div>
                  <span className="text-sm">Refresh</span>
                </motion.button>
              </div>

              {/* Error message */}
              <AnimatePresence>
                {(fetchError || error) && (
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
                    {fetchError || error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Games List */}
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {games.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12 space-y-4"
                  >
                    <div
                      className="w-16 h-16 mx-auto rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${colors.textMuted}20` }}
                    >
                      <Search className="w-8 h-8" style={{ color: colors.textMuted }} />
                    </div>
                    <div>
                      <p className="font-medium" style={{ color: colors.textSecondary }}>
                        No games available
                      </p>
                      <p className="text-sm" style={{ color: colors.textMuted }}>
                        Create your own game or try again later
                      </p>
                    </div>
                    <AnimatedButton
                      variant="primary"
                      size="md"
                      onClick={() => router.push('/multiplayer/create')}
                      leftIcon={<Plus className="w-4 h-4" />}
                    >
                      Create Game
                    </AnimatedButton>
                  </motion.div>
                ) : (
                  games.map((game, index) => (
                    <motion.div
                      key={game.gameId}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 rounded-xl transition-all"
                      style={{
                        backgroundColor: 'rgba(0,0,0,0.2)',
                        border: `1px solid ${colors.cardBorder}`,
                      }}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className="font-medium truncate"
                              style={{ color: colors.textPrimary }}
                            >
                              {game.hostNickname}&apos;s Game
                            </span>
                            <span
                              className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap"
                              style={{
                                backgroundColor: `${colors.accent}20`,
                                color: colors.accent,
                              }}
                            >
                              {game.playerCount}/{game.maxPlayers}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs" style={{ color: colors.textMuted }}>
                            <span className="flex items-center gap-1">
                              <Zap className="w-3 h-3" />
                              {game.gameMode === 'COMPETITIVE' ? '1v1' : game.gameMode}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatRelativeTime(game.createdAt)}
                            </span>
                          </div>
                        </div>
                        <AnimatedButton
                          variant="primary"
                          size="sm"
                          onClick={() => handleJoinGame(game.roomCode, game.gameId)}
                          isLoading={joiningGameId === game.gameId || isLoading}
                          disabled={joiningGameId !== null && joiningGameId !== game.gameId}
                        >
                          Join
                        </AnimatedButton>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </GlassCard>
          </motion.div>

          {/* Help text */}
          <motion.p
            variants={itemVariants}
            className="text-xs text-center"
            style={{ color: colors.textMuted }}
          >
            Games refresh automatically every 5 seconds
          </motion.p>
        </motion.div>
      </div>
    </motion.div>
  );
}
