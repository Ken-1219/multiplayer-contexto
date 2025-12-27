'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Sparkles, Users } from 'lucide-react';
import { useMultiplayer } from '@/contexts/MultiplayerContext';
import { useTheme } from '@/contexts/ThemeContext';
import ThemeToggle from '@/components/ui/ThemeToggle';
import GlassCard from '@/components/ui/GlassCard';
import AnimatedButton from '@/components/ui/AnimatedButton';
import ProfileButton from '@/components/multiplayer/ProfileButton';

export default function JoinGamePage() {
  const router = useRouter();
  const { colors } = useTheme();
  const { player, isLoading, error, joinGame, clearError, gameState } = useMultiplayer();

  const [roomCode, setRoomCode] = useState(['', '', '', '', '', '']);
  const [isReady, setIsReady] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
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
    if (e.key === 'Enter' && isCodeComplete) {
      handleJoinGame();
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
              <Users className="h-6 w-6" style={{ color: colors.primary }} />
              <h1
                className="text-3xl font-bold bg-clip-text text-transparent"
                style={{
                  backgroundImage: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
                }}
              >
                Join Game
              </h1>
              <Sparkles className="h-6 w-6" style={{ color: colors.accent }} />
            </div>
            <p style={{ color: colors.textMuted }}>Enter the 6-character room code</p>
          </motion.div>

          {/* Code Input Card */}
          <motion.div variants={itemVariants}>
            <GlassCard className="p-6 space-y-6">
              {/* Room Code Input */}
              <div>
                <label
                  className="text-sm font-medium mb-4 block text-center"
                  style={{ color: colors.textMuted }}
                >
                  Room Code
                </label>
                <div className="flex justify-center gap-2">
                  {roomCode.map((char, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <motion.input
                        ref={(el) => { inputRefs.current[index] = el; }}
                        type="text"
                        maxLength={6}
                        value={char}
                        onChange={(e) => handleInputChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        onFocus={() => setFocusedIndex(index)}
                        onBlur={() => setFocusedIndex(null)}
                        className="w-12 h-14 text-center text-2xl font-bold rounded-xl uppercase transition-all outline-none"
                        style={{
                          backgroundColor: colors.inputBg,
                          border: `2px solid ${
                            focusedIndex === index
                              ? colors.primary
                              : char
                              ? colors.inputFocusBorder
                              : colors.inputBorder
                          }`,
                          color: colors.textPrimary,
                          boxShadow:
                            focusedIndex === index
                              ? `0 0 20px ${colors.accentGlow}`
                              : 'none',
                        }}
                        whileFocus={{ scale: 1.05 }}
                      />
                    </motion.div>
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

              {/* Join button */}
              <AnimatedButton
                variant="primary"
                size="lg"
                fullWidth
                glow={isCodeComplete}
                onClick={handleJoinGame}
                isLoading={isLoading}
                disabled={!isCodeComplete}
              >
                Join Game
              </AnimatedButton>

              {/* Help text */}
              <p className="text-xs text-center" style={{ color: colors.textMuted }}>
                Ask your friend for the room code to join their game
              </p>
            </GlassCard>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}
