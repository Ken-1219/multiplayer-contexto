'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { User, Users, Sparkles, HelpCircle } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import ThemeToggle from '@/components/ui/ThemeToggle';
import GlassCard from '@/components/ui/GlassCard';
import AnimatedButton from '@/components/ui/AnimatedButton';

export default function Home() {
  const router = useRouter();
  const { colors } = useTheme();

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

      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* Main Content */}
      <div className="relative min-h-screen flex flex-col items-center justify-center p-4">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-4xl mx-auto space-y-10"
        >
          {/* Title Section */}
          <motion.div variants={itemVariants} className="text-center space-y-4">
            <motion.div
              className="flex items-center justify-center gap-3"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <Sparkles className="h-8 w-8" style={{ color: colors.primary }} />
              </motion.div>
              <h1
                className="text-5xl md:text-7xl font-black tracking-tight"
                style={{
                  background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                CONTEXTO
              </h1>
              <motion.div
                animate={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, delay: 0.5 }}
              >
                <Sparkles className="h-8 w-8" style={{ color: colors.accent }} />
              </motion.div>
            </motion.div>
            <p
              className="text-lg md:text-xl max-w-md mx-auto"
              style={{ color: colors.textMuted }}
            >
              Find the secret word using context and semantic similarity
            </p>
          </motion.div>

          {/* Game Mode Selection */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {/* Single Player */}
            <motion.div
              whileHover={{ scale: 1.02, y: -4 }}
              whileTap={{ scale: 0.98 }}
            >
              <GlassCard
                className="cursor-pointer p-8 h-full"
                onClick={() => router.push('/play')}
              >
                <div className="flex flex-col items-center text-center gap-5">
                  <motion.div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${colors.primary}30, ${colors.primary}10)`,
                      border: `1px solid ${colors.primary}40`,
                    }}
                    whileHover={{
                      boxShadow: `0 0 30px ${colors.accentGlow}`,
                    }}
                  >
                    <User className="w-10 h-10" style={{ color: colors.primary }} />
                  </motion.div>
                  <div className="space-y-2">
                    <h2
                      className="text-2xl font-bold"
                      style={{ color: colors.textPrimary }}
                    >
                      Single Player
                    </h2>
                    <p
                      className="text-sm"
                      style={{ color: colors.textMuted }}
                    >
                      Play today&apos;s daily word at your own pace
                    </p>
                  </div>
                  <AnimatedButton
                    variant="primary"
                    size="md"
                    className="mt-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push('/play');
                    }}
                  >
                    Play Now
                  </AnimatedButton>
                </div>
              </GlassCard>
            </motion.div>

            {/* Multiplayer */}
            <motion.div
              whileHover={{ scale: 1.02, y: -4 }}
              whileTap={{ scale: 0.98 }}
            >
              <GlassCard
                className="cursor-pointer p-8 h-full"
                onClick={() => router.push('/multiplayer')}
              >
                <div className="flex flex-col items-center text-center gap-5">
                  <motion.div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${colors.accent}30, ${colors.accent}10)`,
                      border: `1px solid ${colors.accent}40`,
                    }}
                    whileHover={{
                      boxShadow: `0 0 30px ${colors.accentGlow}`,
                    }}
                  >
                    <Users className="w-10 h-10" style={{ color: colors.accent }} />
                  </motion.div>
                  <div className="space-y-2">
                    <h2
                      className="text-2xl font-bold"
                      style={{ color: colors.textPrimary }}
                    >
                      Multiplayer
                    </h2>
                    <p
                      className="text-sm"
                      style={{ color: colors.textMuted }}
                    >
                      Challenge a friend in a 1v1 battle
                    </p>
                  </div>
                  <AnimatedButton
                    variant="secondary"
                    size="md"
                    className="mt-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push('/multiplayer');
                    }}
                  >
                    Find Match
                  </AnimatedButton>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>

          {/* How to Play */}
          <motion.div variants={itemVariants} className="text-center">
            <AnimatedButton
              variant="ghost"
              size="sm"
              leftIcon={<HelpCircle className="w-4 h-4" />}
              onClick={() => {
                router.push('/play');
              }}
            >
              How to Play
            </AnimatedButton>
          </motion.div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="absolute bottom-6 text-center"
        >
          <p className="text-sm" style={{ color: colors.textMuted }}>
            Made with semantic similarity
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
