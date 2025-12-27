import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import {
  getGameState,
  submitGuess,
  updateTurn,
  endGame,
} from '@/lib/appsync-client';
import { validateWord } from '@/lib/word-validation';
import { calculateSimilarityWithRank } from '@/lib/enhanced-similarity';
import {
  type ApiResponse,
  type GuessResult,
  type Game,
  type GamePlayer,
} from '@/types/multiplayer';

/**
 * POST /api/multiplayer/game/guess
 *
 * Submit a word guess during gameplay.
 * Validates turn, processes guess, updates game state.
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<GuessResult>>> {
  try {
    // Get playerId from cookie
    const playerId = request.cookies.get('playerId')?.value;

    if (!playerId) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Parse input
    const body = await request.json();
    const { gameId, word } = body;

    if (!gameId) {
      return NextResponse.json(
        { success: false, error: 'Game ID is required' },
        { status: 400 }
      );
    }

    if (!word || typeof word !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Word is required' },
        { status: 400 }
      );
    }

    const normalizedWord = word.trim().toLowerCase();

    if (normalizedWord.length < 1) {
      return NextResponse.json(
        { success: false, error: 'Word cannot be empty' },
        { status: 400 }
      );
    }

    // Get game state
    const gameStateResult = await getGameState(gameId);
    const game = gameStateResult?.game as Game | null;
    const players = (gameStateResult?.players || []) as GamePlayer[];

    if (!game) {
      return NextResponse.json(
        { success: false, error: 'Game not found' },
        { status: 404 }
      );
    }

    // Verify game is active
    if (game.status !== 'ACTIVE') {
      return NextResponse.json(
        { success: false, error: 'Game is not active' },
        { status: 400 }
      );
    }

    // Verify player is in game
    const player = players.find((p) => p.playerId === playerId);
    if (!player) {
      return NextResponse.json(
        { success: false, error: 'You are not in this game' },
        { status: 403 }
      );
    }

    // Verify it's the player's turn
    if (game.currentTurnPlayerId !== playerId) {
      return NextResponse.json(
        { success: false, error: 'It is not your turn' },
        { status: 400 }
      );
    }

    // Validate the word
    console.log(`[Multiplayer] Validating word: "${normalizedWord}"`);
    const validation = await validateWord(normalizedWord);

    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.error || "Word doesn't exist in English dictionary" },
        { status: 400 }
      );
    }

    // Get target word lemma
    const targetValidation = await validateWord(game.secretWord);
    const targetLemma = targetValidation.lemma || game.secretWord;

    // Check if guess is correct
    const isCorrect: boolean =
      normalizedWord === game.secretWord.toLowerCase() ||
      (validation.lemma !== undefined && validation.lemma.toLowerCase() === game.secretWord.toLowerCase()) ||
      (validation.lemma !== undefined && validation.lemma.toLowerCase() === targetLemma.toLowerCase());

    let distance = 0;
    let similarity = 1.0;

    if (!isCorrect) {
      // Calculate similarity
      try {
        const similarityResult = await calculateSimilarityWithRank(
          normalizedWord,
          game.secretWord,
          targetLemma
        );
        distance = similarityResult.distance;
        similarity = similarityResult.similarity;
      } catch (error) {
        console.error('[Multiplayer] Similarity calculation error:', error);
        // Fallback
        distance = Math.floor(Math.random() * 5000) + 1000;
        similarity = 0.5;
      }
    }

    // Create guess entry
    const guessId = uuidv4();
    const guess = await submitGuess({
      gameId,
      guessId,
      playerId,
      playerNickname: player.nickname,
      word: normalizedWord,
      distance,
      similarity,
      isCorrect,
      turnNumber: game.turnNumber,
    });

    if (!guess) {
      return NextResponse.json(
        { success: false, error: 'Failed to submit guess' },
        { status: 500 }
      );
    }

    // Determine next state
    let gameStatus: 'WAITING' | 'ACTIVE' | 'COMPLETED' | 'ABANDONED' = game.status as 'WAITING' | 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
    let winnerId: string | null = null;
    let nextTurnPlayerId: string | null = null;
    let turnStartedAt: number | null = null;

    if (isCorrect) {
      // Player wins!
      gameStatus = 'COMPLETED';
      winnerId = playerId;

      await endGame(gameId, winnerId, 'COMPLETED');
    } else {
      // Switch turn to next player
      const currentPlayerIndex = players.findIndex((p) => p.playerId === playerId);
      const nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
      nextTurnPlayerId = players[nextPlayerIndex].playerId;

      // Capture turnStartedAt to return to client for timer sync
      turnStartedAt = Date.now();
      await updateTurn(gameId, nextTurnPlayerId, game.turnNumber + 1, turnStartedAt);
    }

    return NextResponse.json({
      success: true,
      data: {
        success: true,
        guess: {
          gameId,
          guessId,
          playerId,
          playerNickname: player.nickname,
          word: normalizedWord,
          distance,
          similarity,
          isCorrect,
          turnNumber: game.turnNumber,
          timestamp: Date.now(),
        },
        isCorrect,
        gameStatus,
        winnerId,
        nextTurnPlayerId,
        turnStartedAt,
      },
    });
  } catch (error) {
    console.error('[API] Error submitting guess:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit guess',
      },
      { status: 500 }
    );
  }
}
