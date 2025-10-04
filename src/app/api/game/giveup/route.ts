import { NextRequest, NextResponse } from 'next/server';
import { DAILY_WORDS } from '@/lib/game-service';

interface GiveUpResponse {
  success: boolean;
  data?: {
    word: string;
    lemma: string;
    distance: 0;
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

export async function POST(
  request: NextRequest
): Promise<NextResponse<GiveUpResponse>> {
  try {
    // Parse request body to get game number if provided
    const body = await request.json().catch(() => ({}));
    const gameNumber = body.gameNumber || getCurrentGameNumber();

    // Get the target word for the game
    const targetWord = getTargetWord(gameNumber);

    console.log(`Game #${gameNumber}: Revealing word "${targetWord}"`);

    return NextResponse.json(
      {
        success: true,
        data: {
          word: targetWord,
          lemma: targetWord, // In this case, the word is the lemma
          distance: 0,
        },
        message: `The word was: ${targetWord}`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error revealing word:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to reveal word',
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<GiveUpResponse>> {
  try {
    const url = new URL(request.url);
    const gameNumber =
      parseInt(url.searchParams.get('gameNumber') || '0') ||
      getCurrentGameNumber();

    // Get the target word for the game
    const targetWord = getTargetWord(gameNumber);

    console.log(`Game #${gameNumber}: Revealing word "${targetWord}"`);

    return NextResponse.json(
      {
        success: true,
        data: {
          word: targetWord,
          lemma: targetWord, // In this case, the word is the lemma
          distance: 0,
        },
        message: `The word was: ${targetWord}`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error revealing word:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to reveal word',
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
