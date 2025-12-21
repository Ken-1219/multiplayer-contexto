import { NextRequest, NextResponse } from 'next/server';
import {
  getGameState,
  endGame,
} from '@/lib/appsync-client';
import {
  type ApiResponse,
  type Game,
  type GamePlayer,
} from '@/types/multiplayer';

/**
 * POST /api/multiplayer/game/leave
 *
 * Leave a game. If game is active, opponent wins by default.
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<{ left: boolean }>>> {
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
    const { gameId } = body;

    if (!gameId) {
      return NextResponse.json(
        { success: false, error: 'Game ID is required' },
        { status: 400 }
      );
    }

    // Get game state
    const gameState = await getGameState(gameId);
    const game = gameState?.game as Game | null;
    const players = (gameState?.players || []) as GamePlayer[];

    if (!game) {
      return NextResponse.json(
        { success: false, error: 'Game not found' },
        { status: 404 }
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

    // Handle based on game status
    if (game.status === 'WAITING') {
      // Game hasn't started - just mark as abandoned if host leaves
      if (game.hostPlayerId === playerId) {
        await endGame(gameId, null, 'ABANDONED');
      }
      // If non-host leaves, they're just removed (handled by frontend)
    } else if (game.status === 'ACTIVE') {
      // Game is active - opponent wins by default
      const opponent = players.find((p) => p.playerId !== playerId);
      const winnerId = opponent?.playerId || null;

      await endGame(gameId, winnerId, 'COMPLETED');
    }
    // If game is already completed/abandoned, do nothing

    return NextResponse.json({
      success: true,
      data: { left: true },
    });
  } catch (error) {
    console.error('[API] Error leaving game:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to leave game',
      },
      { status: 500 }
    );
  }
}
