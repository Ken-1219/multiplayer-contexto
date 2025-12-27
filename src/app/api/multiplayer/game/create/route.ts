import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createGame, joinGame, getPlayer, updatePlayerConnection } from '@/lib/appsync-client';
import { DAILY_WORDS } from '@/lib/game-service';
import {
  generateRoomCode,
  type ApiResponse,
  type CreateGameInput,
  type CreateGameResponse,
  type GameMode,
} from '@/types/multiplayer';

// Valid game modes
const VALID_GAME_MODES: GameMode[] = ['COMPETITIVE', 'RACE', 'COOPERATIVE'];

// Valid turn durations (seconds)
const VALID_TURN_DURATIONS = [30, 60, 90];

/**
 * POST /api/multiplayer/game/create
 *
 * Create a new game room. The player becomes the host.
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<CreateGameResponse>>> {
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
    const body: CreateGameInput = await request.json();
    const { gameMode, maxPlayers, turnDuration, isPublic } = body;

    // Validate game mode
    if (!gameMode || !VALID_GAME_MODES.includes(gameMode)) {
      return NextResponse.json(
        { success: false, error: `Invalid game mode. Must be one of: ${VALID_GAME_MODES.join(', ')}` },
        { status: 400 }
      );
    }

    // For now, only COMPETITIVE mode is supported
    if (gameMode !== 'COMPETITIVE') {
      return NextResponse.json(
        { success: false, error: 'Only COMPETITIVE mode is currently supported' },
        { status: 400 }
      );
    }

    // Validate max players
    const finalMaxPlayers = maxPlayers || 2;
    if (gameMode === 'COMPETITIVE' && finalMaxPlayers !== 2) {
      return NextResponse.json(
        { success: false, error: 'Competitive mode requires exactly 2 players' },
        { status: 400 }
      );
    }

    // Validate turn duration
    const finalTurnDuration = turnDuration || 60;
    if (!VALID_TURN_DURATIONS.includes(finalTurnDuration)) {
      return NextResponse.json(
        { success: false, error: `Invalid turn duration. Must be one of: ${VALID_TURN_DURATIONS.join(', ')} seconds` },
        { status: 400 }
      );
    }

    // Generate game ID and room code
    const gameId = uuidv4();
    const roomCode = generateRoomCode();

    // Select secret word (based on game number from date)
    const gameNumber = getGameNumber();
    const secretWord = selectSecretWord(gameNumber);

    // Create game in DynamoDB via AppSync
    const game = await createGame({
      gameId,
      roomCode,
      gameMode,
      turnDuration: finalTurnDuration,
      maxPlayers: finalMaxPlayers,
      isPublic: isPublic ?? true,
      hostPlayerId: playerId,
      secretWord,
    });

    if (!game) {
      return NextResponse.json(
        { success: false, error: 'Failed to create game' },
        { status: 500 }
      );
    }

    // Add host as first player
    const typedPlayer = player as { nickname: string; avatarColor: string };
    await joinGame({
      gameId,
      playerId,
      nickname: typedPlayer.nickname,
      avatarColor: typedPlayer.avatarColor,
      joinOrder: 1,
    });

    // Set initial lastActiveAt so host isn't immediately marked as disconnected
    await updatePlayerConnection(gameId, playerId, true);

    return NextResponse.json({
      success: true,
      data: {
        gameId,
        roomCode,
        gameMode,
        status: 'WAITING',
        maxPlayers: finalMaxPlayers,
        isPublic: isPublic ?? true,
      },
    });
  } catch (error) {
    console.error('[API] Error creating game:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create game',
      },
      { status: 500 }
    );
  }
}

/**
 * Get game number based on current date
 */
function getGameNumber(): number {
  const now = new Date();
  const start = new Date('2024-01-01');
  return Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Select secret word based on game number
 */
function selectSecretWord(gameNumber: number): string {
  return DAILY_WORDS[(gameNumber - 1) % DAILY_WORDS.length];
}
