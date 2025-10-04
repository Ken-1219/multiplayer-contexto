"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { HelpCircle, ChevronDown, ChevronUp, Eye, Lightbulb, RotateCcw, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { GameService, type GameState } from "@/lib/game"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"

interface GameProps {
  className?: string
}

export default function Game({ className }: GameProps) {
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

  return (
    <div className={cn("min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950", className)}>
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.15)_1px,transparent_0)] bg-[size:20px_20px] opacity-20" />

      {/* Main Container - Full width with centered content */}
      <div className="relative min-h-screen w-full flex items-center justify-center p-4">
        <div className="w-full max-w-2xl mx-auto space-y-8">

          {/* Header Section */}
          <header className="text-center space-y-8">
            {/* Brand Title */}
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3">
                <Sparkles className="h-8 w-8 text-emerald-400" />
                <h1 className="text-6xl font-black bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent tracking-tight">
                  CONTEXTO
                </h1>
                <Sparkles className="h-8 w-8 text-cyan-400" />
              </div>
              <p className="text-slate-400 text-lg font-medium">Discover words through context and similarity</p>
            </div>

            {/* Game Stats */}
            <div className="flex items-center justify-center gap-8 text-slate-300">
              <div className="flex items-center gap-3 px-6 py-3 rounded-md bg-slate-800/50 border border-slate-700/50">
                <span className="text-sm font-medium text-slate-400">GAME</span>
                <span className="text-lg font-bold text-emerald-400">#{gameState.gameNumber}</span>
              </div>
              <div className="flex items-center gap-3 px-6 py-3 rounded-md bg-slate-800/50 border border-slate-700/50">
                <span className="text-sm font-medium text-slate-400">GUESSES</span>
                <span className="text-lg font-bold text-cyan-400">{gameState.guesses.length}</span>
              </div>
            </div>

            {/* Input Section */}
            <div className="space-y-6">
              <div className="relative">
                <Input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a word..."
                  disabled={isLoading || gameState.isComplete}
                  autoFocus
                  className="w-full h-16 px-6 text-xl text-center bg-slate-800/80 border-2 border-slate-700/50 rounded-md text-white placeholder:text-slate-400 transition-all duration-300 hover:border-emerald-500/50 focus:border-emerald-400 focus:bg-slate-800 focus:shadow-lg focus:shadow-emerald-500/20"
                />
                {isLoading && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-400/30 border-t-emerald-400"></div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-4">
                <Button
                  onClick={handleGetHint}
                  variant="outline"
                  size="sm"
                  className="gap-2 px-6 py-3 rounded-md bg-slate-800/50 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 hover:border-yellow-400 transition-all duration-300"
                >
                  <Lightbulb className="h-4 w-4" />
                  Hint
                </Button>
                <Button
                  onClick={handleShowAnswer}
                  variant="outline"
                  size="sm"
                  className="gap-2 px-6 py-3 rounded-md bg-slate-800/50 border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:border-blue-400 transition-all duration-300"
                >
                  <Eye className="h-4 w-4" />
                  Reveal
                </Button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <Card className="border border-red-500/30 bg-red-900/20 backdrop-blur-sm rounded-md">
                <div className="p-6">
                  <p className="text-red-300 font-medium">{error}</p>
                </div>
              </Card>
            )}

            {/* Answer Reveal */}
            {showAnswer && (
              <Card className="border border-emerald-500/30 bg-emerald-900/20 backdrop-blur-sm rounded-md">
                <div className="p-8 text-center">
                  <h3 className="text-2xl font-bold text-emerald-300 mb-2">The Answer</h3>
                  <p className="text-3xl font-black text-emerald-200">{gameState.secretWord}</p>
                </div>
              </Card>
            )}

            {/* Hint Display */}
            {showHint && (
              <Card className="border border-yellow-500/30 bg-yellow-900/20 backdrop-blur-sm rounded-md">
                <div className="p-6 text-center">
                  <p className="text-yellow-200 font-medium">💡 {showHint}</p>
                </div>
              </Card>
            )}
          </header>

          {/* Game Complete Message */}
          {gameState.isComplete && (
            <Card className="border border-emerald-500/30 bg-emerald-900/20 backdrop-blur-sm rounded-md">
              <div className="p-10 text-center space-y-6">
                <div className="space-y-2">
                  <h2 className="text-4xl font-black text-emerald-300">
                    {gameState.isWon ? "🎉 Congratulations!" : "🎯 Game Complete!"}
                  </h2>
                  <p className="text-xl text-emerald-200">
                    {gameState.isWon
                      ? `You found "${gameState.secretWord}" in ${gameState.guesses.length} guess${gameState.guesses.length !== 1 ? "es" : ""}!`
                      : `The word was "${gameState.secretWord}"`}
                  </p>
                </div>
                <Button
                  onClick={() => {
                    gameService.resetGame()
                    setGameState(gameService.getGameState())
                    setError(null)
                    setShowAnswer(false)
                    setShowHint("")
                    setTimeout(() => inputRef.current?.focus(), 100)
                  }}
                  className="gap-2 px-8 py-4 text-lg font-bold bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white border-0 rounded-md transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/25"
                >
                  <RotateCcw className="h-5 w-5" />
                  Play Again
                </Button>
              </div>
            </Card>
          )}

          {/* Guesses List */}
          {gameState.guesses.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xl font-bold text-slate-300 text-center mb-6">Your Guesses</h3>
              {(() => {
                const sorted = gameState.guesses.slice().sort((a, b) => a.distance - b.distance)
                const maxDistance = Math.max(...sorted.map((g) => g.distance))

                return sorted.map((guess, index) => {
                  const isTopGuess = index === 0
                  const progressPercentage = Math.max(5, Math.min(95, ((maxDistance - guess.distance) / maxDistance) * 100))

                  let bgColor = "bg-slate-800/60"
                  let borderColor = "border-slate-600/50"
                  let textColor = "text-slate-300"
                  let rankColor = "text-slate-400"
                  let progressColor = "from-slate-400/20 to-transparent"

                  if (guess.distance <= 100) {
                    bgColor = "bg-gradient-to-r from-emerald-500/80 to-emerald-600/60"
                    borderColor = "border-emerald-400/60"
                    textColor = "text-white"
                    rankColor = "text-emerald-100"
                    progressColor = "from-emerald-300/40 to-transparent"
                  } else if (guess.distance <= 500) {
                    bgColor = "bg-gradient-to-r from-emerald-600/60 to-emerald-700/50"
                    borderColor = "border-emerald-500/40"
                    textColor = "text-emerald-100"
                    rankColor = "text-emerald-200"
                    progressColor = "from-emerald-400/30 to-transparent"
                  } else if (guess.distance <= 1000) {
                    bgColor = "bg-gradient-to-r from-emerald-700/50 to-emerald-800/40"
                    borderColor = "border-emerald-500/30"
                    textColor = "text-emerald-200"
                    rankColor = "text-emerald-300"
                    progressColor = "from-emerald-400/25 to-transparent"
                  } else if (guess.distance <= 3000) {
                    bgColor = "bg-gradient-to-r from-yellow-600/50 to-yellow-700/40"
                    borderColor = "border-yellow-500/30"
                    textColor = "text-yellow-200"
                    rankColor = "text-yellow-300"
                    progressColor = "from-yellow-400/20 to-transparent"
                  } else if (guess.distance <= 10000) {
                    bgColor = "bg-gradient-to-r from-orange-600/50 to-orange-700/40"
                    borderColor = "border-orange-500/30"
                    textColor = "text-orange-200"
                    rankColor = "text-orange-300"
                    progressColor = "from-orange-400/20 to-transparent"
                  } else if (guess.distance <= 30000) {
                    bgColor = "bg-gradient-to-r from-red-600/40 to-red-700/30"
                    borderColor = "border-red-500/25"
                    textColor = "text-red-200"
                    rankColor = "text-red-300"
                    progressColor = "from-red-400/15 to-transparent"
                  }

                  return (
                    <Card
                      key={`${guess.word}-${guess.timestamp}`}
                      className={cn(
                        "relative overflow-hidden border backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] rounded-md",
                        borderColor,
                        bgColor,
                        isTopGuess && "ring-2 ring-emerald-400/40 shadow-lg shadow-emerald-500/20"
                      )}
                    >
                      {/* Progress bar for close guesses */}
                      {guess.distance <= 1000 && (
                        <div
                          className={cn("absolute left-0 top-0 bottom-0 bg-gradient-to-r transition-all duration-500", progressColor)}
                          style={{ width: `${progressPercentage}%` }}
                        />
                      )}

                      {/* Content */}
                      <div className="relative z-10 p-5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {isTopGuess && (
                            <div className="w-3 h-3 rounded-full bg-emerald-300 animate-pulse shadow-sm" />
                          )}
                          <span className={cn("text-lg font-bold", textColor)}>
                            {guess.word}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn("text-sm font-bold px-4 py-2 rounded-md bg-black/30 backdrop-blur-sm", rankColor)}>
                            #{guess.distance}
                          </span>
                        </div>
                      </div>
                    </Card>
                  )
                })
              })()}
            </div>
          )}

          {/* How to Play Section */}
          <Card className="border border-slate-700/50 bg-slate-800/30 backdrop-blur-sm rounded-md">
            <div className="p-8">
              <Button
                onClick={() => setShowHowToPlay(!showHowToPlay)}
                variant="ghost"
                className="w-full flex items-center justify-between text-lg font-semibold text-slate-200 hover:text-white hover:bg-slate-700/50 transition-all duration-300 p-4 rounded-md"
              >
                <div className="flex items-center gap-3">
                  <HelpCircle className="h-5 w-5 text-cyan-400" />
                  How to Play
                </div>
                {showHowToPlay ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </Button>

              {showHowToPlay && (
                <div className="mt-8 space-y-6 text-slate-300 leading-relaxed">
                  <div className="p-6 rounded-md bg-slate-900/50 border border-slate-700/30">
                    <p className="font-semibold text-emerald-400 mb-3">🎯 Objective</p>
                    <p>Find the secret word. You have unlimited guesses.</p>
                  </div>

                  <div className="p-6 rounded-md bg-slate-900/50 border border-slate-700/30">
                    <p className="font-semibold text-cyan-400 mb-3">🤖 AI Algorithm</p>
                    <p>Words are sorted by an AI algorithm based on contextual similarity to the secret word.</p>
                  </div>

                  <div className="p-6 rounded-md bg-slate-900/50 border border-slate-700/30">
                    <p className="font-semibold text-yellow-400 mb-3">📍 Positioning</p>
                    <p>After submitting a word, you'll see its position. The secret word is number 1.</p>
                  </div>

                  <div className="p-6 rounded-md bg-slate-900/50 border border-slate-700/30">
                    <p className="font-semibold text-purple-400 mb-3">📚 Context Analysis</p>
                    <p>The algorithm analyzed thousands of texts, using word context to calculate similarity.</p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Footer */}
          <footer className="text-center space-y-6 pt-8">
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl font-black bg-gradient-to-r from-slate-400 to-slate-600 bg-clip-text text-transparent">
                contexto
              </span>
              <span className="text-2xl">⚡</span>
            </div>

            <div className="text-slate-400 text-sm">
              <p>Enhanced by AI • Powered by Context</p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  )
}
