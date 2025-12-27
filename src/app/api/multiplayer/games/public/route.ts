import { NextRequest, NextResponse } from 'next/server';
import { listPublicGames } from '@/lib/appsync-client';
import { type ApiResponse, type GameListItem } from '@/types/multiplayer';

/**
 * GET /api/multiplayer/games/public
 *
 * List public games that are waiting for players.
 * No authentication required.
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<GameListItem[]>>> {
  try {
    // Get optional limit from query params (default 10)
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // Validate limit
    const validLimit = Math.min(Math.max(1, limit), 50);

    // Fetch public games from AppSync
    const games = await listPublicGames(validLimit);

    return NextResponse.json({
      success: true,
      data: games || [],
    });
  } catch (error) {
    console.error('[API] Error listing public games:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list public games',
      },
      { status: 500 }
    );
  }
}
