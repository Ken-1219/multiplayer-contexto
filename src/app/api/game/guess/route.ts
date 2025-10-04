import { NextRequest, NextResponse } from 'next/server';
import { validateWord } from '@/lib/word-validation';
import { calculateSimilarityWithRank } from '@/lib/enhanced-similarity';
import { DAILY_WORDS } from '@/lib/game-service';

// Rate limiting configuration
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100');
const RATE_LIMIT_WINDOW = parseInt(
  process.env.RATE_LIMIT_WINDOW_MS || '900000'
);

// Simple in-memory rate limiting (in production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

interface GuessRequest {
  word: string;
  gameNumber?: number;
  sessionId?: string;
}

interface GuessResponse {
  success: boolean;
  data?: {
    word: string;
    lemma: string;
    distance: number;
    similarity: number;
    isCorrect: boolean;
  };
  error?: string;
  message?: string;
}

/**
 * Get the target word for a given game number
 */
function getTargetWord(gameNumber: number): string {
  const index = (gameNumber - 1) % DAILY_WORDS.length;
  return DAILY_WORDS[index];
}

/**
 * Get current game number based on date
 */
function getCurrentGameNumber(): number {
  const today = new Date();
  const startDate = new Date('2024-01-01');
  const diffTime = Math.abs(today.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
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
    const { word, gameNumber: requestedGameNumber } = body;

    if (!word) {
      return NextResponse.json(
        {
          success: false,
          error: 'Word is required',
        },
        { status: 400 }
      );
    }

    const normalizedWord = word.trim().toLowerCase();

    // Validate the word first
    console.log(`Validating word: "${normalizedWord}"`);
    const validation = await validateWord(normalizedWord);

    if (!validation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error || "Word doesn't exist in English dictionary",
        },
        { status: 400 }
      );
    }

    // Get the target word for the game
    const gameNumber = requestedGameNumber || getCurrentGameNumber();
    const targetWord = getTargetWord(gameNumber);

    // Get the lemma of the target word (not the guess word!)
    const targetValidation = await validateWord(targetWord);
    const targetLemma = targetValidation.lemma || targetWord;

    console.log(
      `Game #${gameNumber}: Target word is "${targetWord}" (lemma: "${targetLemma}")`
    );
    console.log(`Guess: "${normalizedWord}" (lemma: "${validation.lemma}")`);

    // Check if the guess is correct (compare with both target word and its lemma)
    const isCorrect =
      normalizedWord === targetWord.toLowerCase() ||
      (validation.lemma &&
        validation.lemma.toLowerCase() === targetWord.toLowerCase()) ||
      (validation.lemma &&
        validation.lemma.toLowerCase() === targetLemma.toLowerCase());

    if (isCorrect) {
      // Correct answer - distance 0
      return NextResponse.json(
        {
          success: true,
          data: {
            word: normalizedWord,
            lemma: validation.lemma || normalizedWord,
            distance: 0,
            similarity: 1.0,
            isCorrect: true,
          },
          message: '🎉 Congratulations! You found the secret word!',
        },
        { status: 200 }
      );
    }

    // Calculate semantic similarity and rank distance
    console.log(
      `Calculating similarity between "${normalizedWord}" and "${targetWord}"`
    );

    try {
      const similarityResult = await calculateSimilarityWithRank(
        normalizedWord,
        targetWord,
        targetLemma
      );

      console.log(
        `Similarity result: distance=${similarityResult.distance}, similarity=${(similarityResult.similarity * 100).toFixed(2)}%`
      );

      return NextResponse.json(
        {
          success: true,
          data: {
            word: normalizedWord,
            lemma: validation.lemma || normalizedWord,
            distance: similarityResult.distance,
            similarity: similarityResult.similarity,
            isCorrect: false,
          },
          message: `Position #${similarityResult.distance} (${(similarityResult.similarity * 100).toFixed(1)}% similar)`,
        },
        { status: 200 }
      );
    } catch (similarityError) {
      console.error('Error calculating similarity:', similarityError);

      // Fallback: calculate a simple distance based on string similarity
      const fallbackSimilarity = calculateFallbackSimilarity(
        normalizedWord,
        targetWord
      );
      const fallbackDistance = Math.floor((1 - fallbackSimilarity) * 10000);

      return NextResponse.json(
        {
          success: true,
          data: {
            word: normalizedWord,
            lemma: validation.lemma || normalizedWord,
            distance: Math.max(1, fallbackDistance),
            similarity: fallbackSimilarity,
            isCorrect: false,
          },
          message: `Position #${Math.max(1, fallbackDistance)} (${(fallbackSimilarity * 100).toFixed(1)}% similar - fallback)`,
        },
        { status: 200 }
      );
    }
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

/**
 * Simple fallback similarity calculation using string similarity
 */
function calculateFallbackSimilarity(word1: string, word2: string): number {
  if (word1 === word2) return 1.0;

  // Levenshtein distance-based similarity
  const maxLength = Math.max(word1.length, word2.length);
  const distance = levenshteinDistance(word1, word2);
  const similarity = 1 - distance / maxLength;

  // Add some randomness to simulate semantic similarity
  const semanticBonus = Math.random() * 0.2;
  return Math.max(0.1, Math.min(0.9, similarity + semanticBonus));
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const gameNumber =
      parseInt(url.searchParams.get('gameNumber') || '0') ||
      getCurrentGameNumber();
    const targetWord = getTargetWord(gameNumber);

    return NextResponse.json(
      {
        success: true,
        data: {
          gameNumber,
          targetWord:
            process.env.NODE_ENV === 'development' ? targetWord : undefined,
          totalWords: DAILY_WORDS.length,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error getting game info:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get game info',
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
