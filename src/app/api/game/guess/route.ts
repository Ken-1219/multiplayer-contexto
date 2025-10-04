import { NextRequest, NextResponse } from 'next/server';
import { calculateWordSimilarity } from '@/lib/word-similarity';
import { getGameService } from '@/lib/game';

// Rate limiting configuration
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100');
const RATE_LIMIT_WINDOW = parseInt(
  process.env.RATE_LIMIT_WINDOW_MS || '900000'
);

// Simple in-memory rate limiting (in production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

interface GuessRequest {
  word: string;
  gameId?: string;
  sessionId?: string;
}

interface GuessResponse {
  success: boolean;
  data?: {
    word: string;
    position: number;
    similarity: number;
    isCorrect: boolean;
    gameComplete: boolean;
    totalGuesses: number;
  };
  error?: string;
  message?: string;
}

function getRealIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const real = request.headers.get('x-real-ip');
  const cfConnecting = request.headers.get('cf-connecting-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (cfConnecting) {
    return cfConnecting;
  }
  if (real) {
    return real;
  }
  return 'unknown';
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const key = ip;

  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  const current = rateLimitMap.get(key)!;

  if (now > current.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (current.count >= RATE_LIMIT_MAX) {
    return false;
  }

  current.count++;
  return true;
}

function validateWord(word: string): { valid: boolean; error?: string } {
  if (!word || typeof word !== 'string') {
    return { valid: false, error: 'Word is required and must be a string' };
  }

  const trimmed = word.trim();

  if (trimmed.length < 2) {
    return { valid: false, error: 'Word must be at least 2 characters long' };
  }

  if (trimmed.length > 50) {
    return { valid: false, error: 'Word must be less than 50 characters' };
  }

  // Allow only letters, hyphens, and apostrophes
  const validWordRegex = /^[a-zA-Z\-']+$/;
  if (!validWordRegex.test(trimmed)) {
    return {
      valid: false,
      error: 'Word can only contain letters, hyphens, and apostrophes',
    };
  }

  return { valid: true };
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<GuessResponse>> {
  try {
    // Rate limiting
    const ip = getRealIP(request);
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
        },
        { status: 429 }
      );
    }

    // Parse request body
    const body: GuessRequest = await request.json();
    const { word, gameId: _gameId, sessionId: _sessionId } = body;

    // Validate input
    const wordValidation = validateWord(word);
    if (!wordValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: wordValidation.error,
        },
        { status: 400 }
      );
    }

    const normalizedWord = word.trim().toLowerCase();

    // Get game service instance
    const gameService = getGameService();
    const currentGameState = gameService.getGameState();

    // Check if game is already complete
    if (currentGameState.isComplete) {
      return NextResponse.json(
        {
          success: false,
          error: 'Game is already complete',
          data: {
            word: normalizedWord,
            position: -1,
            similarity: 0,
            isCorrect: false,
            gameComplete: true,
            totalGuesses: currentGameState.guesses.length,
          },
        },
        { status: 400 }
      );
    }

    // Check if word was already guessed
    const existingGuess = currentGameState.guesses.find(
      (g) => g.word.toLowerCase() === normalizedWord
    );

    if (existingGuess) {
      return NextResponse.json(
        {
          success: false,
          error: 'Word already guessed',
          data: {
            word: normalizedWord,
            position: existingGuess.position,
            similarity: existingGuess.similarity,
            isCorrect:
              normalizedWord === currentGameState.secretWord.toLowerCase(),
            gameComplete: currentGameState.isComplete,
            totalGuesses: currentGameState.guesses.length,
          },
        },
        { status: 400 }
      );
    }

    // Calculate similarity using HuggingFace (if available) or fallback
    let similarity: number;
    let position: number;

    try {
      if (process.env.HUGGINGFACE_API_TOKEN && !process.env.SKIP_API_CALLS) {
        // Use HuggingFace API for real similarity calculation
        similarity = await calculateWordSimilarity(
          normalizedWord,
          currentGameState.secretWord
        );

        // Calculate position based on similarity (simplified)
        const totalVocabulary = 50000;
        position = Math.max(1, Math.floor((1 - similarity) * totalVocabulary));
      } else {
        // Use fallback similarity calculation
        const guessResult = await gameService.submitGuess(normalizedWord);
        similarity = guessResult.similarity;
        position = guessResult.position;
      }
    } catch (apiError) {
      console.error('Error calculating similarity:', apiError);

      // Fallback to game service
      const guessResult = await gameService.submitGuess(normalizedWord);
      similarity = guessResult.similarity;
      position = guessResult.position;
    }

    // Submit guess to game service
    const guessResult = await gameService.submitGuess(normalizedWord);
    const updatedGameState = gameService.getGameState();

    const isCorrect =
      normalizedWord === currentGameState.secretWord.toLowerCase();

    // Prepare response
    const responseData = {
      word: normalizedWord,
      position: guessResult.position,
      similarity: guessResult.similarity,
      isCorrect,
      gameComplete: updatedGameState.isComplete,
      totalGuesses: updatedGameState.guesses.length,
    };

    // Log guess for analytics (optional)
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `Guess: "${normalizedWord}" -> Position: ${position}, Similarity: ${(similarity * 100).toFixed(2)}%`
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: responseData,
        message: isCorrect
          ? '🎉 Congratulations! You found the secret word!'
          : `Position #${position} (${(similarity * 100).toFixed(1)}% similar)`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error processing guess:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error. Please try again.',
      },
      { status: 500 }
    );
  }
}

export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    const gameService = getGameService();
    const gameState = gameService.getGameState();
    const stats = gameService.getStats();

    return NextResponse.json(
      {
        success: true,
        data: {
          gameNumber: gameState.gameNumber,
          totalGuesses: gameState.guesses.length,
          isComplete: gameState.isComplete,
          isWon: gameState.isWon,
          guesses: gameState.guesses.map((guess) => ({
            word: guess.word,
            position: guess.position,
            similarity: guess.similarity,
            timestamp: guess.timestamp,
          })),
          stats: {
            elapsedTime: stats.elapsedTime,
            bestGuess: stats.bestGuess,
          },
          // Only show secret word in development or when game is complete
          ...(gameState.isComplete || process.env.NODE_ENV === 'development'
            ? { secretWord: gameState.secretWord }
            : {}),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error getting game state:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get game state',
      },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function PUT(): Promise<NextResponse> {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function DELETE(): Promise<NextResponse> {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' },
    { status: 405 }
  );
}
