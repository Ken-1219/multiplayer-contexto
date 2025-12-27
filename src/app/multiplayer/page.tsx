'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, LogIn, Sparkles } from 'lucide-react';
import { useMultiplayer } from '@/contexts/MultiplayerContext';
import { useTheme } from '@/contexts/ThemeContext';
import { validateNickname, AVATAR_COLORS, type AvatarColor } from '@/types/multiplayer';
import ThemeToggle from '@/components/ui/ThemeToggle';
import GlassCard from '@/components/ui/GlassCard';
import AnimatedButton from '@/components/ui/AnimatedButton';
import AnimatedInput from '@/components/ui/AnimatedInput';

export default function MultiplayerLobbyPage() {
  const router = useRouter();
  const { colors } = useTheme();
  const { player, isLoading, isInitialized, error, createPlayer, clearError } = useMultiplayer();

  const [nickname, setNickname] = useState('');
  const [selectedColor, setSelectedColor] = useState<AvatarColor>(AVATAR_COLORS[0]);
  const [nicknameError, setNicknameError] = useState<string | null>(null);

  const handleCreatePlayer = async () => {
    const validation = validateNickname(nickname);
    if (!validation.valid) {
      setNicknameError(validation.error || 'Invalid nickname');
      return;
    }

    setNicknameError(null);
    clearError();

    try {
      await createPlayer(nickname, selectedColor);
    } catch {
      // Error is handled by context
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

  // Show loading state while checking for existing player
  if (!isInitialized) {
    return (
      <div
        className="min-h-screen w-full flex items-center justify-center"
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
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 border-3 rounded-full"
          style={{
            borderColor: `${colors.primary}30`,
            borderTopColor: colors.primary,
          }}
        />
      </div>
    );
  }

  // Show nickname setup if no player
  if (!player) {
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
            onClick={() => router.push('/')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Back
          </AnimatedButton>
          <ThemeToggle />
        </div>

        <div className="relative min-h-screen flex flex-col items-center justify-center p-4">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="w-full max-w-md space-y-6"
          >
            <motion.div variants={itemVariants} className="text-center">
              <h1
                className="text-3xl font-bold mb-2"
                style={{ color: colors.textPrimary }}
              >
                Create Your Profile
              </h1>
              <p style={{ color: colors.textMuted }}>
                Choose a nickname to play multiplayer
              </p>
            </motion.div>

            <motion.div variants={itemVariants}>
              <GlassCard className="p-6 space-y-6">
                {/* Nickname Input */}
                <div>
                  <label
                    className="text-sm font-medium mb-2 block"
                    style={{ color: colors.textSecondary }}
                  >
                    Nickname
                  </label>
                  <AnimatedInput
                    placeholder="Enter your nickname"
                    value={nickname}
                    onChange={(e) => {
                      setNickname(e.target.value);
                      setNicknameError(null);
                    }}
                    maxLength={20}
                    error={nicknameError || undefined}
                  />
                  {!nicknameError && (
                    <p
                      className="text-xs mt-2"
                      style={{ color: colors.textMuted }}
                    >
                      2-20 characters, letters, numbers, underscores, hyphens only
                    </p>
                  )}
                </div>

                {/* Avatar Color Selection */}
                <div>
                  <label
                    className="text-sm font-medium mb-3 block"
                    style={{ color: colors.textSecondary }}
                  >
                    Choose your color
                  </label>
                  <div className="grid grid-cols-8 gap-3">
                    {AVATAR_COLORS.map((color, index) => (
                      <motion.button
                        key={color}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: index * 0.03 }}
                        onClick={() => setSelectedColor(color)}
                        className="w-8 h-8 rounded-full transition-all cursor-pointer"
                        style={{
                          backgroundColor: color,
                          boxShadow: selectedColor === color
                            ? `0 0 0 3px ${colors.bgTo}, 0 0 0 5px ${color}`
                            : undefined,
                          transform: selectedColor === color ? 'scale(1.15)' : undefined,
                        }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                      />
                    ))}
                  </div>
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

                {/* Submit button */}
                <AnimatedButton
                  variant="primary"
                  size="lg"
                  fullWidth
                  glow
                  onClick={handleCreatePlayer}
                  isLoading={isLoading}
                >
                  Continue
                </AnimatedButton>
              </GlassCard>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  // Show Create/Join options
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
          onClick={() => router.push('/')}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Back
        </AnimatedButton>

        <div className="flex items-center gap-4">
          {/* Player info */}
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: player.avatarColor }}
            >
              {player.nickname[0].toUpperCase()}
            </div>
            <span
              className="font-medium text-sm hidden sm:inline"
              style={{ color: colors.textPrimary }}
            >
              {player.nickname}
            </span>
          </div>
          <ThemeToggle />
        </div>
      </div>

      <div className="relative min-h-screen flex flex-col items-center justify-center p-4">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-2xl space-y-8"
        >
          {/* Title */}
          <motion.div variants={itemVariants} className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="h-6 w-6" style={{ color: colors.primary }} />
              <h1
                className="text-3xl font-bold"
                style={{ color: colors.textPrimary }}
              >
                Multiplayer
              </h1>
              <Sparkles className="h-6 w-6" style={{ color: colors.accent }} />
            </div>
            <p style={{ color: colors.textMuted }}>
              Create a new game or join an existing one
            </p>
          </motion.div>

          {/* Options */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {/* Create Game */}
            <motion.div
              whileHover={{ scale: 1.02, y: -4 }}
              whileTap={{ scale: 0.98 }}
            >
              <GlassCard
                className="cursor-pointer p-8 h-full"
                onClick={() => router.push('/multiplayer/create')}
              >
                <div className="flex flex-col items-center text-center gap-5">
                  <motion.div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${colors.primary}30, ${colors.primary}10)`,
                      border: `1px solid ${colors.primary}40`,
                    }}
                    whileHover={{
                      boxShadow: `0 0 30px ${colors.accentGlow}`,
                    }}
                  >
                    <Plus className="w-8 h-8" style={{ color: colors.primary }} />
                  </motion.div>
                  <div className="space-y-2">
                    <h2
                      className="text-xl font-bold"
                      style={{ color: colors.textPrimary }}
                    >
                      Create Game
                    </h2>
                    <p
                      className="text-sm"
                      style={{ color: colors.textMuted }}
                    >
                      Host a new room and invite a friend
                    </p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>

            {/* Join Game */}
            <motion.div
              whileHover={{ scale: 1.02, y: -4 }}
              whileTap={{ scale: 0.98 }}
            >
              <GlassCard
                className="cursor-pointer p-8 h-full"
                onClick={() => router.push('/multiplayer/join')}
              >
                <div className="flex flex-col items-center text-center gap-5">
                  <motion.div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${colors.accent}30, ${colors.accent}10)`,
                      border: `1px solid ${colors.accent}40`,
                    }}
                    whileHover={{
                      boxShadow: `0 0 30px ${colors.accentGlow}`,
                    }}
                  >
                    <LogIn className="w-8 h-8" style={{ color: colors.accent }} />
                  </motion.div>
                  <div className="space-y-2">
                    <h2
                      className="text-xl font-bold"
                      style={{ color: colors.textPrimary }}
                    >
                      Join Game
                    </h2>
                    <p
                      className="text-sm"
                      style={{ color: colors.textMuted }}
                    >
                      Enter a room code to join
                    </p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      {/* Loading overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
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
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
