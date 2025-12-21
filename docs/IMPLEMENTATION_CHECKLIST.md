# Contexto Multiplayer - Implementation Checklist

## Overview

This document outlines the step-by-step implementation plan for adding multiplayer functionality to Contexto. Each task should be implemented **one at a time**, tested, and committed before moving to the next.

**Target Game Mode:** Competitive (1v1) - other modes can be added later.

---

## Implementation Principles

### 1. One Task at a Time
- Complete each task fully before starting the next
- Test each feature in isolation
- Commit after each completed task with descriptive message

### 2. Optimal Codebase
- Follow existing project patterns and conventions
- Use TypeScript strictly - no `any` types
- Keep functions small and single-purpose
- Extract reusable logic into utility functions
- Use proper error handling with try-catch
- Add meaningful console logs for debugging (remove in production)

### 3. Best UI Practices
- Follow NextUI component patterns already in the project
- Mobile-first responsive design
- Consistent spacing using Tailwind classes
- Loading states for all async operations
- Error states with retry options
- Smooth transitions and animations
- Accessible (keyboard navigation, ARIA labels)

---

## Pre-Implementation Checklist

Before starting, ensure:

- [ ] AWS AppSync is set up and tested (see `AWS_SETUP_GUIDE.md`)
- [ ] All AppSync resolvers are working
- [ ] You have the AppSync API URL and API Key
- [ ] DynamoDB table `contexto-multiplayer` exists with GSIs

---

## Phase 1: Core Setup & AppSync Client

### Task 1.1: Environment Variables

**File:** `.env.local`

**What:** Add AWS credentials and AppSync configuration.

**Why:** Server-side API routes need these to communicate with AWS.

```bash
# AWS Credentials (Server-side only - NO NEXT_PUBLIC_ prefix)
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# AppSync Configuration
APPSYNC_API_URL=https://xxx.appsync-api.ap-south-1.amazonaws.com/graphql
APPSYNC_API_KEY=da2-xxx

# DynamoDB
DYNAMODB_TABLE_NAME=contexto-multiplayer

# Session (generate a random 32-char string)
SESSION_SECRET=your_random_32_character_string_here
```

**Test:** Restart dev server, ensure no errors.

**Commit:** `chore: add AWS and AppSync environment variables`

---

### Task 1.2: AppSync GraphQL Client

**File:** `src/lib/appsync-client.ts`

**What:** Create a server-side client to call AppSync GraphQL API.

**Why:** All API routes will use this to interact with DynamoDB via AppSync.

**Requirements:**
- Use `fetch` with API key authentication
- Export typed helper functions for queries/mutations
- Handle errors gracefully
- Log requests in development mode

**Commit:** `feat: add AppSync GraphQL client for server-side calls`

---

### Task 1.3: Multiplayer Types

**File:** `src/types/multiplayer.ts`

**What:** Define TypeScript interfaces for all multiplayer entities.

**Why:** Type safety across the entire multiplayer feature set.

**Types to define:**
```typescript
// Player types
interface Player { ... }
interface GamePlayer { ... }

// Game types
interface Game { ... }
interface GameState { ... }

// Guess types
interface Guess { ... }
interface GuessResult { ... }

// API response types
interface ApiResponse<T> { ... }

// Enums
type GameMode = 'COMPETITIVE' | 'RACE' | 'COOPERATIVE';
type GameStatus = 'WAITING' | 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
```

**Commit:** `feat: add TypeScript types for multiplayer entities`

---

## Phase 2: API Routes

> **Important:** Each API route should:
> - Validate input data
> - Check authentication (player ID from cookie)
> - Handle errors with proper status codes
> - Return consistent response format: `{ success: boolean, data?: T, error?: string }`

---

### Task 2.1: Create Player API

**File:** `src/app/api/multiplayer/player/create/route.ts`

**What:** Register a new player with nickname.

**Request:**
```typescript
POST /api/multiplayer/player/create
Body: { nickname: string, avatarColor?: string }
```

**Response:**
```typescript
{ success: true, data: { playerId, nickname, avatarColor } }
```

**Logic:**
1. Generate UUID for playerId
2. Validate nickname (3-20 chars, alphanumeric)
3. Generate random avatarColor if not provided
4. Create player in DynamoDB via AppSync `createPlayer` mutation
5. Set `playerId` cookie (httpOnly, secure)
6. Return player data

**Commit:** `feat: add create player API route`

---

### Task 2.2: Get Current Player API

**File:** `src/app/api/multiplayer/player/me/route.ts`

**What:** Get current player from cookie.

**Request:**
```typescript
GET /api/multiplayer/player/me
```

**Response:**
```typescript
{ success: true, data: Player | null }
```

**Logic:**
1. Read `playerId` from cookie
2. If no cookie, return `{ success: true, data: null }`
3. Fetch player from DynamoDB via AppSync `getPlayer` query
4. Return player data

**Commit:** `feat: add get current player API route`

---

### Task 2.3: Create Game API

**File:** `src/app/api/multiplayer/game/create/route.ts`

**What:** Host creates a new game room.

**Request:**
```typescript
POST /api/multiplayer/game/create
Body: { gameMode: 'COMPETITIVE', maxPlayers: 2, turnDuration: 60, isPublic: boolean }
```

**Response:**
```typescript
{ success: true, data: { gameId, roomCode, gameMode, status } }
```

**Logic:**
1. Verify player is authenticated
2. Generate gameId (UUID) and roomCode (6 chars)
3. Select secret word from DAILY_WORDS
4. Create game metadata via AppSync
5. Create game player entry (host)
6. Return game info with room code

**Commit:** `feat: add create game API route`

---

### Task 2.4: Join Game API

**File:** `src/app/api/multiplayer/game/join/route.ts`

**What:** Join an existing game by room code.

**Request:**
```typescript
POST /api/multiplayer/game/join
Body: { roomCode: string }
```

**Response:**
```typescript
{ success: true, data: GameState }
```

**Logic:**
1. Verify player is authenticated
2. Find game by room code via AppSync
3. Validate: game exists, status is WAITING, not full, player not already in
4. Add player to game via AppSync
5. Update player count
6. Return full game state

**Error cases:**
- Game not found
- Game already started
- Game is full
- Player already in game

**Commit:** `feat: add join game API route`

---

### Task 2.5: Get Game State API

**File:** `src/app/api/multiplayer/game/state/route.ts`

**What:** Fetch current game state (for polling).

**Request:**
```typescript
GET /api/multiplayer/game/state?gameId=xxx
```

**Response:**
```typescript
{ success: true, data: { game: Game, players: GamePlayer[], guesses: Guess[] } }
```

**Logic:**
1. Verify player is authenticated
2. Verify player is in the game
3. Query all items with PK = GAME#gameId
4. Separate into metadata, players, guesses
5. Sort guesses by distance
6. Return structured game state

**Commit:** `feat: add get game state API route`

---

### Task 2.6: Set Ready API

**File:** `src/app/api/multiplayer/game/ready/route.ts`

**What:** Toggle player ready status in lobby.

**Request:**
```typescript
POST /api/multiplayer/game/ready
Body: { gameId: string, isReady: boolean }
```

**Response:**
```typescript
{ success: true, data: GamePlayer }
```

**Logic:**
1. Verify player is in the game
2. Update player's isReady status via AppSync
3. Return updated player

**Commit:** `feat: add set ready API route`

---

### Task 2.7: Start Game API

**File:** `src/app/api/multiplayer/game/start/route.ts`

**What:** Host starts the game when all players are ready.

**Request:**
```typescript
POST /api/multiplayer/game/start
Body: { gameId: string }
```

**Response:**
```typescript
{ success: true, data: GameState }
```

**Logic:**
1. Verify player is the host
2. Verify all players are ready
3. Verify minimum players (2 for competitive)
4. Update game status to ACTIVE
5. Set currentTurnPlayerId to host (or random)
6. Set turnNumber to 1
7. Set startedAt timestamp
8. Return updated game state

**Commit:** `feat: add start game API route`

---

### Task 2.8: Submit Guess API

**File:** `src/app/api/multiplayer/game/guess/route.ts`

**What:** Submit a word guess during gameplay.

**Request:**
```typescript
POST /api/multiplayer/game/guess
Body: { gameId: string, word: string }
```

**Response:**
```typescript
{
  success: true,
  data: {
    guess: Guess,
    isCorrect: boolean,
    gameStatus: GameStatus,
    winnerId?: string,
    nextTurnPlayerId: string
  }
}
```

**Logic:**
1. Verify it's the player's turn
2. Validate word (dictionary check - reuse existing logic)
3. Calculate similarity/distance (reuse existing HuggingFace logic)
4. Create guess entry via AppSync
5. Update player's guessCount
6. Check if word is correct:
   - If correct: set winnerId, update status to COMPLETED
   - If not: switch turn to next player
7. Return guess result with next turn info

**Commit:** `feat: add submit guess API route`

---

### Task 2.9: Leave Game API

**File:** `src/app/api/multiplayer/game/leave/route.ts`

**What:** Player leaves the game (forfeit or disconnect).

**Request:**
```typescript
POST /api/multiplayer/game/leave
Body: { gameId: string }
```

**Response:**
```typescript
{ success: true }
```

**Logic:**
1. Update player's isConnected to false
2. If game is WAITING: remove player, update count
3. If game is ACTIVE: other player wins by default
4. Update game status if needed

**Commit:** `feat: add leave game API route`

---

## Phase 3: UI Components

> **UI Guidelines:**
> - Use NextUI components (Button, Card, Input, Modal, etc.)
> - Use Tailwind for custom styling
> - Add loading spinners for async actions
> - Show toast notifications for errors
> - Ensure mobile responsiveness

---

### Task 3.1: Multiplayer Context Provider

**File:** `src/contexts/MultiplayerContext.tsx`

**What:** React context for multiplayer state management.

**Why:** Share player and game state across all multiplayer pages.

**State:**
```typescript
{
  player: Player | null,
  gameState: GameState | null,
  isLoading: boolean,
  error: string | null
}
```

**Actions:**
```typescript
{
  createPlayer: (nickname: string) => Promise<void>,
  createGame: (options) => Promise<string>, // returns roomCode
  joinGame: (roomCode: string) => Promise<void>,
  setReady: (isReady: boolean) => Promise<void>,
  startGame: () => Promise<void>,
  submitGuess: (word: string) => Promise<GuessResult>,
  leaveGame: () => Promise<void>,
  refreshGameState: () => Promise<void>
}
```

**Features:**
- Load player from cookie on mount
- Poll game state every 2 seconds when in game
- Clear game state on leave

**Commit:** `feat: add multiplayer context provider`

---

### Task 3.2: Update Home Page

**File:** `src/app/page.tsx`

**What:** Add choice between single-player and multiplayer.

**UI:**
```
┌─────────────────────────────────┐
│         CONTEXTO                │
│                                 │
│   ┌─────────────────────────┐   │
│   │    Single Player        │   │
│   │    Play today's word    │   │
│   └─────────────────────────┘   │
│                                 │
│   ┌─────────────────────────┐   │
│   │    Multiplayer          │   │
│   │    Play with friends    │   │
│   └─────────────────────────┘   │
│                                 │
└─────────────────────────────────┘
```

**Commit:** `feat: update home page with game mode selection`

---

### Task 3.3: Multiplayer Lobby Page

**File:** `src/app/multiplayer/page.tsx`

**What:** Multiplayer home with Create/Join options.

**UI:**
```
┌─────────────────────────────────┐
│   ← Back        MULTIPLAYER     │
│                                 │
│   [Nickname Input] (if no player)
│                                 │
│   ┌─────────────────────────┐   │
│   │    Create Game          │   │
│   │    Host a new room      │   │
│   └─────────────────────────┘   │
│                                 │
│   ┌─────────────────────────┐   │
│   │    Join Game            │   │
│   │    Enter room code      │   │
│   └─────────────────────────┘   │
│                                 │
└─────────────────────────────────┘
```

**Features:**
- If no player, show nickname input first
- After player created, show Create/Join buttons
- Display current player info

**Commit:** `feat: add multiplayer lobby page`

---

### Task 3.4: Create Game Page

**File:** `src/app/multiplayer/create/page.tsx`

**What:** Form to configure and create a new game.

**UI:**
```
┌─────────────────────────────────┐
│   ← Back       CREATE GAME      │
│                                 │
│   Game Mode: [Competitive ▼]    │
│   (Only Competitive for now)    │
│                                 │
│   Turn Timer: [60 seconds ▼]    │
│   Options: 30, 60, 90           │
│                                 │
│   Visibility: [Public ▼]        │
│   Options: Public, Private      │
│                                 │
│   ┌─────────────────────────┐   │
│   │      Create Room        │   │
│   └─────────────────────────┘   │
│                                 │
└─────────────────────────────────┘
```

**Features:**
- Form validation
- Loading state on submit
- Redirect to waiting room on success

**Commit:** `feat: add create game page`

---

### Task 3.5: Join Game Page

**File:** `src/app/multiplayer/join/page.tsx`

**What:** Enter room code to join existing game.

**UI:**
```
┌─────────────────────────────────┐
│   ← Back        JOIN GAME       │
│                                 │
│   Enter Room Code:              │
│   ┌─────────────────────────┐   │
│   │  [A] [B] [C] [1] [2] [3]│   │
│   └─────────────────────────┘   │
│   (6-character input)           │
│                                 │
│   ┌─────────────────────────┐   │
│   │        Join             │   │
│   └─────────────────────────┘   │
│                                 │
│   Error: Game not found         │
│                                 │
└─────────────────────────────────┘
```

**Features:**
- Auto-uppercase input
- 6-character limit
- Clear error messages
- Loading state
- Redirect to waiting room on success

**Commit:** `feat: add join game page`

---

### Task 3.6: Waiting Room Page

**File:** `src/app/multiplayer/lobby/[gameId]/page.tsx`

**What:** Lobby where players wait and ready up before game starts.

**UI:**
```
┌─────────────────────────────────┐
│   Room: ABC123    [Copy]        │
│                                 │
│   Players (1/2):                │
│   ┌─────────────────────────┐   │
│   │ 🟢 PlayerOne (Host)     │   │
│   │    ✓ Ready              │   │
│   └─────────────────────────┘   │
│   ┌─────────────────────────┐   │
│   │ 🔵 Waiting for player...│   │
│   │                         │   │
│   └─────────────────────────┘   │
│                                 │
│   ┌─────────────────────────┐   │
│   │  [Ready] / [Not Ready]  │   │
│   └─────────────────────────┘   │
│                                 │
│   ┌─────────────────────────┐   │
│   │     Start Game          │   │
│   │  (Host only, all ready) │   │
│   └─────────────────────────┘   │
│                                 │
│   [Leave Game]                  │
└─────────────────────────────────┘
```

**Features:**
- Copy room code button
- Real-time player list (polling)
- Ready toggle button
- Start button (host only, enabled when all ready)
- Leave game button with confirmation
- Auto-redirect when game starts

**Commit:** `feat: add waiting room page`

---

### Task 3.7: Multiplayer Game Page

**File:** `src/app/multiplayer/game/[gameId]/page.tsx`

**What:** Main multiplayer gameplay screen.

**UI:**
```
┌─────────────────────────────────┐
│  [You] 🟢        [Opponent] 🔵  │
│  5 guesses         3 guesses    │
│                                 │
│  ┌─────────────────────────┐    │
│  │    YOUR TURN - 0:45     │    │
│  └─────────────────────────┘    │
│                                 │
│  [Word Input___________] [Go]   │
│                                 │
│  ┌─ Your Guesses ───────────┐   │
│  │  1. computer ⭐           │   │
│  │  45. keyboard             │   │
│  │  234. mouse               │   │
│  └──────────────────────────┘   │
│                                 │
│  ┌─ Opponent Guesses ───────┐   │
│  │  12. monitor              │   │
│  │  89. screen               │   │
│  │  456. laptop              │   │
│  └──────────────────────────┘   │
│                                 │
│  [Give Up]                      │
└─────────────────────────────────┘
```

**Features:**
- Turn indicator (whose turn, timer)
- Disable input when not your turn
- Separate guess lists (yours vs opponent)
- Real-time updates via polling
- Win/lose detection
- Show result modal on game end

**Commit:** `feat: add multiplayer game page`

---

### Task 3.8: Turn Indicator Component

**File:** `src/components/multiplayer/TurnIndicator.tsx`

**What:** Shows whose turn it is with visual emphasis.

**Props:**
```typescript
{
  isMyTurn: boolean,
  currentPlayerName: string,
  turnNumber: number
}
```

**UI:**
- Green glow when your turn
- Gray when opponent's turn
- Pulse animation on turn change

**Commit:** `feat: add turn indicator component`

---

### Task 3.9: Turn Timer Component

**File:** `src/components/multiplayer/TurnTimer.tsx`

**What:** Countdown timer for current turn.

**Props:**
```typescript
{
  duration: number, // seconds
  turnStartedAt: number, // timestamp
  onTimeout: () => void,
  isMyTurn: boolean
}
```

**UI:**
- Circular progress or linear bar
- Color changes: green → yellow → red
- Blink when < 10 seconds
- Auto-call onTimeout when reaches 0

**Commit:** `feat: add turn timer component`

---

### Task 3.10: Player Card Component

**File:** `src/components/multiplayer/PlayerCard.tsx`

**What:** Displays player info in lobby and game.

**Props:**
```typescript
{
  player: GamePlayer,
  isCurrentTurn?: boolean,
  showReady?: boolean,
  compact?: boolean
}
```

**UI:**
- Avatar color circle
- Nickname
- Host badge
- Ready checkmark (in lobby)
- Guess count (in game)
- Current turn highlight

**Commit:** `feat: add player card component`

---

### Task 3.11: Game Result Modal

**File:** `src/components/multiplayer/GameResult.tsx`

**What:** Modal shown when game ends.

**Props:**
```typescript
{
  isOpen: boolean,
  winner: GamePlayer | null,
  isWinner: boolean,
  secretWord: string,
  myGuessCount: number,
  opponentGuessCount: number,
  onPlayAgain: () => void,
  onExit: () => void
}
```

**UI:**
```
┌─────────────────────────────────┐
│                                 │
│     🎉 YOU WIN! 🎉              │
│     (or: You Lost)              │
│                                 │
│     The word was: COMPUTER      │
│                                 │
│     Your guesses: 5             │
│     Opponent: 8                 │
│                                 │
│   ┌─────────────────────────┐   │
│   │      Play Again         │   │
│   └─────────────────────────┘   │
│   ┌─────────────────────────┐   │
│   │      Exit               │   │
│   └─────────────────────────┘   │
│                                 │
└─────────────────────────────────┘
```

**Commit:** `feat: add game result modal component`

---

## Phase 4: Real-time & Polish

### Task 4.1: Game State Polling

**File:** Update `src/contexts/MultiplayerContext.tsx`

**What:** Implement polling for real-time updates.

**Logic:**
- Poll `/api/multiplayer/game/state` every 2 seconds
- Only poll when game is WAITING or ACTIVE
- Update context state with new data
- Detect turn changes, new guesses, game end

**Commit:** `feat: implement game state polling for real-time updates`

---

### Task 4.2: Turn Timeout Handling

**Files:** `src/app/api/multiplayer/game/timeout/route.ts`, Timer component

**What:** Handle turn timeout (auto-skip).

**Logic:**
- When timer reaches 0, call timeout API
- API switches turn to next player
- If player times out 3 times, they forfeit

**Commit:** `feat: add turn timeout handling`

---

### Task 4.3: Disconnect Detection

**File:** Update leave API and context

**What:** Handle player disconnection gracefully.

**Logic:**
- Detect page unload/close
- Call leave API on beforeunload
- Show "Opponent disconnected" message
- Auto-win if opponent disconnects during ACTIVE game

**Commit:** `feat: add disconnect detection and handling`

---

### Task 4.4: Error Handling & Toasts

**Files:** Add toast provider, update all pages

**What:** User-friendly error messages.

**Features:**
- Toast notifications for errors
- Retry buttons where applicable
- Clear error messages
- Network error handling

**Commit:** `feat: add error handling with toast notifications`

---

## Testing Checklist

After each phase, test:

### Phase 1
- [ ] Environment variables load correctly
- [ ] AppSync client can make requests
- [ ] Types compile without errors

### Phase 2
- [ ] Each API returns correct response format
- [ ] Error cases handled properly
- [ ] Authentication works (cookie-based)
- [ ] Test with Postman/curl

### Phase 3
- [ ] All pages render without errors
- [ ] Navigation works correctly
- [ ] Forms validate input
- [ ] Loading states display
- [ ] Mobile responsive

### Phase 4
- [ ] Polling updates UI in real-time
- [ ] Turn timer counts down correctly
- [ ] Timeout triggers turn switch
- [ ] Disconnect handled gracefully

---

## Deployment Checklist

Before deploying:

- [ ] Remove console.logs or wrap in dev check
- [ ] Verify all env variables set in production
- [ ] Test with production AppSync endpoint
- [ ] Check mobile responsiveness
- [ ] Test with slow network (throttle in DevTools)
- [ ] Verify error messages are user-friendly

---

## Future Enhancements (After MVP)

Once Competitive mode works:

1. **Race Mode** - Simultaneous guessing
2. **Cooperative Mode** - Team play
3. **WebSocket Subscriptions** - Replace polling
4. **Player Stats** - Win/loss tracking
5. **Matchmaking** - Auto-match with random players
6. **Rematch** - Quick rematch button
7. **Spectator Mode** - Watch ongoing games

---

## Summary

| Phase | Tasks | Focus |
|-------|-------|-------|
| 1 | 3 tasks | Setup & Configuration |
| 2 | 9 tasks | Backend API Routes |
| 3 | 11 tasks | Frontend UI Components |
| 4 | 4 tasks | Polish & Real-time |
| **Total** | **27 tasks** | |

**Estimated time:** 2-3 days of focused development

---

*Remember: One task at a time. Test. Commit. Repeat.*
