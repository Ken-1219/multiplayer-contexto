/**
 * AppSync GraphQL Client (Server-side only)
 *
 * This client is used by API routes to communicate with AWS AppSync.
 * It uses API Key authentication and should NEVER be imported in client components.
 */

import type { GameListItem } from '@/types/multiplayer';

// Environment variables (server-side only - no NEXT_PUBLIC_ prefix)
const APPSYNC_API_URL = process.env.APPSYNC_API_URL!;
const APPSYNC_API_KEY = process.env.APPSYNC_API_KEY!;

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    path?: string[];
    errorType?: string;
  }>;
}

interface AppSyncClientOptions {
  logRequests?: boolean;
}

const defaultOptions: AppSyncClientOptions = {
  logRequests: process.env.NODE_ENV === 'development',
};

/**
 * Execute a GraphQL query or mutation against AppSync
 */
export async function executeGraphQL<T = unknown>(
  query: string,
  variables?: Record<string, unknown>,
  options: AppSyncClientOptions = {}
): Promise<T> {
  const { logRequests } = { ...defaultOptions, ...options };

  if (!APPSYNC_API_URL || !APPSYNC_API_KEY) {
    throw new Error('AppSync configuration missing. Check APPSYNC_API_URL and APPSYNC_API_KEY env variables.');
  }

  const body = JSON.stringify({
    query,
    variables,
  });

  if (logRequests) {
    console.log('[AppSync] Request:', {
      url: APPSYNC_API_URL,
      variables,
      query: query.substring(0, 100) + '...',
    });
  }

  try {
    const response = await fetch(APPSYNC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': APPSYNC_API_KEY,
      },
      body,
    });

    if (!response.ok) {
      throw new Error(`AppSync HTTP error: ${response.status} ${response.statusText}`);
    }

    const result: GraphQLResponse<T> = await response.json();

    if (logRequests) {
      console.log('[AppSync] Response:', {
        hasData: !!result.data,
        hasErrors: !!result.errors,
      });
    }

    if (result.errors && result.errors.length > 0) {
      const errorMessage = result.errors.map((e) => e.message).join(', ');
      console.error('[AppSync] GraphQL errors:', result.errors);
      throw new Error(`GraphQL error: ${errorMessage}`);
    }

    if (!result.data) {
      throw new Error('No data returned from AppSync');
    }

    return result.data;
  } catch (error) {
    console.error('[AppSync] Request failed:', error);
    throw error;
  }
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get complete game state (game + players + guesses) in a single query
 */
export async function getGameState(gameId: string) {
  const query = `
    query GetGameState($gameId: ID!) {
      getGameState(gameId: $gameId) {
        game {
          gameId
          roomCode
          secretWord
          gameMode
          status
          currentTurnPlayerId
          turnNumber
          turnDuration
          turnStartedAt
          maxPlayers
          isPublic
          hostPlayerId
          winnerId
          playerCount
          createdAt
          startedAt
          endedAt
        }
        players {
          gameId
          playerId
          nickname
          avatarColor
          joinOrder
          isReady
          isHost
          isConnected
          score
          guessCount
          foundWord
          lastActiveAt
        }
        guesses {
          gameId
          guessId
          playerId
          playerNickname
          word
          distance
          similarity
          isCorrect
          turnNumber
          timestamp
        }
      }
    }
  `;

  const result = await executeGraphQL<{ getGameState: { game: unknown; players: unknown[]; guesses: unknown[] } }>(query, { gameId });
  return result.getGameState;
}

/**
 * Get a game by room code
 */
export async function getGameByRoomCode(roomCode: string) {
  const query = `
    query GetGameByRoomCode($roomCode: String!) {
      getGameByRoomCode(roomCode: $roomCode) {
        gameId
        roomCode
        gameMode
        status
        currentTurnPlayerId
        turnNumber
        turnDuration
        maxPlayers
        isPublic
        hostPlayerId
        winnerId
        playerCount
        createdAt
        startedAt
        endedAt
      }
    }
  `;

  const result = await executeGraphQL<{ getGameByRoomCode: unknown }>(query, { roomCode });
  return result.getGameByRoomCode;
}


/**
 * Get a player by ID
 */
export async function getPlayer(playerId: string) {
  const query = `
    query GetPlayer($playerId: ID!) {
      getPlayer(playerId: $playerId) {
        playerId
        nickname
        avatarColor
        totalGames
        totalWins
        createdAt
      }
    }
  `;

  const result = await executeGraphQL<{ getPlayer: unknown }>(query, { playerId });
  return result.getPlayer;
}

/**
 * List public waiting games
 */
export async function listPublicGames(limit: number = 10) {
  const query = `
    query ListPublicGames($limit: Int) {
      listPublicGames(limit: $limit) {
        gameId
        roomCode
        gameMode
        hostNickname
        playerCount
        maxPlayers
        createdAt
      }
    }
  `;

  const result = await executeGraphQL<{ listPublicGames: GameListItem[] }>(query, { limit });
  return result.listPublicGames;
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new player
 */
export async function createPlayer(
  playerId: string,
  nickname: string,
  avatarColor: string
) {
  const mutation = `
    mutation CreatePlayer($playerId: ID!, $nickname: String!, $avatarColor: String!) {
      createPlayer(playerId: $playerId, nickname: $nickname, avatarColor: $avatarColor) {
        playerId
        nickname
        avatarColor
        totalGames
        totalWins
        createdAt
      }
    }
  `;

  const result = await executeGraphQL<{ createPlayer: unknown }>(mutation, {
    playerId,
    nickname,
    avatarColor,
  });
  return result.createPlayer;
}

/**
 * Update an existing player's profile (nickname and/or avatar color)
 */
export async function updatePlayer(
  playerId: string,
  updates: { nickname?: string; avatarColor?: string }
) {
  const mutation = `
    mutation UpdatePlayer($playerId: ID!, $nickname: String, $avatarColor: String) {
      updatePlayer(playerId: $playerId, nickname: $nickname, avatarColor: $avatarColor) {
        playerId
        nickname
        avatarColor
        totalGames
        totalWins
        createdAt
      }
    }
  `;

  const result = await executeGraphQL<{ updatePlayer: unknown }>(mutation, {
    playerId,
    nickname: updates.nickname,
    avatarColor: updates.avatarColor,
  });
  return result.updatePlayer;
}

/**
 * Update a player's info within a game (for real-time sync)
 */
export async function updateGamePlayer(
  gameId: string,
  playerId: string,
  updates: { nickname?: string; avatarColor?: string }
) {
  const mutation = `
    mutation UpdateGamePlayer($gameId: ID!, $playerId: ID!, $nickname: String, $avatarColor: String) {
      updateGamePlayer(gameId: $gameId, playerId: $playerId, nickname: $nickname, avatarColor: $avatarColor) {
        gameId
        playerId
        nickname
        avatarColor
        joinOrder
        isReady
        isHost
        isConnected
        score
        guessCount
        foundWord
        lastActiveAt
      }
    }
  `;

  const result = await executeGraphQL<{ updateGamePlayer: unknown }>(mutation, {
    gameId,
    playerId,
    nickname: updates.nickname,
    avatarColor: updates.avatarColor,
  });
  return result.updateGamePlayer;
}

/**
 * Create a new game
 */
export async function createGame(params: {
  gameId: string;
  roomCode: string;
  gameMode: string;
  turnDuration: number;
  hostNickname: string;
  maxPlayers: number;
  isPublic: boolean;
  hostPlayerId: string;
  secretWord: string;
}) {
  const mutation = `
    mutation CreateGame(
      $gameId: ID!
      $roomCode: String!
      $gameMode: String!
      $turnDuration: Int!
      $hostNickname: String!
      $maxPlayers: Int!
      $isPublic: Boolean!
      $hostPlayerId: ID!
      $secretWord: String!
    ) {
      createGame(
        gameId: $gameId
        roomCode: $roomCode
        gameMode: $gameMode
        turnDuration: $turnDuration
        hostNickname: $hostNickname
        maxPlayers: $maxPlayers
        isPublic: $isPublic
        hostPlayerId: $hostPlayerId
        secretWord: $secretWord
      ) {
        gameId
        roomCode
        gameMode
        status
        maxPlayers
        isPublic
        hostPlayerId
        createdAt
      }
    }
  `;

  const result = await executeGraphQL<{ createGame: unknown }>(mutation, params);
  return result.createGame;
}

/**
 * Join a game
 */
export async function joinGame(params: {
  gameId: string;
  playerId: string;
  nickname: string;
  avatarColor: string;
  joinOrder: number;
}) {
  const mutation = `
    mutation JoinGame(
      $gameId: ID!
      $playerId: ID!
      $nickname: String!
      $avatarColor: String!
      $joinOrder: Int!
    ) {
      joinGame(
        gameId: $gameId
        playerId: $playerId
        nickname: $nickname
        avatarColor: $avatarColor
        joinOrder: $joinOrder
      ) {
        gameId
        playerId
        nickname
        avatarColor
        joinOrder
        isReady
        isHost
        isConnected
      }
    }
  `;

  const result = await executeGraphQL<{ joinGame: unknown }>(mutation, params);
  return result.joinGame;
}

/**
 * Set player ready status
 */
export async function setPlayerReady(
  gameId: string,
  playerId: string,
  isReady: boolean
) {
  const mutation = `
    mutation SetPlayerReady($gameId: ID!, $playerId: ID!, $isReady: Boolean!) {
      setPlayerReady(gameId: $gameId, playerId: $playerId, isReady: $isReady) {
        gameId
        playerId
        isReady
      }
    }
  `;

  const result = await executeGraphQL<{ setPlayerReady: unknown }>(mutation, {
    gameId,
    playerId,
    isReady,
  });
  return result.setPlayerReady;
}

/**
 * Start a game
 */
export async function startGame(gameId: string, currentTurnPlayerId: string) {
  const mutation = `
    mutation StartGame($gameId: ID!, $currentTurnPlayerId: ID!) {
      startGame(gameId: $gameId, currentTurnPlayerId: $currentTurnPlayerId) {
        gameId
        status
        currentTurnPlayerId
        turnNumber
        turnStartedAt
        startedAt
      }
    }
  `;

  const result = await executeGraphQL<{ startGame: unknown }>(mutation, {
    gameId,
    currentTurnPlayerId,
  });
  return result.startGame;
}

/**
 * Submit a guess
 */
export async function submitGuess(params: {
  gameId: string;
  guessId: string;
  playerId: string;
  playerNickname: string;
  word: string;
  distance: number;
  similarity: number;
  isCorrect: boolean;
  turnNumber: number;
}) {
  const mutation = `
    mutation SubmitGuess(
      $gameId: ID!
      $guessId: ID!
      $playerId: ID!
      $playerNickname: String!
      $word: String!
      $distance: Int!
      $similarity: Float!
      $isCorrect: Boolean!
      $turnNumber: Int!
    ) {
      submitGuess(
        gameId: $gameId
        guessId: $guessId
        playerId: $playerId
        playerNickname: $playerNickname
        word: $word
        distance: $distance
        similarity: $similarity
        isCorrect: $isCorrect
        turnNumber: $turnNumber
      ) {
        gameId
        guessId
        playerId
        word
        distance
        similarity
        isCorrect
        turnNumber
        timestamp
      }
    }
  `;

  const result = await executeGraphQL<{ submitGuess: unknown }>(mutation, params);
  return result.submitGuess;
}

/**
 * Update game turn
 */
export async function updateTurn(
  gameId: string,
  currentTurnPlayerId: string,
  turnNumber: number,
  turnStartedAt?: number
) {
  const mutation = `
    mutation UpdateTurn($gameId: ID!, $currentTurnPlayerId: ID!, $turnNumber: Int!, $turnStartedAt: AWSTimestamp!) {
      updateTurn(gameId: $gameId, currentTurnPlayerId: $currentTurnPlayerId, turnNumber: $turnNumber, turnStartedAt: $turnStartedAt) {
        gameId
        currentTurnPlayerId
        turnNumber
        turnStartedAt
      }
    }
  `;

  const result = await executeGraphQL<{ updateTurn: unknown }>(mutation, {
    gameId,
    currentTurnPlayerId,
    turnNumber,
    turnStartedAt: turnStartedAt || Date.now(),
  });
  return result.updateTurn;
}

/**
 * End a game
 */
export async function endGame(
  gameId: string,
  winnerId: string | null,
  status: string
) {
  const mutation = `
    mutation EndGame($gameId: ID!, $winnerId: ID, $status: String!) {
      endGame(gameId: $gameId, winnerId: $winnerId, status: $status) {
        gameId
        status
        winnerId
        endedAt
      }
    }
  `;

  const result = await executeGraphQL<{ endGame: unknown }>(mutation, {
    gameId,
    winnerId,
    status,
  });
  return result.endGame;
}

/**
 * Update player connection status and lastActiveAt
 */
export async function updatePlayerConnection(
  gameId: string,
  playerId: string,
  isConnected: boolean
) {
  const mutation = `
    mutation UpdatePlayerConnection($gameId: ID!, $playerId: ID!, $isConnected: Boolean!, $lastActiveAt: AWSTimestamp!) {
      updatePlayerConnection(gameId: $gameId, playerId: $playerId, isConnected: $isConnected, lastActiveAt: $lastActiveAt) {
        gameId
        playerId
        isConnected
        lastActiveAt
      }
    }
  `;

  const result = await executeGraphQL<{ updatePlayerConnection: unknown }>(mutation, {
    gameId,
    playerId,
    isConnected,
    lastActiveAt: Date.now(),
  });
  return result.updatePlayerConnection;
}

/**
 * Update player's lastActiveAt timestamp (heartbeat)
 */
export async function updatePlayerHeartbeat(
  gameId: string,
  playerId: string
) {
  const mutation = `
    mutation UpdatePlayerConnection($gameId: ID!, $playerId: ID!, $isConnected: Boolean!, $lastActiveAt: AWSTimestamp!) {
      updatePlayerConnection(gameId: $gameId, playerId: $playerId, isConnected: $isConnected, lastActiveAt: $lastActiveAt) {
        gameId
        playerId
        lastActiveAt
      }
    }
  `;

  const result = await executeGraphQL<{ updatePlayerConnection: unknown }>(mutation, {
    gameId,
    playerId,
    isConnected: true,
    lastActiveAt: Date.now(),
  });
  return result.updatePlayerConnection;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get full game state (game + players + guesses)
 * This is now an alias for getGameState which returns everything in a single query
 */
export async function getFullGameState(gameId: string) {
  return getGameState(gameId);
}
