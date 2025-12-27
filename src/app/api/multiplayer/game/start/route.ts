import { NextRequest, NextResponse } from 'next/server';
import {
  getGameState,
  startGame,
} from '@/lib/appsync-client';
import {
  type ApiResponse,
  type GameState,
  type Game,
  type GamePlayer,
  type Guess,
} from '@/types/multiplayer';

/**
 * POST /api/multiplayer/game/start
 *
 * Start the game. Only the host can start, and all players must be ready.
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<GameState>>> {
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
    const gameStateResult = await getGameState(gameId);
    const game = gameStateResult?.game as Game | null;
    const players = (gameStateResult?.players || []) as GamePlayer[];
    const guesses = (gameStateResult?.guesses || []) as Guess[];

    if (!game) {
      return NextResponse.json(
        { success: false, error: 'Game not found' },
        { status: 404 }
      );
    }

    // Verify player is the host
    if (game.hostPlayerId !== playerId) {
      return NextResponse.json(
        { success: false, error: 'Only the host can start the game' },
        { status: 403 }
      );
    }

    // Verify game is in WAITING status
    if (game.status !== 'WAITING') {
      return NextResponse.json(
        { success: false, error: 'Game has already started or ended' },
        { status: 400 }
      );
    }

    // Verify minimum players (2 for competitive)
    if (players.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Need at least 2 players to start' },
        { status: 400 }
      );
    }

    // Verify all players are ready (host is always considered ready)
    const allReady = players.every((p) => p.isReady || p.playerId === game.hostPlayerId);
    if (!allReady) {
      return NextResponse.json(
        { success: false, error: 'All players must be ready to start' },
        { status: 400 }
      );
    }

    // Start the game - host goes first
    const updatedGame = await startGame(gameId, playerId);

    if (!updatedGame) {
      return NextResponse.json(
        { success: false, error: 'Failed to start game' },
        { status: 500 }
      );
    }

    // Build response
    const gameResponse = {
      ...game,
      ...updatedGame,
      status: 'ACTIVE' as const,
    };

    return NextResponse.json({
      success: true,
      data: {
        game: gameResponse as Game,
        players,
        guesses,
      },
    });
  } catch (error) {
    console.error('[API] Error starting game:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start game',
      },
      { status: 500 }
    );
  }
}
