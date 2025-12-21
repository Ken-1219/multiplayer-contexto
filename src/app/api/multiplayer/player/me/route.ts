import { NextRequest, NextResponse } from 'next/server';
import { getPlayer } from '@/lib/appsync-client';
import { type ApiResponse, type Player } from '@/types/multiplayer';

/**
 * GET /api/multiplayer/player/me
 *
 * Get current player from cookie.
 * Returns null if no player cookie exists.
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<Player | null>>> {
  try {
    // Get playerId from cookie
    const playerId = request.cookies.get('playerId')?.value;

    if (!playerId) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    // Fetch player from DynamoDB via AppSync
    const player = await getPlayer(playerId);

    if (!player) {
      // Player cookie exists but player not found in DB
      // Clear the invalid cookie
      const response = NextResponse.json({
        success: true,
        data: null,
      });

      response.cookies.delete('playerId');
      return response;
    }

    return NextResponse.json({
      success: true,
      data: player as Player,
    });
  } catch (error) {
    console.error('[API] Error getting player:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get player',
      },
      { status: 500 }
    );
  }
}
