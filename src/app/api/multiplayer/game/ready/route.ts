import { NextRequest, NextResponse } from 'next/server';
import {
  getGameState,
  setPlayerReady,
} from '@/lib/appsync-client';
import {
  type ApiResponse,
  type GamePlayer,
  type Game,
} from '@/types/multiplayer';

/**
 * POST /api/multiplayer/game/ready
 *
 * Toggle player ready status in lobby.
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<GamePlayer>>> {
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
    const { gameId, isReady } = body;

    if (!gameId) {
      return NextResponse.json(
        { success: false, error: 'Game ID is required' },
        { status: 400 }
      );
    }

    if (typeof isReady !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'isReady must be a boolean' },
        { status: 400 }
      );
    }

    // Get game state to verify status
    const gameStateResult = await getGameState(gameId);
    const game = gameStateResult?.game as Game | null;
    const players = (gameStateResult?.players || []) as GamePlayer[];

    if (!game) {
      return NextResponse.json(
        { success: false, error: 'Game not found' },
        { status: 404 }
      );
    }

    if (game.status !== 'WAITING') {
      return NextResponse.json(
        { success: false, error: 'Cannot change ready status after game has started' },
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

    // Update ready status
    const updatedPlayer = await setPlayerReady(gameId, playerId, isReady);

    if (!updatedPlayer) {
      return NextResponse.json(
        { success: false, error: 'Failed to update ready status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...player,
        isReady,
      } as GamePlayer,
    });
  } catch (error) {
    console.error('[API] Error setting ready status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to set ready status',
      },
      { status: 500 }
    );
  }
}
