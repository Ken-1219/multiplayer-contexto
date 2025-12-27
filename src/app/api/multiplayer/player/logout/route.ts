import { NextResponse } from 'next/server';
import { type ApiResponse } from '@/types/multiplayer';

/**
 * POST /api/multiplayer/player/logout
 *
 * Logout the current player by clearing the playerId cookie.
 * Player data remains in database for potential future use.
 */
export async function POST(): Promise<NextResponse<ApiResponse<null>>> {
  try {
    // Create response
    const response = NextResponse.json({
      success: true,
      data: null,
    });

    // Clear the playerId cookie
    response.cookies.delete('playerId');

    return response;
  } catch (error) {
    console.error('[API] Error logging out:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to logout',
      },
      { status: 500 }
    );
  }
}
