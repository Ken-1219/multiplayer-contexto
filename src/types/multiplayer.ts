/**
 * Multiplayer Types
 *
 * TypeScript interfaces for all multiplayer entities.
 * These types are shared between API routes and frontend components.
 */

// ============================================================================
// ENUMS
// ============================================================================

export type GameMode = 'COMPETITIVE' | 'RACE' | 'COOPERATIVE';

export type GameStatus = 'WAITING' | 'ACTIVE' | 'COMPLETED' | 'ABANDONED';

export type PlayerStatus = 'ONLINE' | 'OFFLINE' | 'IN_GAME';

// ============================================================================
// PLAYER TYPES
// ============================================================================

/**
 * Player profile (stored in PLAYER#<id> / PROFILE)
 */
export interface Player {
  playerId: string;
  nickname: string;
  avatarColor: string;
  totalGames: number;
  totalWins: number;
  status?: PlayerStatus;
  currentGameId?: string | null;
  createdAt: number;
  lastActiveAt?: number;
}

/**
 * Player within a game (stored in GAME#<id> / PLAYER#<playerId>)
 */
export interface GamePlayer {
  gameId: string;
  playerId: string;
  nickname: string;
  avatarColor: string;
  joinOrder: number;
  isReady: boolean;
  isHost: boolean;
  isConnected: boolean;
  score: number;
  guessCount: number;
  foundWord: boolean;
  foundAt: number | null;
  joinedAt: number;
  lastActiveAt: number;
}

// ============================================================================
// GAME TYPES
// ============================================================================

/**
 * Game metadata (stored in GAME#<id> / METADATA)
 */
export interface Game {
  gameId: string;
  roomCode: string;
  secretWord: string;
  gameMode: GameMode;
  status: GameStatus;
  currentTurnPlayerId: string | null;
  turnNumber: number;
  turnStartedAt: number | null;
  turnDuration: number;
  maxPlayers: number;
  isPublic: boolean;
  hostPlayerId: string;
  winnerId: string | null;
  playerCount: number;
  createdAt: number;
  startedAt: number | null;
  endedAt: number | null;
}

/**
 * Full game state (game + players + guesses)
 */
export interface GameState {
  game: Game;
  players: GamePlayer[];
  guesses: Guess[];
}

/**
 * Game list item (for lobby display)
 */
export interface GameListItem {
  gameId: string;
  roomCode: string;
  gameMode: GameMode;
  hostNickname: string;
  playerCount: number;
  maxPlayers: number;
  createdAt: number;
}

// ============================================================================
// GUESS TYPES
// ============================================================================

/**
 * A guess in a game (stored in GAME#<id> / GUESS#<timestamp>#<guessId>)
 */
export interface Guess {
  gameId: string;
  guessId: string;
  playerId: string;
  playerNickname: string;
  word: string;
  distance: number;
  similarity: number;
  isCorrect: boolean;
  turnNumber: number;
  timestamp: number;
}

/**
 * Result of submitting a guess
 */
export interface GuessResult {
  success: boolean;
  guess: Guess | null;
  isCorrect: boolean;
  gameStatus: GameStatus;
  winnerId: string | null;
  nextTurnPlayerId: string | null;
  error?: string;
}

// ============================================================================
// API TYPES
// ============================================================================

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Create game input
 */
export interface CreateGameInput {
  gameMode: GameMode;
  maxPlayers: number;
  turnDuration: number;
  isPublic: boolean;
}

/**
 * Create game response
 */
export interface CreateGameResponse {
  gameId: string;
  roomCode: string;
  gameMode: GameMode;
  status: GameStatus;
  maxPlayers: number;
  isPublic: boolean;
}

/**
 * Join game input
 */
export interface JoinGameInput {
  roomCode: string;
}

/**
 * Join game response
 */
export interface JoinGameResponse {
  gameId: string;
  roomCode: string;
  gameMode: GameMode;
  players: GamePlayer[];
}

/**
 * Submit guess input
 */
export interface SubmitGuessInput {
  gameId: string;
  word: string;
}

/**
 * Set ready input
 */
export interface SetReadyInput {
  gameId: string;
  isReady: boolean;
}

/**
 * Start game input
 */
export interface StartGameInput {
  gameId: string;
}

/**
 * Leave game input
 */
export interface LeaveGameInput {
  gameId: string;
}

// ============================================================================
// CONTEXT TYPES
// ============================================================================

/**
 * Multiplayer context state
 */
export interface MultiplayerState {
  player: Player | null;
  gameState: GameState | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Multiplayer context actions
 */
export interface MultiplayerActions {
  createPlayer: (nickname: string, avatarColor?: string) => Promise<void>;
  createGame: (options: CreateGameInput) => Promise<string>;
  joinGame: (roomCode: string) => Promise<void>;
  leaveGame: () => Promise<void>;
  setReady: (isReady: boolean) => Promise<void>;
  startGame: () => Promise<void>;
  submitGuess: (word: string) => Promise<GuessResult>;
  refreshGameState: () => Promise<void>;
  handleTimeout: () => Promise<void>;
  clearError: () => void;
}

/**
 * Full multiplayer context type
 */
export interface MultiplayerContextType extends MultiplayerState, MultiplayerActions {}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Avatar color options
 */
export const AVATAR_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#eab308', // yellow
  '#84cc16', // lime
  '#22c55e', // green
  '#10b981', // emerald
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#0ea5e9', // sky
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#d946ef', // fuchsia
  '#ec4899', // pink
] as const;

export type AvatarColor = (typeof AVATAR_COLORS)[number];

/**
 * Turn duration options (in seconds)
 */
export const TURN_DURATION_OPTIONS = [30, 60, 90] as const;

export type TurnDuration = (typeof TURN_DURATION_OPTIONS)[number];

/**
 * Max players options
 */
export const MAX_PLAYERS_OPTIONS = {
  COMPETITIVE: [2] as const,
  RACE: [2, 3, 4] as const,
  COOPERATIVE: [2, 3, 4] as const,
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a random avatar color
 */
export function getRandomAvatarColor(): AvatarColor {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

/**
 * Generate a room code (6 uppercase alphanumeric characters)
 */
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Validate nickname
 */
export function validateNickname(nickname: string): { valid: boolean; error?: string } {
  const trimmed = nickname.trim();

  if (trimmed.length < 2) {
    return { valid: false, error: 'Nickname must be at least 2 characters' };
  }

  if (trimmed.length > 20) {
    return { valid: false, error: 'Nickname must be 20 characters or less' };
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return { valid: false, error: 'Nickname can only contain letters, numbers, underscores, and hyphens' };
  }

  return { valid: true };
}

/**
 * Validate room code
 */
export function validateRoomCode(roomCode: string): { valid: boolean; error?: string } {
  const trimmed = roomCode.trim().toUpperCase();

  if (trimmed.length !== 6) {
    return { valid: false, error: 'Room code must be 6 characters' };
  }

  if (!/^[A-Z0-9]+$/.test(trimmed)) {
    return { valid: false, error: 'Invalid room code format' };
  }

  return { valid: true };
}

/**
 * Format timestamp to relative time
 */
export function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/**
 * Format seconds to mm:ss
 */
export function formatTimer(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
