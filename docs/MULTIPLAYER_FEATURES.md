# Contexto Multiplayer - Features & Implementation Guide

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Current Single-Player Implementation](#2-current-single-player-implementation)
3. [Multiplayer Features](#3-multiplayer-features)
4. [Single-Table DynamoDB Design](#4-single-table-dynamodb-design)
5. [GraphQL Schema](#5-graphql-schema)
6. [Server-Side API Design](#6-server-side-api-design)
7. [Frontend Integration](#7-frontend-integration)
8. [Implementation Phases](#8-implementation-phases)
9. [Free Tier Limits](#9-free-tier-limits)

---

## 1. Architecture Overview

### 1.1 Security-First Architecture

All AWS interactions happen **server-side only**. The client never directly communicates with AWS services.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    SECURE SERVER-SIDE ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐         ┌──────────────────────┐                      │
│  │   Browser    │         │     Next.js App      │                      │
│  │   (Client)   │         │   (Server + Client)  │                      │
│  └──────┬───────┘         └──────────┬───────────┘                      │
│         │                            │                                  │
│         │  HTTPS Only                │                                  │
│         │  (No AWS credentials)      │                                  │
│         │                            │                                  │
│         ▼                            ▼                                  │
│  ┌─────────────────────────────────────────────────────┐                │
│  │              Next.js API Routes                     │                │
│  │         /api/multiplayer/*                          │                │
│  │                                                     │                │
│  │  • All AWS SDK calls happen here                    │                │
│  │  • Environment variables (not NEXT_PUBLIC_)         │                │
│  │  • Session validation                               │                │
│  │  • Rate limiting                                    │                │
│  └─────────────────────┬───────────────────────────────┘                │
│                        │                                                │
│                        │ Server-side only                               │
│                        │ (AWS credentials never exposed)                │
│                        ▼                                                │
│         ┌──────────────────────────────────────┐                        │
│         │         AWS Services                 │                        │
│         │                                      │                        │
│         │  ┌────────────────────────────────┐  │                        │
│         │  │  AWS AppSync (GraphQL API)     │  │                        │
│         │  │  - Real-time subscriptions     │  │                        │
│         │  │  - Managed WebSocket           │  │                        │
│         │  └────────────────────────────────┘  │                        │
│         │               │                      │                        │
│         │               ▼                      │                        │
│         │  ┌────────────────────────────────┐  │                        │
│         │  │  DynamoDB (Single Table)       │  │                        │
│         │  │  - All game data               │  │                        │
│         │  │  - Free tier: 25GB, 25 WCU/RCU │  │                        │
│         │  └────────────────────────────────┘  │                        │
│         │                                      │                        │
│         └──────────────────────────────────────┘                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Why Server-Side Only?

| Concern | Solution |
|---------|----------|
| AWS credentials exposure | Credentials only in server environment variables |
| Direct DynamoDB access | All DB calls go through API routes |
| Rate limiting bypass | Server enforces all limits |
| Data validation | Server validates before database writes |
| Cost control | Server can monitor and limit usage |

### 1.3 Environment Variables

```bash
# .env.local (Server-side only - NO NEXT_PUBLIC_ prefix)

# AWS Credentials (NEVER expose to client)
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=ap-south-1

# AppSync (Server-side calls only)
APPSYNC_API_URL=https://xxx.appsync-api.ap-south-1.amazonaws.com/graphql
APPSYNC_API_KEY=da2-xxx

# DynamoDB
DYNAMODB_TABLE_NAME=contexto-multiplayer

# Existing (keep these)
HUGGINGFACE_API_TOKEN=hf_xxx

# Session secret for player identification
SESSION_SECRET=your-random-32-char-string

# Rate limiting
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000
```

---

## 2. Current Single-Player Implementation

### 2.1 Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── game/
│   │       ├── guess/route.ts      # Word guess processing
│   │       ├── hint/route.ts       # Hint generation
│   │       └── giveup/route.ts     # Reveal answer
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── Game.tsx                    # Main game UI (381 lines)
│   └── ui/                         # Reusable components
├── lib/
│   ├── game.ts                     # GameService class
│   ├── game-service.ts             # DAILY_WORDS (1176 words)
│   ├── enhanced-similarity.ts      # HuggingFace embeddings
│   ├── word-validation.ts          # Dictionary API
│   └── utils.ts
└── providers/
    └── nextui-provider.tsx
```

### 2.2 Current Game Flow

```
User loads page
    └── GameService instantiated (client-side)
        └── Game number from date
        └── Secret word from DAILY_WORDS[gameNumber % length]

User submits guess
    └── POST /api/game/guess
        ├── validateWord() - Dictionary API check
        ├── calculateSimilarityWithRank() - HuggingFace embeddings
        └── Return { distance, similarity, isCorrect }

UI updates
    └── Guess added to list, sorted by distance
```

### 2.3 Key Data Structures

```typescript
// Current GameState (client-side only)
interface GameState {
  gameNumber: number;
  secretWord: string;
  guesses: GuessResult[];
  isComplete: boolean;
  isWon: boolean;
  startTime: Date;
  endTime?: Date;
}

// GuessResult
interface GuessResult {
  word: string;
  lemma: string;
  distance: number;      // 1 = exact match, higher = further
  similarity: number;    // 0-1 cosine similarity
  timestamp: Date;
  isCorrect: boolean;
}
```

---

## 3. Multiplayer Features

### 3.1 Game Modes

#### Mode 1: Competitive (1v1)
```
┌─────────────────────────────────────────────────┐
│  COMPETITIVE MODE                               │
├─────────────────────────────────────────────────┤
│  • 2 players, same secret word                  │
│  • Alternating turns                            │
│  • See opponent's guesses in real-time          │
│  • Turn timer: 30/60/90 seconds                 │
│  • First to find word wins                      │
│  • Tiebreaker: fewer total guesses              │
└─────────────────────────────────────────────────┘
```

#### Mode 2: Race Mode
```
┌─────────────────────────────────────────────────┐
│  RACE MODE                                      │
├─────────────────────────────────────────────────┤
│  • 2-4 players, same secret word                │
│  • Simultaneous guessing (no turns)             │
│  • Can't see opponent's guesses                 │
│  • 5-minute time limit                          │
│  • First to find word wins                      │
└─────────────────────────────────────────────────┘
```

#### Mode 3: Cooperative
```
┌─────────────────────────────────────────────────┐
│  COOPERATIVE MODE                               │
├─────────────────────────────────────────────────┤
│  • 2-4 players, same secret word                │
│  • Take turns guessing                          │
│  • Shared guess list (everyone sees all)        │
│  • Work together to find word                   │
│  • Score based on total team guesses            │
└─────────────────────────────────────────────────┘
```

### 3.2 Game Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                      GAME LIFECYCLE                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. CREATE ROOM                                                 │
│     └── Player A creates game                                   │
│         └── Gets room code: "ABC123"                            │
│         └── Status: WAITING                                     │
│                                                                 │
│  2. JOIN ROOM                                                   │
│     └── Player B enters room code                               │
│         └── Joins game                                          │
│         └── Both see each other in lobby                        │
│                                                                 │
│  3. READY UP                                                    │
│     └── Both players click "Ready"                              │
│         └── Host can start when all ready                       │
│                                                                 │
│  4. GAME STARTS                                                 │
│     └── Status: ACTIVE                                          │
│     └── Secret word selected                                    │
│     └── Turn assigned to Player A                               │
│                                                                 │
│  5. GAMEPLAY LOOP                                               │
│     ┌────────────────────────────────────────────┐              │
│     │  a. Current player's turn starts           │              │
│     │  b. Timer begins (60 seconds)              │              │
│     │  c. Player submits guess                   │              │
│     │  d. Guess processed, broadcast to all      │              │
│     │  e. Check if word found                    │              │
│     │  f. If not, switch turn                    │              │
│     │  g. Repeat until word found or timeout     │              │
│     └────────────────────────────────────────────┘              │
│                                                                 │
│  6. GAME ENDS                                                   │
│     └── Status: COMPLETED                                       │
│     └── Winner determined                                       │
│     └── Final scores shown                                      │
│     └── Option to rematch                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Real-Time Features

| Feature | Implementation |
|---------|----------------|
| Opponent joins | AppSync subscription → UI updates |
| Player ready status | AppSync subscription → Ready badges |
| Turn indicator | AppSync subscription → Highlight current player |
| New guess | AppSync subscription → Add to guess list |
| Timer sync | Server timestamp → Client countdown |
| Game end | AppSync subscription → Show results |
| Disconnect | AppSync subscription → Show offline status |

### 3.4 Scoring System

```typescript
// Points calculation
function calculatePoints(distance: number, turnNumber: number): number {
  // Base points: inverse of distance
  const basePoints = Math.max(0, 10000 - distance);

  // Early find bonus: more points for finding quickly
  const turnBonus = Math.max(0, (20 - turnNumber) * 100);

  // Winner bonus
  const winnerBonus = 5000;

  return basePoints + turnBonus + (isWinner ? winnerBonus : 0);
}
```

---

## 4. Single-Table DynamoDB Design

### 4.1 Why Single Table?

| Benefit | Description |
|---------|-------------|
| Cost | One table = one set of free tier limits |
| Simplicity | One table to manage, backup, monitor |
| Performance | All data for a game in one partition |
| Transactions | Can update multiple items atomically |

### 4.2 Access Patterns

Before designing keys, identify how we'll query data:

| Access Pattern | Query |
|----------------|-------|
| Get game by ID | PK = GAME#\<gameId\> |
| Get game by room code | GSI: roomCode = ABC123 |
| Get all players in game | PK = GAME#\<gameId\>, SK begins_with PLAYER# |
| Get all guesses in game | PK = GAME#\<gameId\>, SK begins_with GUESS# |
| Get player by ID | PK = PLAYER#\<playerId\> |
| Get player's active games | GSI: playerId + status |
| List public waiting games | GSI: status = WAITING, isPublic = true |

### 4.3 Key Design

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    SINGLE TABLE KEY STRUCTURE                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  TABLE: contexto-multiplayer                                            │
│                                                                         │
│  Primary Key:                                                           │
│    PK (Partition Key): String                                           │
│    SK (Sort Key): String                                                │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  ENTITY          │  PK                │  SK                     │    │
│  ├───────────────────────────────────────────────────────────────────    │
│  │  Game Metadata   │  GAME#<gameId>     │  METADATA               │    │
│  │  Game Player     │  GAME#<gameId>     │  PLAYER#<playerId>      │    │
│  │  Game Guess      │  GAME#<gameId>     │  GUESS#<timestamp>#<id> │    │
│  │  Player Profile  │  PLAYER#<playerId> │  PROFILE                │    │
│  │  Player Game     │  PLAYER#<playerId> │  GAME#<gameId>          │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  GSI1 (Global Secondary Index):                                         │
│    GSI1PK: roomCode                                                     │
│    GSI1SK: createdAt                                                    │
│    Purpose: Find game by room code                                      │
│                                                                         │
│  GSI2 (Global Secondary Index):                                         │
│    GSI2PK: status                                                       │
│    GSI2SK: createdAt                                                    │
│    Purpose: List games by status (waiting, active)                      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.4 Item Structures

#### Game Metadata Item
```typescript
{
  PK: "GAME#abc-123-def",
  SK: "METADATA",
  entityType: "GAME",
  gameId: "abc-123-def",
  roomCode: "XYZ789",              // GSI1PK
  secretWord: "computer",
  secretWordLemma: "computer",
  gameMode: "COMPETITIVE",         // COMPETITIVE | RACE | COOPERATIVE
  status: "WAITING",               // WAITING | ACTIVE | COMPLETED | ABANDONED (GSI2PK)
  currentTurnPlayerId: null,
  turnNumber: 0,
  turnStartedAt: null,
  turnDuration: 60,                // seconds
  maxPlayers: 2,
  isPublic: true,
  hostPlayerId: "player-456",
  winnerId: null,
  gameNumber: 365,
  createdAt: 1703123456789,        // GSI1SK, GSI2SK
  startedAt: null,
  endedAt: null,

  // Denormalized for quick access
  playerCount: 1,
  playerIds: ["player-456"],
}
```

#### Game Player Item
```typescript
{
  PK: "GAME#abc-123-def",
  SK: "PLAYER#player-456",
  entityType: "GAME_PLAYER",
  gameId: "abc-123-def",
  playerId: "player-456",
  nickname: "PlayerOne",
  avatarColor: "#10b981",          // Simple color instead of image
  joinOrder: 1,
  isReady: false,
  isHost: true,
  isConnected: true,
  score: 0,
  guessCount: 0,
  foundWord: false,
  foundAt: null,
  joinedAt: 1703123456789,
  lastActiveAt: 1703123456789,
}
```

#### Game Guess Item
```typescript
{
  PK: "GAME#abc-123-def",
  SK: "GUESS#1703123456789#guess-001",  // Timestamp for sorting
  entityType: "GUESS",
  gameId: "abc-123-def",
  guessId: "guess-001",
  playerId: "player-456",
  playerNickname: "PlayerOne",     // Denormalized
  word: "keyboard",
  lemma: "keyboard",
  distance: 245,
  similarity: 0.78,
  isCorrect: false,
  turnNumber: 3,
  timestamp: 1703123456789,
  points: 0,
}
```

#### Player Profile Item
```typescript
{
  PK: "PLAYER#player-456",
  SK: "PROFILE",
  entityType: "PLAYER",
  playerId: "player-456",
  nickname: "PlayerOne",
  avatarColor: "#10b981",
  totalGames: 15,
  totalWins: 8,
  totalGuesses: 234,
  bestScore: 9500,
  currentGameId: "abc-123-def",    // null if not in game
  status: "IN_GAME",               // ONLINE | OFFLINE | IN_GAME
  createdAt: 1703000000000,
  lastActiveAt: 1703123456789,
}
```

#### Player Game Reference Item
```typescript
{
  PK: "PLAYER#player-456",
  SK: "GAME#abc-123-def",
  entityType: "PLAYER_GAME",
  playerId: "player-456",
  gameId: "abc-123-def",
  roomCode: "XYZ789",
  gameMode: "COMPETITIVE",
  status: "ACTIVE",
  score: 2500,
  won: false,
  joinedAt: 1703123456789,
  endedAt: null,
}
```

### 4.5 Query Examples

```typescript
// Get complete game state (metadata + players + guesses)
const gameData = await docClient.query({
  TableName: "contexto-multiplayer",
  KeyConditionExpression: "PK = :pk",
  ExpressionAttributeValues: {
    ":pk": `GAME#${gameId}`
  }
});

// Items returned:
// - 1 METADATA item
// - N PLAYER# items
// - M GUESS# items (sorted by timestamp due to SK)

// Find game by room code
const game = await docClient.query({
  TableName: "contexto-multiplayer",
  IndexName: "GSI1",
  KeyConditionExpression: "GSI1PK = :roomCode",
  ExpressionAttributeValues: {
    ":roomCode": "XYZ789"
  }
});

// List public waiting games
const waitingGames = await docClient.query({
  TableName: "contexto-multiplayer",
  IndexName: "GSI2",
  KeyConditionExpression: "GSI2PK = :status",
  FilterExpression: "isPublic = :isPublic",
  ExpressionAttributeValues: {
    ":status": "WAITING",
    ":isPublic": true
  },
  ScanIndexForward: false,  // Most recent first
  Limit: 10
});

// Get player profile
const player = await docClient.get({
  TableName: "contexto-multiplayer",
  Key: {
    PK: `PLAYER#${playerId}`,
    SK: "PROFILE"
  }
});

// Get player's game history
const playerGames = await docClient.query({
  TableName: "contexto-multiplayer",
  KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
  ExpressionAttributeValues: {
    ":pk": `PLAYER#${playerId}`,
    ":sk": "GAME#"
  },
  ScanIndexForward: false,
  Limit: 20
});
```

---

## 5. GraphQL Schema

### 5.1 Complete Schema for AppSync

```graphql
# ─────────────────────────────────────────────────────────────────
# ENUMS
# ─────────────────────────────────────────────────────────────────

enum GameMode {
  COMPETITIVE
  RACE
  COOPERATIVE
}

enum GameStatus {
  WAITING
  ACTIVE
  COMPLETED
  ABANDONED
}

enum PlayerStatus {
  ONLINE
  OFFLINE
  IN_GAME
}

# ─────────────────────────────────────────────────────────────────
# TYPES
# ─────────────────────────────────────────────────────────────────

type Player {
  playerId: ID!
  nickname: String!
  avatarColor: String!
  totalGames: Int!
  totalWins: Int!
  bestScore: Int
  status: PlayerStatus!
  createdAt: AWSTimestamp!
}

type Game {
  gameId: ID!
  roomCode: String!
  gameMode: GameMode!
  status: GameStatus!
  currentTurnPlayerId: ID
  turnNumber: Int!
  turnStartedAt: AWSTimestamp
  turnDuration: Int!
  maxPlayers: Int!
  isPublic: Boolean!
  hostPlayerId: ID!
  winnerId: ID
  gameNumber: Int!
  playerCount: Int!
  createdAt: AWSTimestamp!
  startedAt: AWSTimestamp
  endedAt: AWSTimestamp
}

type GamePlayer {
  gameId: ID!
  playerId: ID!
  nickname: String!
  avatarColor: String!
  joinOrder: Int!
  isReady: Boolean!
  isHost: Boolean!
  isConnected: Boolean!
  score: Int!
  guessCount: Int!
  foundWord: Boolean!
}

type Guess {
  gameId: ID!
  guessId: ID!
  playerId: ID!
  playerNickname: String!
  word: String!
  distance: Int!
  similarity: Float!
  isCorrect: Boolean!
  turnNumber: Int!
  timestamp: AWSTimestamp!
}

type GameState {
  game: Game!
  players: [GamePlayer!]!
  guesses: [Guess!]!
  myPlayer: GamePlayer
}

type GuessResult {
  success: Boolean!
  guess: Guess
  gameStatus: GameStatus
  winnerId: ID
  nextTurnPlayerId: ID
  error: String
}

type GameListItem {
  gameId: ID!
  roomCode: String!
  gameMode: GameMode!
  hostNickname: String!
  playerCount: Int!
  maxPlayers: Int!
  createdAt: AWSTimestamp!
}

# ─────────────────────────────────────────────────────────────────
# INPUTS
# ─────────────────────────────────────────────────────────────────

input CreateGameInput {
  gameMode: GameMode!
  maxPlayers: Int!
  turnDuration: Int!
  isPublic: Boolean!
}

input CreatePlayerInput {
  nickname: String!
  avatarColor: String
}

# ─────────────────────────────────────────────────────────────────
# QUERIES
# ─────────────────────────────────────────────────────────────────

type Query {
  # Get full game state
  getGameState(gameId: ID!): GameState

  # Find game by room code
  getGameByRoomCode(roomCode: String!): Game

  # List public waiting games
  listPublicGames(limit: Int): [GameListItem!]!

  # Get player profile
  getPlayer(playerId: ID!): Player

  # Get my game history
  getMyGames(limit: Int): [GameListItem!]!
}

# ─────────────────────────────────────────────────────────────────
# MUTATIONS
# ─────────────────────────────────────────────────────────────────

type Mutation {
  # Player management
  createPlayer(input: CreatePlayerInput!): Player!
  updateNickname(nickname: String!): Player!

  # Game lifecycle
  createGame(input: CreateGameInput!): GameState!
  joinGame(roomCode: String!): GameState!
  leaveGame(gameId: ID!): Boolean!
  setReady(gameId: ID!, isReady: Boolean!): GamePlayer!
  startGame(gameId: ID!): GameState!

  # Gameplay
  submitGuess(gameId: ID!, word: String!): GuessResult!
  skipTurn(gameId: ID!): Game!
  giveUp(gameId: ID!): Game!
}

# ─────────────────────────────────────────────────────────────────
# SUBSCRIPTIONS
# ─────────────────────────────────────────────────────────────────

type Subscription {
  # Subscribe to all game updates
  onGameStateChanged(gameId: ID!): GameState
    @aws_subscribe(mutations: ["joinGame", "leaveGame", "setReady", "startGame", "submitGuess", "skipTurn", "giveUp"])

  # Subscribe to new guesses only (lighter payload)
  onNewGuess(gameId: ID!): Guess
    @aws_subscribe(mutations: ["submitGuess"])

  # Subscribe to player status changes
  onPlayerStatusChanged(gameId: ID!): GamePlayer
    @aws_subscribe(mutations: ["joinGame", "leaveGame", "setReady"])
}
```

---

## 6. Server-Side API Design

### 6.1 API Route Structure

```
src/app/api/
├── game/                        # Existing single-player
│   ├── guess/route.ts
│   ├── hint/route.ts
│   └── giveup/route.ts
│
└── multiplayer/                 # New multiplayer routes
    ├── player/
    │   ├── create/route.ts      # POST - Create player
    │   └── [playerId]/route.ts  # GET - Get player
    │
    ├── game/
    │   ├── create/route.ts      # POST - Create game room
    │   ├── join/route.ts        # POST - Join by room code
    │   ├── leave/route.ts       # POST - Leave game
    │   ├── ready/route.ts       # POST - Set ready status
    │   ├── start/route.ts       # POST - Start game (host only)
    │   ├── guess/route.ts       # POST - Submit guess
    │   ├── skip/route.ts        # POST - Skip turn
    │   ├── state/route.ts       # GET - Get game state
    │   └── list/route.ts        # GET - List public games
    │
    └── subscribe/route.ts       # WebSocket upgrade for subscriptions
```

### 6.2 API Route Template

```typescript
// src/app/api/multiplayer/game/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

// Server-side only - credentials from env (no NEXT_PUBLIC_)
const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME!;

// Rate limiting (in-memory, use Redis in production)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string, limit: number = 10): boolean {
  const now = Date.now();
  const window = 60000; // 1 minute

  const current = rateLimitMap.get(ip);
  if (!current || now > current.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + window });
    return true;
  }

  if (current.count >= limit) return false;
  current.count++;
  return true;
}

function getPlayerIdFromRequest(request: NextRequest): string | null {
  // Get player ID from session cookie or header
  const playerId = request.cookies.get('playerId')?.value;
  return playerId || null;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { success: false, error: 'Too many requests' },
        { status: 429 }
      );
    }

    // Get player ID
    const playerId = getPlayerIdFromRequest(request);
    if (!playerId) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Parse request
    const body = await request.json();
    const { gameMode, maxPlayers, turnDuration, isPublic } = body;

    // Validate
    if (!['COMPETITIVE', 'RACE', 'COOPERATIVE'].includes(gameMode)) {
      return NextResponse.json(
        { success: false, error: 'Invalid game mode' },
        { status: 400 }
      );
    }

    // Generate IDs
    const gameId = uuidv4();
    const roomCode = generateRoomCode();
    const now = Date.now();
    const gameNumber = getGameNumber();

    // Get player profile
    const playerResult = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `PLAYER#${playerId}`, SK: 'PROFILE' }
    }));

    const player = playerResult.Item;
    if (!player) {
      return NextResponse.json(
        { success: false, error: 'Player not found' },
        { status: 404 }
      );
    }

    // Select secret word
    const secretWord = selectSecretWord(gameNumber);

    // Create game metadata
    const gameItem = {
      PK: `GAME#${gameId}`,
      SK: 'METADATA',
      entityType: 'GAME',
      gameId,
      roomCode,
      GSI1PK: roomCode,           // For roomCode lookup
      GSI1SK: now,
      GSI2PK: 'WAITING',          // For status lookup
      GSI2SK: now,
      secretWord,
      gameMode,
      status: 'WAITING',
      currentTurnPlayerId: null,
      turnNumber: 0,
      turnDuration: turnDuration || 60,
      maxPlayers: maxPlayers || 2,
      isPublic: isPublic ?? true,
      hostPlayerId: playerId,
      winnerId: null,
      gameNumber,
      playerCount: 1,
      playerIds: [playerId],
      createdAt: now,
    };

    // Create game player entry
    const gamePlayerItem = {
      PK: `GAME#${gameId}`,
      SK: `PLAYER#${playerId}`,
      entityType: 'GAME_PLAYER',
      gameId,
      playerId,
      nickname: player.nickname,
      avatarColor: player.avatarColor,
      joinOrder: 1,
      isReady: false,
      isHost: true,
      isConnected: true,
      score: 0,
      guessCount: 0,
      foundWord: false,
      joinedAt: now,
      lastActiveAt: now,
    };

    // Create player game reference
    const playerGameItem = {
      PK: `PLAYER#${playerId}`,
      SK: `GAME#${gameId}`,
      entityType: 'PLAYER_GAME',
      playerId,
      gameId,
      roomCode,
      gameMode,
      status: 'WAITING',
      score: 0,
      won: false,
      joinedAt: now,
    };

    // Write all items
    await Promise.all([
      docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: gameItem })),
      docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: gamePlayerItem })),
      docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: playerGameItem })),
    ]);

    // Update player's current game
    await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `PLAYER#${playerId}`, SK: 'PROFILE' },
      UpdateExpression: 'SET currentGameId = :gameId, #status = :status, lastActiveAt = :now',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':gameId': gameId,
        ':status': 'IN_GAME',
        ':now': now,
      },
    }));

    return NextResponse.json({
      success: true,
      data: {
        gameId,
        roomCode,
        gameMode,
        status: 'WAITING',
        maxPlayers,
        isPublic,
      }
    });

  } catch (error) {
    console.error('Error creating game:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create game' },
      { status: 500 }
    );
  }
}

// Helper functions
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function getGameNumber(): number {
  const now = new Date();
  const start = new Date('2024-01-01');
  return Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function selectSecretWord(gameNumber: number): string {
  // Import DAILY_WORDS from game-service
  const { DAILY_WORDS } = require('@/lib/game-service');
  return DAILY_WORDS[(gameNumber - 1) % DAILY_WORDS.length];
}
```

### 6.3 Real-Time Updates via AppSync

```typescript
// src/lib/appsync-client.ts
// Server-side only AppSync client

import { SignatureV4 } from '@aws-sdk/signature-v4';
import { Sha256 } from '@aws-crypto/sha256-js';
import { defaultProvider } from '@aws-sdk/credential-provider-node';

const APPSYNC_URL = process.env.APPSYNC_API_URL!;
const APPSYNC_REGION = process.env.AWS_REGION!;

export async function publishToAppSync(
  mutation: string,
  variables: Record<string, unknown>
): Promise<void> {
  const endpoint = new URL(APPSYNC_URL);

  const body = JSON.stringify({
    query: mutation,
    variables,
  });

  const signer = new SignatureV4({
    credentials: defaultProvider(),
    region: APPSYNC_REGION,
    service: 'appsync',
    sha256: Sha256,
  });

  const request = {
    method: 'POST',
    hostname: endpoint.hostname,
    path: endpoint.pathname,
    headers: {
      'Content-Type': 'application/json',
      host: endpoint.hostname,
    },
    body,
  };

  const signedRequest = await signer.sign(request);

  const response = await fetch(APPSYNC_URL, {
    method: 'POST',
    headers: signedRequest.headers as HeadersInit,
    body,
  });

  if (!response.ok) {
    throw new Error(`AppSync request failed: ${response.status}`);
  }
}

// Usage in API route after guess submission:
await publishToAppSync(
  `mutation PublishGuess($gameId: ID!, $guess: GuessInput!) {
    publishGuess(gameId: $gameId, guess: $guess) {
      gameId
      guessId
    }
  }`,
  { gameId, guess: guessData }
);
```

---

## 7. Frontend Integration

### 7.1 Multiplayer Context

```typescript
// src/contexts/MultiplayerContext.tsx
'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface Player {
  playerId: string;
  nickname: string;
  avatarColor: string;
}

interface GameState {
  gameId: string | null;
  roomCode: string | null;
  status: 'idle' | 'waiting' | 'active' | 'completed';
  gameMode: string | null;
  players: GamePlayer[];
  guesses: Guess[];
  currentTurnPlayerId: string | null;
  turnNumber: number;
  winnerId: string | null;
  isMyTurn: boolean;
}

interface MultiplayerContextType {
  player: Player | null;
  gameState: GameState;
  isLoading: boolean;
  error: string | null;

  // Actions
  createPlayer: (nickname: string) => Promise<void>;
  createGame: (options: CreateGameOptions) => Promise<string>;
  joinGame: (roomCode: string) => Promise<void>;
  leaveGame: () => Promise<void>;
  setReady: (isReady: boolean) => Promise<void>;
  startGame: () => Promise<void>;
  submitGuess: (word: string) => Promise<GuessResult>;
  skipTurn: () => Promise<void>;
}

const MultiplayerContext = createContext<MultiplayerContextType | null>(null);

export function MultiplayerProvider({ children }: { children: React.ReactNode }) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    gameId: null,
    roomCode: null,
    status: 'idle',
    gameMode: null,
    players: [],
    guesses: [],
    currentTurnPlayerId: null,
    turnNumber: 0,
    winnerId: null,
    isMyTurn: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load player from cookie on mount
  useEffect(() => {
    const loadPlayer = async () => {
      try {
        const res = await fetch('/api/multiplayer/player/me');
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setPlayer(data.data);
          }
        }
      } catch (e) {
        console.error('Failed to load player:', e);
      }
    };
    loadPlayer();
  }, []);

  const createPlayer = useCallback(async (nickname: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/multiplayer/player/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setPlayer(data.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create player');
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createGame = useCallback(async (options: CreateGameOptions): Promise<string> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/multiplayer/game/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setGameState(prev => ({
        ...prev,
        gameId: data.data.gameId,
        roomCode: data.data.roomCode,
        status: 'waiting',
        gameMode: data.data.gameMode,
      }));

      return data.data.roomCode;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create game');
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const joinGame = useCallback(async (roomCode: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/multiplayer/game/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setGameState(prev => ({
        ...prev,
        gameId: data.data.gameId,
        roomCode: data.data.roomCode,
        status: 'waiting',
        gameMode: data.data.gameMode,
        players: data.data.players,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to join game');
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const submitGuess = useCallback(async (word: string): Promise<GuessResult> => {
    if (!gameState.gameId) throw new Error('Not in a game');

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/multiplayer/game/guess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: gameState.gameId, word }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      // Update local state (will also get subscription update)
      setGameState(prev => ({
        ...prev,
        guesses: [...prev.guesses, data.data.guess].sort((a, b) => a.distance - b.distance),
        currentTurnPlayerId: data.data.nextTurnPlayerId,
        isMyTurn: data.data.nextTurnPlayerId === player?.playerId,
      }));

      return data.data;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit guess');
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [gameState.gameId, player?.playerId]);

  // Subscribe to game updates via polling or WebSocket
  useEffect(() => {
    if (!gameState.gameId || gameState.status === 'completed') return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/multiplayer/game/state?gameId=${gameState.gameId}`);
        const data = await res.json();
        if (data.success) {
          setGameState(prev => ({
            ...prev,
            players: data.data.players,
            guesses: data.data.guesses,
            status: data.data.game.status.toLowerCase(),
            currentTurnPlayerId: data.data.game.currentTurnPlayerId,
            turnNumber: data.data.game.turnNumber,
            winnerId: data.data.game.winnerId,
            isMyTurn: data.data.game.currentTurnPlayerId === player?.playerId,
          }));
        }
      } catch (e) {
        console.error('Polling error:', e);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [gameState.gameId, gameState.status, player?.playerId]);

  // ... implement other methods

  return (
    <MultiplayerContext.Provider
      value={{
        player,
        gameState,
        isLoading,
        error,
        createPlayer,
        createGame,
        joinGame,
        leaveGame: async () => {},
        setReady: async () => {},
        startGame: async () => {},
        submitGuess,
        skipTurn: async () => {},
      }}
    >
      {children}
    </MultiplayerContext.Provider>
  );
}

export function useMultiplayer() {
  const context = useContext(MultiplayerContext);
  if (!context) {
    throw new Error('useMultiplayer must be used within MultiplayerProvider');
  }
  return context;
}
```

### 7.2 New Pages Structure

```
src/app/
├── page.tsx                    # Home - Choose single/multiplayer
├── play/page.tsx               # Single player (existing Game.tsx)
│
└── multiplayer/
    ├── page.tsx                # Multiplayer home - Create/Join
    ├── create/page.tsx         # Create game options
    ├── join/page.tsx           # Enter room code
    ├── lobby/[gameId]/page.tsx # Waiting room
    └── game/[gameId]/page.tsx  # Multiplayer game
```

---

## 8. Implementation Phases

### Phase 1: Infrastructure
- [ ] Create DynamoDB single table
- [ ] Create GSIs
- [ ] Set up AppSync API
- [ ] Create schema
- [ ] Test with AppSync Console

### Phase 2: Server API
- [ ] Create player API routes
- [ ] Create game lifecycle routes
- [ ] Create guess submission route
- [ ] Add rate limiting
- [ ] Add error handling

### Phase 3: Player Management
- [ ] Create player on first visit
- [ ] Store player ID in cookie
- [ ] Nickname selection UI
- [ ] Avatar color selection

### Phase 4: Game Lobby
- [ ] Create game UI
- [ ] Join game UI
- [ ] Waiting room
- [ ] Ready button
- [ ] Start game (host)

### Phase 5: Multiplayer Gameplay
- [ ] Port Game.tsx for multiplayer
- [ ] Turn indicator
- [ ] Turn timer
- [ ] Real-time guess updates
- [ ] Win detection

### Phase 6: Polish
- [ ] Connection status
- [ ] Reconnection handling
- [ ] Error recovery
- [ ] Mobile optimization

---

## 9. Free Tier Limits

### AWS Free Tier (Always Free)

| Service | Free Tier Limit | Our Usage |
|---------|-----------------|-----------|
| DynamoDB | 25 GB storage | ~1 GB estimated |
| DynamoDB | 25 WCU (writes) | ~10 WCU average |
| DynamoDB | 25 RCU (reads) | ~20 RCU average |
| AppSync | 250K queries/month | ~50K estimated |
| AppSync | 250K mutations/month | ~30K estimated |
| AppSync | 600K subscription minutes | ~100K estimated |
| Lambda | 1M requests/month | ~100K estimated |
| Lambda | 400K GB-seconds | ~50K estimated |

### Cost Optimization Tips

1. **Use On-Demand DynamoDB** - Only pay for what you use
2. **Keep items small** - Denormalize common fields
3. **Use projections in queries** - Don't fetch unnecessary attributes
4. **Batch operations** - Combine reads/writes when possible
5. **Client-side caching** - Reduce API calls
6. **Polling vs WebSocket** - Start with polling, upgrade if needed

### Staying Within Free Tier

- **Max concurrent games**: ~100
- **Max players**: ~1000
- **Max guesses/day**: ~10,000
- **Max API calls/day**: ~8,000

These limits are well above typical usage for a small-scale multiplayer game.
