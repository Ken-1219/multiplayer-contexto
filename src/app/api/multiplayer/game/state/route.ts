import { NextRequest, NextResponse } from 'next/server';
import { getGameState, updatePlayerConnection, endGame } from '@/lib/appsync-client';
import {
  type ApiResponse,
  type GameState,
  type Game,
  type GamePlayer,
  type Guess,
} from '@/types/multiplayer';

// Constants for connection timeout and game TTL
const DISCONNECT_TIMEOUT = 10000;     // 10 seconds
const WAITING_GAME_TTL = 15 * 60000;  // 15 minutes

/**
 * GET /api/multiplayer/game/state?gameId=xxx
 *
 * Get full game state (game metadata, players, guesses).
 * Used for polling to get real-time updates.
 */
export async function GET(
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

    // Get gameId from query params
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get('gameId');

    if (!gameId) {
      return NextResponse.json(
        { success: false, error: 'Game ID is required' },
        { status: 400 }
      );
    }

    // Fetch game state (game + players + guesses) in a single query
    const gameState = await getGameState(gameId);
    const game = gameState?.game as Game | null;
    const players = (gameState?.players || []) as GamePlayer[];
    const guesses = (gameState?.guesses || []) as Guess[];

    if (!game) {
      return NextResponse.json(
        { success: false, error: 'Game not found' },
        { status: 404 }
      );
    }

    // Check if WAITING game has expired
    if (game.status === 'WAITING') {
      const gameAge = Date.now() - (game.createdAt || 0);
      if (gameAge > WAITING_GAME_TTL) {
        // Game expired - mark as abandoned
        try {
          await endGame(gameId, null, 'ABANDONED');
          console.log(`[API] Game ${gameId} expired after ${Math.round(gameAge / 60000)} minutes`);
        } catch (e) {
          console.error('[API] Failed to mark expired game as abandoned:', e);
        }
        return NextResponse.json(
          { success: false, error: 'Game expired due to inactivity' },
          { status: 410 } // 410 Gone
        );
      }
    }

    // Check for disconnected players based on lastActiveAt
    const now = Date.now();
    const updatedPlayers = await Promise.all(
      players.map(async (player) => {
        const lastActive = player.lastActiveAt || 0;
        const isDisconnected = now - lastActive > DISCONNECT_TIMEOUT;

        // Update connection status if changed
        if (isDisconnected && player.isConnected) {
          try {
            await updatePlayerConnection(gameId, player.playerId, false);
            console.log(`[API] Player ${player.playerId} marked as disconnected (inactive for ${Math.round((now - lastActive) / 1000)}s)`);
            return { ...player, isConnected: false };
          } catch (e) {
            console.error('[API] Failed to update player connection status:', e);
          }
        }

        return player;
      })
    );

    // Verify requesting player is in the game
    const isPlayerInGame = updatedPlayers.some((p) => p.playerId === playerId);
    if (!isPlayerInGame) {
      return NextResponse.json(
        { success: false, error: 'You are not in this game' },
        { status: 403 }
      );
    }

    // Sort guesses by distance (closest first)
    const sortedGuesses = [...guesses].sort((a, b) => a.distance - b.distance);

    return NextResponse.json({
      success: true,
      data: {
        game,
        players: updatedPlayers,
        guesses: sortedGuesses,
      },
    });
  } catch (error) {
    console.error('[API] Error getting game state:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get game state',
      },
      { status: 500 }
    );
  }
}
