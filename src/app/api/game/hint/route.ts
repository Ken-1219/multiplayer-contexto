import { NextRequest, NextResponse } from 'next/server';
import { getGameService } from '@/lib/game';

// Rate limiting configuration for hints (more restrictive than guesses)
const HINT_RATE_LIMIT_MAX = 10; // Max 10 hint requests per window
const HINT_RATE_LIMIT_WINDOW = 300000; // 5 minutes

// Simple in-memory rate limiting for hints
const hintRateLimitMap = new Map<
  string,
  { count: number; resetTime: number }
>();

interface HintRequest {
  gameId?: string;
  sessionId?: string;
}

interface HintResponse {
  success: boolean;
  data?: {
    hint: string;
    hintsUsed: number;
    hintsRemaining: number;
    gameNumber: number;
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

function checkHintRateLimit(ip: string): boolean {
  const now = Date.now();
  const key = `hint_${ip}`;

  if (!hintRateLimitMap.has(key)) {
    hintRateLimitMap.set(key, {
      count: 1,
      resetTime: now + HINT_RATE_LIMIT_WINDOW,
    });
    return true;
  }

  const current = hintRateLimitMap.get(key)!;

  if (now > current.resetTime) {
    hintRateLimitMap.set(key, {
      count: 1,
      resetTime: now + HINT_RATE_LIMIT_WINDOW,
    });
    return true;
  }

  if (current.count >= HINT_RATE_LIMIT_MAX) {
    return false;
  }

  current.count++;
  return true;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<HintResponse>> {
  try {
    // Check if hints are enabled
    if (process.env.ENABLE_HINTS !== 'true') {
      return NextResponse.json(
        {
          success: false,
          error: 'Hints are disabled for this game',
        },
        { status: 403 }
      );
    }

    // Rate limiting for hints
    const ip = getRealIP(request);
    if (!checkHintRateLimit(ip)) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Too many hint requests. Please wait before requesting another hint.',
        },
        { status: 429 }
      );
    }

    // Parse request body
    let body: HintRequest = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is acceptable for hint requests
    }

    const { gameId: _gameId, sessionId: _sessionId } = body;

    // Get game service instance
    const gameService = getGameService();
    const currentGameState = gameService.getGameState();

    // Check if game is complete
    if (currentGameState.isComplete) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot request hints for a completed game',
          data: {
            hint: '',
            hintsUsed: 0,
            hintsRemaining: 0,
            gameNumber: currentGameState.gameNumber,
          },
        },
        { status: 400 }
      );
    }

    // Count existing hints (assuming hints are tracked as special guesses or separately)
    const existingHints = currentGameState.guesses.filter((g) =>
      g.word.startsWith('hint:')
    ).length;

    const maxHints = 3; // Maximum hints per game
    const hintsRemaining = maxHints - existingHints;

    if (hintsRemaining <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Maximum number of hints reached for this game',
          data: {
            hint: '',
            hintsUsed: existingHints,
            hintsRemaining: 0,
            gameNumber: currentGameState.gameNumber,
          },
        },
        { status: 400 }
      );
    }

    // Generate hint based on the secret word
    let hint: string;
    const secretWord = currentGameState.secretWord;

    try {
      // Get hint from game service
      hint = gameService.getHint();
    } catch {
      // Fallback hint generation
      const hintTypes = [
        `The word has ${secretWord.length} letters`,
        `The word starts with the letter "${secretWord[0].toUpperCase()}"`,
        `The word ends with the letter "${secretWord[secretWord.length - 1].toUpperCase()}"`,
        `The word contains the letter "${secretWord[Math.floor(secretWord.length / 2)].toUpperCase()}"`,
      ];

      hint = hintTypes[existingHints] || 'No more hints available';
    }

    // Track the hint as a special guess (optional)
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `Hint requested for game #${currentGameState.gameNumber}: "${hint}"`
      );
    }

    const responseData = {
      hint,
      hintsUsed: existingHints + 1,
      hintsRemaining: hintsRemaining - 1,
      gameNumber: currentGameState.gameNumber,
    };

    return NextResponse.json(
      {
        success: true,
        data: responseData,
        message: `Hint ${existingHints + 1}/${maxHints}`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error processing hint request:', error);

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
    // Get available hints information without consuming a hint
    const gameService = getGameService();
    const currentGameState = gameService.getGameState();

    const existingHints = currentGameState.guesses.filter((g) =>
      g.word.startsWith('hint:')
    ).length;

    const maxHints = 3;
    const hintsRemaining = maxHints - existingHints;

    return NextResponse.json(
      {
        success: true,
        data: {
          hintsEnabled: process.env.ENABLE_HINTS === 'true',
          hintsUsed: existingHints,
          hintsRemaining,
          maxHints,
          gameNumber: currentGameState.gameNumber,
          gameComplete: currentGameState.isComplete,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error getting hint information:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get hint information',
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
