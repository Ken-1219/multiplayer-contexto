"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { HelpCircle, ChevronDown, Eye, Lightbulb, RotateCcw, Sparkles, Home } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { GameService, type GameState } from "@/lib/game"
import { useTheme } from "@/contexts/ThemeContext"
import ThemeToggle from "@/components/ui/ThemeToggle"
import GlassCard from "@/components/ui/GlassCard"
import GuessItem from "@/components/ui/GuessItem"
import AnimatedButton from "@/components/ui/AnimatedButton"
import AnimatedInput from "@/components/ui/AnimatedInput"

interface GameProps {
  className?: string
}

export default function Game({ className }: GameProps) {
  const router = useRouter()
  const { colors } = useTheme()
  const [gameService] = useState(() => new GameService())
  const [gameState, setGameState] = useState<GameState>(gameService.getGameState())
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showHowToPlay, setShowHowToPlay] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)
  const [showHint, setShowHint] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setGameState(gameService.getGameState())
  }, [gameService])

  // Keep input always focused
  useEffect(() => {
    const focusInput = () => {
      if (inputRef.current && !gameState.isComplete) {
        inputRef.current.focus()
      }
    }

    focusInput()

    const handleClick = () => {
      setTimeout(focusInput, 10)
    }

    document.addEventListener("click", handleClick)
    return () => document.removeEventListener("click", handleClick)
  }, [gameState.isComplete])

  const handleGuess = async () => {
    if (!inputValue.trim() || isLoading) return

    setIsLoading(true)
    setError(null)

    try {
      await gameService.submitGuess(inputValue.trim())
      setGameState(gameService.getGameState())
      setInputValue("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleGuess()
    }
  }

  const handleShowAnswer = () => {
    setShowAnswer(true)
  }

  const handleGetHint = () => {
    try {
      const hint = gameService.getHint()
      setShowHint(hint)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No more hints available")
    }
  }

  const sortedGuesses = gameState.guesses.slice().sort((a, b) => a.distance - b.distance)
  const maxDistance = Math.max(...sortedGuesses.map((g) => g.distance), 1)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn("min-h-screen w-full", className)}
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
      <div className="relative min-h-screen w-full flex items-center justify-center p-4">
        <div className="w-full max-w-2xl mx-auto space-y-6">

          {/* Header with Theme Toggle and Home */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
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

          {/* Header Section */}
          <motion.header
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center space-y-6"
          >
            {/* Brand Title */}
            <div className="space-y-3">
              <motion.div
                className="flex items-center justify-center gap-3"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
              >
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                >
                  <Sparkles className="h-7 w-7" style={{ color: colors.primary }} />
                </motion.div>
                <h1
                  className="text-5xl md:text-6xl font-black tracking-tight bg-clip-text text-transparent"
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
                  <Sparkles className="h-7 w-7" style={{ color: colors.accent }} />
                </motion.div>
              </motion.div>
              <p style={{ color: colors.textMuted }} className="text-base font-medium">
                Discover words through context and similarity
              </p>
            </div>

            {/* Game Stats */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center justify-center gap-4"
            >
              <GlassCard hover={false} className="px-5 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium" style={{ color: colors.textMuted }}>GAME</span>
                  <span className="text-base font-bold" style={{ color: colors.primary }}>#{gameState.gameNumber}</span>
                </div>
              </GlassCard>
              <GlassCard hover={false} className="px-5 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium" style={{ color: colors.textMuted }}>GUESSES</span>
                  <span className="text-base font-bold" style={{ color: colors.accent }}>{gameState.guesses.length}</span>
                </div>
              </GlassCard>
            </motion.div>
          </motion.header>

          {/* Input Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-4"
          >
            <AnimatedInput
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a word..."
              disabled={isLoading || gameState.isComplete}
              isLoading={isLoading}
              autoFocus
            />

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-3">
              <AnimatedButton
                onClick={handleGetHint}
                variant="outline"
                size="sm"
                leftIcon={<Lightbulb className="h-4 w-4" />}
                style={{
                  borderColor: colors.warning,
                  color: colors.warning,
                }}
              >
                Hint
              </AnimatedButton>
              <AnimatedButton
                onClick={handleShowAnswer}
                variant="outline"
                size="sm"
                leftIcon={<Eye className="h-4 w-4" />}
              >
                Reveal
              </AnimatedButton>
            </div>
          </motion.div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -10, height: 0 }}
              >
                <GlassCard className="p-4" style={{ backgroundColor: colors.errorBg, borderColor: colors.error }}>
                  <p className="text-center font-medium" style={{ color: colors.error }}>{error}</p>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Answer Reveal */}
          <AnimatePresence>
            {showAnswer && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <GlassCard glow className="p-6 text-center">
                  <h3 className="text-lg font-bold mb-2" style={{ color: colors.textSecondary }}>The Answer</h3>
                  <p className="text-2xl font-black" style={{ color: colors.primary }}>{gameState.secretWord}</p>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hint Display */}
          <AnimatePresence>
            {showHint && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <GlassCard className="p-4 text-center" style={{ backgroundColor: colors.warningBg, borderColor: `${colors.warning}40` }}>
                  <p className="font-medium" style={{ color: colors.warning }}>💡 {showHint}</p>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Game Complete Message */}
          <AnimatePresence>
            {gameState.isComplete && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
              >
                <GlassCard glow className="p-8 text-center space-y-5">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.2 }}
                    className="space-y-2"
                  >
                    <h2 className="text-3xl font-black" style={{ color: colors.primary }}>
                      {gameState.isWon ? "🎉 Congratulations!" : "🎯 Game Complete!"}
                    </h2>
                    <p className="text-lg" style={{ color: colors.textSecondary }}>
                      {gameState.isWon
                        ? `You found "${gameState.secretWord}" in ${gameState.guesses.length} guess${gameState.guesses.length !== 1 ? "es" : ""}!`
                        : `The word was "${gameState.secretWord}"`}
                    </p>
                  </motion.div>
                  <AnimatedButton
                    onClick={() => {
                      gameService.resetGame()
                      setGameState(gameService.getGameState())
                      setError(null)
                      setShowAnswer(false)
                      setShowHint("")
                      setTimeout(() => inputRef.current?.focus(), 100)
                    }}
                    variant="primary"
                    size="lg"
                    glow
                    leftIcon={<RotateCcw className="h-5 w-5" />}
                  >
                    Play Again
                  </AnimatedButton>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Guesses List */}
          <AnimatePresence>
            {sortedGuesses.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-3"
              >
                <h3
                  className="text-lg font-bold text-center"
                  style={{ color: colors.textSecondary }}
                >
                  Your Guesses
                </h3>
                <div className="space-y-2">
                  {sortedGuesses.map((guess, index) => (
                    <GuessItem
                      key={`${guess.word}-${guess.timestamp}`}
                      word={guess.word}
                      distance={guess.distance}
                      isTopGuess={index === 0}
                      index={index}
                      maxDistance={maxDistance}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* How to Play Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <GlassCard className="overflow-hidden">
              <motion.button
                onClick={() => setShowHowToPlay(!showHowToPlay)}
                className="w-full flex items-center justify-between p-5 transition-all duration-300"
                whileHover={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
              >
                <div className="flex items-center gap-3">
                  <HelpCircle className="h-5 w-5" style={{ color: colors.primary }} />
                  <span className="text-base font-semibold" style={{ color: colors.textPrimary }}>
                    How to Play
                  </span>
                </div>
                <motion.div
                  animate={{ rotate: showHowToPlay ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="h-5 w-5" style={{ color: colors.textMuted }} />
                </motion.div>
              </motion.button>

              <AnimatePresence>
                {showHowToPlay && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 space-y-3">
                      {[
                        { icon: "🎯", title: "Objective", desc: "Find the secret word. You have unlimited guesses.", color: colors.primary },
                        { icon: "🤖", title: "AI Algorithm", desc: "Words are sorted by an AI algorithm based on contextual similarity to the secret word.", color: colors.accent },
                        { icon: "📍", title: "Positioning", desc: "After submitting a word, you'll see its position. The secret word is number 1.", color: colors.warning },
                        { icon: "📚", title: "Context Analysis", desc: "The algorithm analyzed thousands of texts, using word context to calculate similarity.", color: "#a78bfa" },
                      ].map((item, index) => (
                        <motion.div
                          key={item.title}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="p-4 rounded-lg"
                          style={{ backgroundColor: 'rgba(0,0,0,0.2)', border: `1px solid ${colors.cardBorder}` }}
                        >
                          <p className="font-semibold mb-1" style={{ color: item.color }}>
                            {item.icon} {item.title}
                          </p>
                          <p className="text-sm" style={{ color: colors.textMuted }}>{item.desc}</p>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </GlassCard>
          </motion.div>

          {/* Footer */}
          <motion.footer
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center py-6 space-y-2"
          >
            <div className="flex items-center justify-center gap-2">
              <span
                className="text-xl font-black bg-clip-text text-transparent"
                style={{
                  backgroundImage: `linear-gradient(135deg, ${colors.textMuted}, ${colors.primary})`,
                }}
              >
                contexto
              </span>
              <span className="text-xl">⚡</span>
            </div>
            <p className="text-xs" style={{ color: colors.textMuted }}>
              Enhanced by AI • Powered by Context
            </p>
          </motion.footer>
        </div>
      </div>
    </motion.div>
  )
}
