import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createPlayer } from '@/lib/appsync-client';
import {
  validateNickname,
  getRandomAvatarColor,
  type ApiResponse,
  type Player,
} from '@/types/multiplayer';

/**
 * POST /api/multiplayer/player/create
 *
 * Create a new player with nickname and optional avatar color.
 * Sets a playerId cookie for session management.
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<Player>>> {
  try {
    const body = await request.json();
    const { nickname, avatarColor } = body;

    // Validate nickname
    if (!nickname || typeof nickname !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Nickname is required' },
        { status: 400 }
      );
    }

    const validation = validateNickname(nickname);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    // Generate player ID and avatar color
    const playerId = uuidv4();
    const finalAvatarColor = avatarColor || getRandomAvatarColor();
    const trimmedNickname = nickname.trim();

    // Create player in DynamoDB via AppSync
    const player = await createPlayer(playerId, trimmedNickname, finalAvatarColor);

    if (!player) {
      return NextResponse.json(
        { success: false, error: 'Failed to create player' },
        { status: 500 }
      );
    }

    // Create response with cookie
    const response = NextResponse.json({
      success: true,
      data: player as Player,
    });

    // Set playerId cookie (httpOnly for security, 30 days expiry)
    response.cookies.set('playerId', playerId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[API] Error creating player:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create player',
      },
      { status: 500 }
    );
  }
}
