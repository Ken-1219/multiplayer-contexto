import { NextRequest, NextResponse } from 'next/server';
import {
  getGameByRoomCode,
  getGamePlayers,
  joinGame,
  getPlayer,
} from '@/lib/appsync-client';
import {
  validateRoomCode,
  type ApiResponse,
  type JoinGameResponse,
  type Game,
  type GamePlayer,
} from '@/types/multiplayer';

/**
 * POST /api/multiplayer/game/join
 *
 * Join an existing game by room code.
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<JoinGameResponse>>> {
  try {
    // Get playerId from cookie
    const playerId = request.cookies.get('playerId')?.value;

    if (!playerId) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated. Please create a player first.' },
        { status: 401 }
      );
    }

    // Get player profile
    const player = await getPlayer(playerId);
    if (!player) {
      return NextResponse.json(
        { success: false, error: 'Player not found. Please create a player first.' },
        { status: 404 }
      );
    }

    // Parse and validate input
    const body = await request.json();
    const { roomCode } = body;

    if (!roomCode) {
      return NextResponse.json(
        { success: false, error: 'Room code is required' },
        { status: 400 }
      );
    }

    // Validate room code format
    const validation = validateRoomCode(roomCode);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const normalizedRoomCode = roomCode.trim().toUpperCase();

    // Find game by room code
    const game = await getGameByRoomCode(normalizedRoomCode) as Game | null;

    if (!game) {
      return NextResponse.json(
        { success: false, error: 'Game not found. Please check the room code.' },
        { status: 404 }
      );
    }

    // Check game status
    if (game.status !== 'WAITING') {
      return NextResponse.json(
        { success: false, error: 'This game has already started or ended.' },
        { status: 400 }
      );
    }

    // Get current players
    const players = await getGamePlayers(game.gameId) as GamePlayer[];

    // Check if player is already in game
    const existingPlayer = players.find((p) => p.playerId === playerId);
    if (existingPlayer) {
      return NextResponse.json(
        { success: false, error: 'You are already in this game.' },
        { status: 400 }
      );
    }

    // Check if game is full
    if (players.length >= game.maxPlayers) {
      return NextResponse.json(
        { success: false, error: 'This game is full.' },
        { status: 400 }
      );
    }

    // Join the game
    const typedPlayer = player as { nickname: string; avatarColor: string };
    const joinOrder = players.length + 1;

    const newPlayer = await joinGame({
      gameId: game.gameId,
      playerId,
      nickname: typedPlayer.nickname,
      avatarColor: typedPlayer.avatarColor,
      joinOrder,
    });

    if (!newPlayer) {
      return NextResponse.json(
        { success: false, error: 'Failed to join game' },
        { status: 500 }
      );
    }

    // Get updated players list
    const updatedPlayers = await getGamePlayers(game.gameId) as GamePlayer[];

    return NextResponse.json({
      success: true,
      data: {
        gameId: game.gameId,
        roomCode: game.roomCode,
        gameMode: game.gameMode,
        players: updatedPlayers,
      },
    });
  } catch (error) {
    console.error('[API] Error joining game:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to join game',
      },
      { status: 500 }
    );
  }
}
