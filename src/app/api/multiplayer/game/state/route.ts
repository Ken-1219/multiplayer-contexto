import { NextRequest, NextResponse } from 'next/server';
import { getGameState } from '@/lib/appsync-client';
import {
  type ApiResponse,
  type GameState,
  type Game,
  type GamePlayer,
  type Guess,
} from '@/types/multiplayer';

/**
 * GET /api/multiplayer/game/state?gameId=xxx
 *
 * Get full game state (game metadata, players, guesses).
 * Used for polling to get real-time updates.
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<GameState>>> {
  try {
    // Get playerId from cookie
    const playerId = request.cookies.get('playerId')?.value;

    if (!playerId) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get gameId from query params
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get('gameId');

    if (!gameId) {
      return NextResponse.json(
        { success: false, error: 'Game ID is required' },
        { status: 400 }
      );
    }

    // Fetch game state (game + players + guesses) in a single query
    const gameState = await getGameState(gameId);
    const game = gameState?.game as Game | null;
    const players = (gameState?.players || []) as GamePlayer[];
    const guesses = (gameState?.guesses || []) as Guess[];

    if (!game) {
      return NextResponse.json(
        { success: false, error: 'Game not found' },
        { status: 404 }
      );
    }

    // Verify player is in the game
    const isPlayerInGame = players.some((p) => p.playerId === playerId);
    if (!isPlayerInGame) {
      return NextResponse.json(
        { success: false, error: 'You are not in this game' },
        { status: 403 }
      );
    }

    // Sort guesses by distance (closest first)
    const sortedGuesses = [...guesses].sort((a, b) => a.distance - b.distance);

    return NextResponse.json({
      success: true,
      data: {
        game,
        players,
        guesses: sortedGuesses,
      },
    });
  } catch (error) {
    console.error('[API] Error getting game state:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get game state',
      },
      { status: 500 }
    );
  }
}
