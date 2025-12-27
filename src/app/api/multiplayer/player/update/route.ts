import { NextRequest, NextResponse } from 'next/server';
import { updatePlayer, updateGamePlayer } from '@/lib/appsync-client';
import {
  validateNickname,
  type ApiResponse,
  type Player,
} from '@/types/multiplayer';

/**
 * PATCH /api/multiplayer/player/update
 *
 * Update current player's profile (nickname and/or avatar color).
 * If player is in an active game, also updates their GamePlayer record for real-time sync.
 */
export async function PATCH(
  request: NextRequest
): Promise<NextResponse<ApiResponse<Player>>> {
  try {
    // Get playerId from cookie
    const playerId = request.cookies.get('playerId')?.value;

    if (!playerId) {
      return NextResponse.json(
        { success: false, error: 'Not logged in' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { nickname, avatarColor, gameId } = body;

    // Validate that at least one field is being updated
    if (!nickname && !avatarColor) {
      return NextResponse.json(
        { success: false, error: 'Nothing to update' },
        { status: 400 }
      );
    }

    // Validate nickname if provided
    if (nickname) {
      const validation = validateNickname(nickname);
      if (!validation.valid) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        );
      }
    }

    // Build updates object
    const updates: { nickname?: string; avatarColor?: string } = {};
    if (nickname) updates.nickname = nickname.trim();
    if (avatarColor) updates.avatarColor = avatarColor;

    // Update player profile in DynamoDB
    const player = await updatePlayer(playerId, updates);

    if (!player) {
      return NextResponse.json(
        { success: false, error: 'Failed to update player' },
        { status: 500 }
      );
    }

    // If player is in an active game, also update their GamePlayer record
    if (gameId) {
      try {
        await updateGamePlayer(gameId, playerId, updates);
      } catch (e) {
        // Log but don't fail - game player update is best-effort
        console.warn('[API] Failed to update game player:', e);
      }
    }

    return NextResponse.json({
      success: true,
      data: player as Player,
    });
  } catch (error) {
    console.error('[API] Error updating player:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update player',
      },
      { status: 500 }
    );
  }
}
