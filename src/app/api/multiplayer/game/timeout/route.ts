import { NextRequest, NextResponse } from 'next/server';
import {
  getGameState,
  updateTurn,
} from '@/lib/appsync-client';
import {
  type ApiResponse,
  type Game,
  type GamePlayer,
} from '@/types/multiplayer';

/**
 * POST /api/multiplayer/game/timeout
 *
 * Called when a player's turn timer expires.
 * Auto-skips to the next player's turn.
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<{ nextTurnPlayerId: string; turnNumber: number }>>> {
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

    // Verify game is active
    if (game.status !== 'ACTIVE') {
      return NextResponse.json(
        { success: false, error: 'Game is not active' },
        { status: 400 }
      );
    }

    // Verify it's the caller's turn (only the current player can timeout their own turn)
    // Or allow anyone in the game to report timeout (for robustness)
    const isPlayerInGame = players.some(p => p.playerId === playerId);

    if (!isPlayerInGame) {
      return NextResponse.json(
        { success: false, error: 'You are not in this game' },
        { status: 403 }
      );
    }

    // Verify turn has actually timed out (with some buffer)
    const turnStartedAt = game.turnStartedAt || Date.now();
    const elapsed = (Date.now() - turnStartedAt) / 1000;
    const buffer = 5; // 5 second buffer for network latency

    if (elapsed < game.turnDuration - buffer) {
      return NextResponse.json(
        { success: false, error: 'Turn has not timed out yet' },
        { status: 400 }
      );
    }

    // Find next player
    const currentPlayerIndex = players.findIndex(p => p.playerId === game.currentTurnPlayerId);
    const nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
    const nextTurnPlayerId = players[nextPlayerIndex].playerId;
    const newTurnNumber = game.turnNumber + 1;

    // Update turn with new turnStartedAt to sync timer
    await updateTurn(gameId, nextTurnPlayerId, newTurnNumber, Date.now());

    return NextResponse.json({
      success: true,
      data: {
        nextTurnPlayerId,
        turnNumber: newTurnNumber,
      },
    });
  } catch (error) {
    console.error('[API] Error handling timeout:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to handle timeout',
      },
      { status: 500 }
    );
  }
}
