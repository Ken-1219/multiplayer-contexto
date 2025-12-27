import { NextRequest, NextResponse } from 'next/server';
import { updatePlayerHeartbeat } from '@/lib/appsync-client';
import { type ApiResponse } from '@/types/multiplayer';

/**
 * POST /api/multiplayer/game/heartbeat
 *
 * Update player's lastActiveAt timestamp to indicate they're still connected.
 * Called periodically by the client during polling.
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<{ success: boolean }>>> {
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

    // Update player's lastActiveAt timestamp
    await updatePlayerHeartbeat(gameId, playerId);

    return NextResponse.json({
      success: true,
      data: { success: true },
    });
  } catch (error) {
    // Don't log heartbeat errors to reduce noise - they're expected during disconnects
    console.debug('[API] Heartbeat error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { success: false, error: 'Heartbeat failed' },
      { status: 500 }
    );
  }
}
