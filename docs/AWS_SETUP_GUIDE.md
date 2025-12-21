# AWS AppSync Setup Guide - Console Method

## Complete Step-by-Step Guide for Contexto Multiplayer

This guide walks you through setting up AWS AppSync and DynamoDB for the Contexto multiplayer game using the AWS Console. Every step includes **what** we're doing and **why** we're doing it.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Understanding the Architecture](#2-understanding-the-architecture)
3. [Step 1: Create DynamoDB Table](#3-step-1-create-dynamodb-table)
4. [Step 2: Create Global Secondary Indexes](#4-step-2-create-global-secondary-indexes)
5. [Step 3: Create IAM Role for AppSync](#5-step-3-create-iam-role-for-appsync)
6. [Step 4: Create AppSync API](#6-step-4-create-appsync-api)
7. [Step 5: Define GraphQL Schema](#7-step-5-define-graphql-schema)
8. [Step 6: Create Data Source](#8-step-6-create-data-source)
9. [Step 7: Create Resolvers](#9-step-7-create-resolvers)
10. [Step 8: Test the API](#10-step-8-test-the-api)
11. [Step 9: Get Credentials for Next.js](#11-step-9-get-credentials-for-nextjs)
12. [Troubleshooting](#12-troubleshooting)
13. [Cost Monitoring](#13-cost-monitoring)

---

## 1. Prerequisites

### 1.1 What You Need

- **AWS Account** - If you don't have one:
  1. Go to [aws.amazon.com](https://aws.amazon.com)
  2. Click "Create an AWS Account"
  3. Follow the signup process (requires credit card, but free tier won't charge)

- **IAM User with Admin Access** - We'll create this in the setup

### 1.2 Free Tier Information

AWS Free Tier includes (always free, not just 12 months):

| Service | Free Tier |
|---------|-----------|
| DynamoDB | 25 GB storage, 25 WCU, 25 RCU |
| AppSync | 250K queries, 250K mutations, 600K subscription minutes/month |

**Our usage will stay well within these limits.**

### 1.3 Region Selection

We'll use **ap-south-1 (Mumbai)** because:
- **Lower latency for users in India** - Data stays closer to your users
- AppSync and DynamoDB free tier are **fully available** in this region
- All required services (DynamoDB, AppSync, IAM) work identically

**Important:** Make sure to select **Asia Pacific (Mumbai) ap-south-1** in the top-right corner of AWS Console before starting. All services must be created in the same region.

---

## 2. Understanding the Architecture

### 2.1 Why These Services?

```
┌────────────────────────────────────────────────────────────────────┐
│                        WHY THIS SETUP?                             │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  DYNAMODB (Database)                                               │
│  ────────────────────                                              │
│  WHY: Serverless, scales to zero, no server to manage              │
│       Perfect for games - fast reads/writes                        │
│       Free tier is generous (25GB, 25 read/write units)            │
│                                                                    │
│  SINGLE TABLE DESIGN                                               │
│  ────────────────────                                              │
│  WHY: One table = one free tier allocation                         │
│       All game data in one place = faster queries                  │
│       Simpler to manage and backup                                 │
│                                                                    │
│  APPSYNC (GraphQL API)                                             │
│  ────────────────────                                              │
│  WHY: Real-time subscriptions built-in (WebSocket)                 │
│       Type-safe GraphQL (catch errors early)                       │
│       Direct DynamoDB integration (no Lambda needed)               │
│       Free tier: 250K operations/month                             │
│                                                                    │
│  NO COGNITO (Authentication)                                       │
│  ────────────────────────────                                      │
│  WHY: Simpler setup for MVP                                        │
│       Using API key + server-side sessions instead                 │
│       Can add Cognito later for social login                       │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

```
┌────────────────────────────────────────────────────────────────────┐
│                         DATA FLOW                                  │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│   Browser                                                          │
│      │                                                             │
│      │ 1. User submits guess                                       │
│      ▼                                                             │
│   Next.js API Route (/api/multiplayer/game/guess)                  │
│      │                                                             │
│      │ 2. Server validates, calculates similarity                  │
│      │    (AWS credentials here, never in browser)                 │
│      ▼                                                             │
│   AppSync GraphQL API                                              │
│      │                                                             │
│      │ 3. Mutation saves guess                                     │
│      │    Subscription notifies other players                      │
│      ▼                                                             │
│   DynamoDB                                                         │
│      │                                                             │
│      │ 4. Data persisted                                           │
│      ▼                                                             │
│   All connected players receive update                             │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## 3. Step 1: Create DynamoDB Table

### 3.1 Navigate to DynamoDB

1. Go to [AWS Console](https://console.aws.amazon.com)
2. **IMPORTANT: Select region first!**
   - Look at the top-right corner of the console
   - Click on the region dropdown (might say "N. Virginia" or another region)
   - Select **"Asia Pacific (Mumbai) ap-south-1"**
   - The URL should now show `ap-south-1.console.aws.amazon.com`
3. In the search bar, type "DynamoDB"
4. Click on "DynamoDB" in the results

### 3.2 Create the Table

**Why a table?**
> DynamoDB stores data in tables. Unlike SQL databases, DynamoDB tables don't have a fixed schema - each item can have different attributes. We use a single table for all our data (games, players, guesses) to stay within free tier.

1. Click **"Create table"** button

2. Fill in the following:

   **Table name:**
   ```
   contexto-multiplayer
   ```
   > This is the name we'll reference in our code. Keep it simple and descriptive.

   **Partition key:**
   ```
   PK (String)
   ```
   > The partition key determines which server partition stores the data. We use "PK" as a generic name because different entities (games, players) will have different prefixes.

   **Sort key:**
   ```
   SK (String)
   ```
   > The sort key allows multiple items with the same partition key. For example, a game (PK=GAME#123) can have metadata (SK=METADATA) and multiple players (SK=PLAYER#456).

3. Scroll down to **Table settings**:

   Select: **"Customize settings"**
   > This lets us configure capacity mode properly for free tier.

4. **Read/write capacity settings:**

   Select: **"On-demand"**
   > On-demand means you pay per request, not per hour. This is perfect for games with unpredictable traffic. Free tier covers 25 read/write units per second.

5. Leave other settings as default

6. Click **"Create table"**

7. Wait for status to change to **"Active"** (takes 1-2 minutes)

### 3.3 Verify Table Creation

You should see:
- Table name: contexto-multiplayer
- Status: Active
- Partition key: PK (S)
- Sort key: SK (S)
- Capacity mode: On-demand

---

## 4. Step 2: Create Global Secondary Indexes

### 4.1 What Are GSIs?

**Why do we need GSIs?**
> In DynamoDB, you can only query by partition key and sort key. But we need to:
> - Find games by room code (ABC123)
> - List games by status (WAITING, ACTIVE)
>
> GSIs let us query by different attributes. Think of them as "alternative lookup paths" for your data.

### 4.2 Create GSI1: Room Code Index

**Purpose:** Find a game when a player enters a room code

1. Click on your table **"contexto-multiplayer"**
2. Go to the **"Indexes"** tab
3. Click **"Create index"**

4. Fill in:

   **Partition key:**
   ```
   GSI1PK (String)
   ```
   > We'll store the room code (e.g., "ABC123") in this attribute

   **Sort key:**
   ```
   GSI1SK (String)
   ```
   > We'll store the creation timestamp as a string, useful for ordering

   **Index name:**
   ```
   GSI1
   ```
   > Keep it simple. GSI1 = our first global secondary index

   **Projected attributes:**
   Select: **"All"**
   > This means when we query by room code, we get all the game data back

5. Click **"Create index"**

6. Wait for status: **"Active"** (takes 2-5 minutes)

### 4.3 Create GSI2: Status Index

**Purpose:** List all games with a certain status (e.g., show all public waiting games)

1. While still in **"Indexes"** tab
2. Click **"Create index"** again

3. Fill in:

   **Partition key:**
   ```
   GSI2PK (String)
   ```
   > We'll store status (WAITING, ACTIVE, COMPLETED) here

   **Sort key:**
   ```
   GSI2SK (String)
   ```
   > Creation timestamp as string for ordering (newest first or oldest first)

   **Index name:**
   ```
   GSI2
   ```

   **Projected attributes:**
   Select: **"All"**

4. Click **"Create index"**

5. Wait for status: **"Active"**

### 4.4 Verify Indexes

Your Indexes tab should show:

| Index Name | Partition Key | Sort Key | Status |
|------------|---------------|----------|--------|
| GSI1 | GSI1PK (S) | GSI1SK (S) | Active |
| GSI2 | GSI2PK (S) | GSI2SK (S) | Active |

---

## 5. Step 3: Create IAM Role for AppSync

### 5.1 What is IAM?

**Why do we need an IAM role?**
> IAM (Identity and Access Management) controls who/what can access AWS services. AppSync needs permission to read/write to DynamoDB. The IAM role grants these permissions.

### 5.2 Navigate to IAM

1. In AWS Console search bar, type "IAM"
2. Click "IAM" in results

### 5.3 Create the Role

1. In the left sidebar, click **"Roles"**
2. Click **"Create role"**

3. **Select trusted entity:**

   Select: **"AWS service"**

   **Use case:** Select **"AppSync"** from the dropdown

   Click **"Next"**

4. **Add permissions:**

   Click **"Create policy"** (opens new tab)

   In the new tab:
   - Click **"JSON"** tab
   - Paste this policy:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "dynamodb:GetItem",
           "dynamodb:PutItem",
           "dynamodb:UpdateItem",
           "dynamodb:DeleteItem",
           "dynamodb:Query",
           "dynamodb:Scan"
         ],
         "Resource": [
           "arn:aws:dynamodb:*:*:table/contexto-multiplayer",
           "arn:aws:dynamodb:*:*:table/contexto-multiplayer/index/*"
         ]
       }
     ]
   }
   ```

   > This policy says: "Allow reading, writing, updating, deleting, and querying the contexto-multiplayer table and its indexes"

   Click **"Next"**

   **Policy name:**
   ```
   contexto-dynamodb-access
   ```

   Click **"Create policy"**

5. **Back in the Create role tab:**

   Click the refresh button (circular arrow)

   Search for: `contexto-dynamodb-access`

   Check the box next to it

   Click **"Next"**

6. **Name the role:**

   **Role name:**
   ```
   contexto-appsync-role
   ```

   Click **"Create role"**

### 5.4 Verify Role

You should see the role in the Roles list with:
- Role name: contexto-appsync-role
- Trusted entities: appsync.amazonaws.com

---

## 6. Step 4: Create AppSync API

### 6.1 Navigate to AppSync

1. In AWS Console search bar, type "AppSync"
2. Click "AWS AppSync"

### 6.2 Create the API

1. Click **"Create API"**

2. Select **"GraphQL APIs"**

3. Select **"Design from scratch"**

4. Click **"Next"**

5. **API name:**
   ```
   contexto-multiplayer-api
   ```

6. **Contact details:** (optional, leave blank)

7. Click **"Next"**

8. **Database:**

   Select: **"Connect to an existing data source later"**

   > We'll connect DynamoDB manually for more control

9. Click **"Next"**

10. **Authorization:**

    **Primary authorization mode:**
    Select: **"API key"**

    > API key is simplest for getting started. Our Next.js server will use this key, keeping it secret from browsers.

    **API key expiration:**
    Set to **365 days** from today

    > Maximum is 365 days. You'll need to rotate it annually.

11. Click **"Next"**

12. Review and click **"Create API"**

### 6.3 Note Your API Details

After creation, on the Settings page, note down:

- **API URL:** `https://xxxxxxxx.appsync-api.ap-south-1.amazonaws.com/graphql`
- **API Key:** `da2-xxxxxxxxxxxx`
- **API ID:** (shown in breadcrumb or URL)

You'll need these for your `.env.local` file.

---

## 7. Step 5: Define GraphQL Schema

### 7.1 Navigate to Schema

1. In your AppSync API, click **"Schema"** in the left sidebar

### 7.2 Replace the Schema

**What is a GraphQL schema?**
> The schema defines what data exists and what operations are possible. It's like a contract between your frontend and backend.

Delete the existing schema and paste:

```graphql
# ─────────────────────────────────────────────────────────────────
# TYPES - These define the shape of our data
# ─────────────────────────────────────────────────────────────────

type Game {
  gameId: ID!
  roomCode: String!
  status: String!                    # WAITING, ACTIVE, COMPLETED
  gameMode: String!                  # COMPETITIVE, RACE, COOPERATIVE
  currentTurnPlayerId: ID
  turnNumber: Int!
  turnDuration: Int!
  maxPlayers: Int!
  isPublic: Boolean!
  hostPlayerId: ID!
  winnerId: ID
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

type Player {
  playerId: ID!
  nickname: String!
  avatarColor: String!
  totalGames: Int!
  totalWins: Int!
  status: String!
  createdAt: AWSTimestamp!
}

type GameState {
  game: Game
  players: [GamePlayer]
  guesses: [Guess]
}

type GuessResult {
  success: Boolean!
  guess: Guess
  error: String
}

type GameListItem {
  gameId: ID!
  roomCode: String!
  gameMode: String!
  playerCount: Int!
  maxPlayers: Int!
  createdAt: AWSTimestamp!
}

# ─────────────────────────────────────────────────────────────────
# QUERIES - Reading data
# ─────────────────────────────────────────────────────────────────

type Query {
  # Get complete game state (game + players + guesses)
  getGameState(gameId: ID!): GameState

  # Find game by room code (for joining)
  getGameByRoomCode(roomCode: String!): Game

  # List public games waiting for players
  listPublicGames(limit: Int): [GameListItem]

  # Get player profile
  getPlayer(playerId: ID!): Player
}

# ─────────────────────────────────────────────────────────────────
# MUTATIONS - Writing/changing data
# ─────────────────────────────────────────────────────────────────

type Mutation {
  # Create a new player profile
  createPlayer(
    playerId: ID!
    nickname: String!
    avatarColor: String!
  ): Player

  # Create a new game room
  createGame(
    gameId: ID!
    roomCode: String!
    gameMode: String!
    turnDuration: Int!
    maxPlayers: Int!
    isPublic: Boolean!
    hostPlayerId: ID!
    secretWord: String!
  ): Game

  # Add player to game
  joinGame(
    gameId: ID!
    playerId: ID!
    nickname: String!
    avatarColor: String!
    joinOrder: Int!
  ): GamePlayer

  # Update player ready status
  setPlayerReady(
    gameId: ID!
    playerId: ID!
    isReady: Boolean!
  ): GamePlayer

  # Start the game (host only)
  startGame(
    gameId: ID!
    currentTurnPlayerId: ID!
  ): Game

  # Submit a guess
  submitGuess(
    gameId: ID!
    guessId: ID!
    playerId: ID!
    playerNickname: String!
    word: String!
    distance: Int!
    similarity: Float!
    isCorrect: Boolean!
    turnNumber: Int!
  ): Guess

  # Update game turn
  updateTurn(
    gameId: ID!
    currentTurnPlayerId: ID!
    turnNumber: Int!
  ): Game

  # End the game
  endGame(
    gameId: ID!
    winnerId: ID
    status: String!
  ): Game
}

# ─────────────────────────────────────────────────────────────────
# SUBSCRIPTIONS - Real-time updates
# ─────────────────────────────────────────────────────────────────

type Subscription {
  # Subscribe to any changes in a game
  onGameChanged(gameId: ID!): Game
    @aws_subscribe(mutations: ["startGame", "updateTurn", "endGame"])

  # Subscribe to new guesses
  onGuessSubmitted(gameId: ID!): Guess
    @aws_subscribe(mutations: ["submitGuess"])

  # Subscribe to player changes (join, ready, leave)
  onPlayerChanged(gameId: ID!): GamePlayer
    @aws_subscribe(mutations: ["joinGame", "setPlayerReady"])
}

schema {
  query: Query
  mutation: Mutation
  subscription: Subscription
}
```

3. Click **"Save Schema"**

### 7.3 Understanding the Schema

| Section | Purpose |
|---------|---------|
| Types | Define data shapes (Game, Player, Guess) |
| Queries | Read operations (get game, list games) |
| Mutations | Write operations (create game, submit guess) |
| Subscriptions | Real-time updates (new guess, turn change) |

---

## 8. Step 6: Create Data Source

### 8.1 What is a Data Source?

**Why do we need a data source?**
> A data source tells AppSync where to get/store data. We're connecting it to our DynamoDB table.

### 8.2 Create the Data Source

1. In AppSync, click **"Data sources"** in left sidebar
2. Click **"Create data source"**

3. Fill in:

   **Data source name:**
   ```
   DynamoDBDataSource
   ```

   **Data source type:**
   Select: **"Amazon DynamoDB table"**

   **Region:**
   Select: **"Asia Pacific (Mumbai)"** (ap-south-1)

   **Table name:**
   Select: **"contexto-multiplayer"**

   **Create or use an existing role:**
   Select: **"Existing role"**

   **Existing role:**
   Select: **"contexto-appsync-role"**

4. Click **"Create"**

### 8.3 Verify Data Source

You should see:
- Name: DynamoDBDataSource
- Type: AMAZON_DYNAMODB
- Status: Active

---

## 9. Step 7: Create Resolvers

### 9.1 What Are Resolvers?

**Why do we need resolvers?**
> Resolvers are the "glue" between GraphQL operations and data sources. They define HOW to get/store data when a query or mutation is called.

**Note:** AWS AppSync now uses **JavaScript resolvers** by default (instead of the older VTL templates). This is better because:
- Familiar JavaScript syntax
- Better error messages
- More powerful features
- AWS recommended approach

### 9.2 Create Resolver: getGameByRoomCode

This resolver finds a game when someone enters a room code.

1. Go to **"Schema"** page
2. In the right panel **"Resolvers"**, find `Query` → `getGameByRoomCode`
3. Click **"Attach"**

4. You'll see a JavaScript code editor. **Replace ALL the code** with:

```javascript
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  return {
    operation: 'Query',
    index: 'GSI1',
    query: {
      expression: 'GSI1PK = :roomCode',
      expressionValues: util.dynamodb.toMapValues({
        ':roomCode': ctx.args.roomCode,
      }),
    },
    limit: 1,
  };
}

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }
  const items = ctx.result.items;
  return items.length > 0 ? items[0] : null;
}
```

> **What this does:**
> - `request()`: Queries the GSI1 index where GSI1PK equals the room code
> - `response()`: Returns the first match or null if not found

5. Expand **"Data source"** section (click the arrow)
6. Select **"DynamoDBDataSource"**
7. Click **"Save"** (top right, might be called "Create")

### 9.3 Create Resolver: createGame

1. Go back to Schema page
2. Find `Mutation` → `createGame` in Resolvers panel
3. Click **"Attach"**

4. Replace the code with:

```javascript
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const now = util.time.nowEpochMilliSeconds();
  // Convert timestamp to string for GSI sort keys (DynamoDB GSI type consistency)
  const nowStr = `${now}`;

  return {
    operation: 'PutItem',
    key: util.dynamodb.toMapValues({
      PK: `GAME#${ctx.args.gameId}`,
      SK: 'METADATA',
    }),
    attributeValues: util.dynamodb.toMapValues({
      entityType: 'GAME',
      gameId: ctx.args.gameId,
      roomCode: ctx.args.roomCode,
      GSI1PK: ctx.args.roomCode,
      GSI1SK: nowStr,
      GSI2PK: 'WAITING',
      GSI2SK: nowStr,
      secretWord: ctx.args.secretWord,
      gameMode: ctx.args.gameMode,
      status: 'WAITING',
      currentTurnPlayerId: null,
      turnNumber: 0,
      turnDuration: ctx.args.turnDuration,
      maxPlayers: ctx.args.maxPlayers,
      isPublic: ctx.args.isPublic,
      hostPlayerId: ctx.args.hostPlayerId,
      winnerId: null,
      playerCount: 1,
      createdAt: now,
      startedAt: null,
      endedAt: null,
    }),
  };
}

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }
  return ctx.result;
}
```

5. Expand **"Data source"** → Select **"DynamoDBDataSource"**
6. Click **"Save"**

### 9.4 Create Resolver: submitGuess

1. Find `Mutation` → `submitGuess`
2. Click **"Attach"**

3. Replace the code with:

```javascript
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const timestamp = util.time.nowEpochMilliSeconds();

  return {
    operation: 'PutItem',
    key: util.dynamodb.toMapValues({
      PK: `GAME#${ctx.args.gameId}`,
      SK: `GUESS#${timestamp}#${ctx.args.guessId}`,
    }),
    attributeValues: util.dynamodb.toMapValues({
      entityType: 'GUESS',
      gameId: ctx.args.gameId,
      guessId: ctx.args.guessId,
      playerId: ctx.args.playerId,
      playerNickname: ctx.args.playerNickname,
      word: ctx.args.word,
      distance: ctx.args.distance,
      similarity: ctx.args.similarity,
      isCorrect: ctx.args.isCorrect,
      turnNumber: ctx.args.turnNumber,
      timestamp: timestamp,
    }),
  };
}

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }
  return ctx.result;
}
```

4. Select **"DynamoDBDataSource"** and **"Save"**

### 9.5 Create Resolver: getGameState

This resolver gets all game data (metadata + players + guesses) in one query.

1. Find `Query` → `getGameState`
2. Click **"Attach"**

3. Replace the code with:

```javascript
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  return {
    operation: 'Query',
    query: {
      expression: 'PK = :pk',
      expressionValues: util.dynamodb.toMapValues({
        ':pk': `GAME#${ctx.args.gameId}`,
      }),
    },
  };
}

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }

  // Separate items by entity type
  let game = null;
  const players = [];
  const guesses = [];

  for (const item of ctx.result.items) {
    if (item.entityType === 'GAME') {
      game = item;
    } else if (item.entityType === 'GAME_PLAYER') {
      players.push(item);
    } else if (item.entityType === 'GUESS') {
      guesses.push(item);
    }
  }

  return {
    game,
    players,
    guesses,
  };
}
```

4. Select **"DynamoDBDataSource"** and **"Save"**

### 9.6 Create Resolver: joinGame

1. Find `Mutation` → `joinGame`
2. Click **"Attach"**

3. Replace the code with:

```javascript
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const now = util.time.nowEpochMilliSeconds();

  return {
    operation: 'PutItem',
    key: util.dynamodb.toMapValues({
      PK: `GAME#${ctx.args.gameId}`,
      SK: `PLAYER#${ctx.args.playerId}`,
    }),
    attributeValues: util.dynamodb.toMapValues({
      entityType: 'GAME_PLAYER',
      gameId: ctx.args.gameId,
      playerId: ctx.args.playerId,
      nickname: ctx.args.nickname,
      avatarColor: ctx.args.avatarColor,
      joinOrder: ctx.args.joinOrder,
      isReady: false,
      isHost: false,
      isConnected: true,
      score: 0,
      guessCount: 0,
      foundWord: false,
      joinedAt: now,
    }),
  };
}

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }
  return ctx.result;
}
```

4. Select **"DynamoDBDataSource"** and **"Save"**

### 9.7 Create Resolver: setPlayerReady

1. Find `Mutation` → `setPlayerReady`
2. Click **"Attach"**

3. Replace the code with:

```javascript
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  return {
    operation: 'UpdateItem',
    key: util.dynamodb.toMapValues({
      PK: `GAME#${ctx.args.gameId}`,
      SK: `PLAYER#${ctx.args.playerId}`,
    }),
    update: {
      expression: 'SET isReady = :isReady',
      expressionValues: util.dynamodb.toMapValues({
        ':isReady': ctx.args.isReady,
      }),
    },
  };
}

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }
  return ctx.result;
}
```

4. Select **"DynamoDBDataSource"** and **"Save"**

### 9.8 Create Resolver: startGame

1. Find `Mutation` → `startGame`
2. Click **"Attach"**

3. Replace the code with:

```javascript
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const now = util.time.nowEpochMilliSeconds();

  return {
    operation: 'UpdateItem',
    key: util.dynamodb.toMapValues({
      PK: `GAME#${ctx.args.gameId}`,
      SK: 'METADATA',
    }),
    update: {
      expression: 'SET #status = :status, currentTurnPlayerId = :currentTurn, turnNumber = :turn, startedAt = :started, GSI2PK = :gsi2pk',
      expressionNames: {
        '#status': 'status',
      },
      expressionValues: util.dynamodb.toMapValues({
        ':status': 'ACTIVE',
        ':currentTurn': ctx.args.currentTurnPlayerId,
        ':turn': 1,
        ':started': now,
        ':gsi2pk': 'ACTIVE',
      }),
    },
  };
}

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }
  return ctx.result;
}
```

4. Select **"DynamoDBDataSource"** and **"Save"**

### 9.9 Create Resolver: updateTurn

1. Find `Mutation` → `updateTurn`
2. Click **"Attach"**

3. Replace the code with:

```javascript
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  return {
    operation: 'UpdateItem',
    key: util.dynamodb.toMapValues({
      PK: `GAME#${ctx.args.gameId}`,
      SK: 'METADATA',
    }),
    update: {
      expression: 'SET currentTurnPlayerId = :currentTurn, turnNumber = :turn',
      expressionValues: util.dynamodb.toMapValues({
        ':currentTurn': ctx.args.currentTurnPlayerId,
        ':turn': ctx.args.turnNumber,
      }),
    },
  };
}

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }
  return ctx.result;
}
```

4. Select **"DynamoDBDataSource"** and **"Save"**

### 9.10 Create Resolver: endGame

1. Find `Mutation` → `endGame`
2. Click **"Attach"**

3. Replace the code with:

```javascript
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const now = util.time.nowEpochMilliSeconds();

  return {
    operation: 'UpdateItem',
    key: util.dynamodb.toMapValues({
      PK: `GAME#${ctx.args.gameId}`,
      SK: 'METADATA',
    }),
    update: {
      expression: 'SET #status = :status, winnerId = :winnerId, endedAt = :ended, GSI2PK = :gsi2pk',
      expressionNames: {
        '#status': 'status',
      },
      expressionValues: util.dynamodb.toMapValues({
        ':status': ctx.args.status,
        ':winnerId': ctx.args.winnerId,
        ':ended': now,
        ':gsi2pk': ctx.args.status,
      }),
    },
  };
}

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }
  return ctx.result;
}
```

4. Select **"DynamoDBDataSource"** and **"Save"**

### 9.11 Create Resolver: createPlayer

1. Find `Mutation` → `createPlayer`
2. Click **"Attach"**

3. Replace the code with:

```javascript
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const now = util.time.nowEpochMilliSeconds();

  return {
    operation: 'PutItem',
    key: util.dynamodb.toMapValues({
      PK: `PLAYER#${ctx.args.playerId}`,
      SK: 'PROFILE',
    }),
    attributeValues: util.dynamodb.toMapValues({
      entityType: 'PLAYER',
      playerId: ctx.args.playerId,
      nickname: ctx.args.nickname,
      avatarColor: ctx.args.avatarColor,
      totalGames: 0,
      totalWins: 0,
      status: 'ONLINE',
      createdAt: now,
    }),
  };
}

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }
  return ctx.result;
}
```

4. Select **"DynamoDBDataSource"** and **"Save"**

### 9.12 Create Resolver: getPlayer

1. Find `Query` → `getPlayer`
2. Click **"Attach"**

3. Replace the code with:

```javascript
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  return {
    operation: 'GetItem',
    key: util.dynamodb.toMapValues({
      PK: `PLAYER#${ctx.args.playerId}`,
      SK: 'PROFILE',
    }),
  };
}

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }
  return ctx.result;
}
```

4. Select **"DynamoDBDataSource"** and **"Save"**

### 9.13 Create Resolver: listPublicGames

1. Find `Query` → `listPublicGames`
2. Click **"Attach"**

3. Replace the code with:

```javascript
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const limit = ctx.args.limit || 10;

  return {
    operation: 'Query',
    index: 'GSI2',
    query: {
      expression: 'GSI2PK = :status',
      expressionValues: util.dynamodb.toMapValues({
        ':status': 'WAITING',
      }),
    },
    filter: {
      expression: 'isPublic = :isPublic',
      expressionValues: util.dynamodb.toMapValues({
        ':isPublic': true,
      }),
    },
    limit: limit,
    scanIndexForward: false,  // Most recent first
  };
}

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }
  return ctx.result.items;
}
```

4. Select **"DynamoDBDataSource"** and **"Save"**

### 9.14 Verify All Resolvers

After creating all resolvers, go to **Schema** page and check the **Resolvers** panel on the right. You should see all these operations with "DynamoDBDataSource" attached:

**Queries:**
- ✅ getGameState
- ✅ getGameByRoomCode
- ✅ listPublicGames
- ✅ getPlayer

**Mutations:**
- ✅ createPlayer
- ✅ createGame
- ✅ joinGame
- ✅ setPlayerReady
- ✅ startGame
- ✅ submitGuess
- ✅ updateTurn
- ✅ endGame

---

## 10. Step 8: Test the API

### 10.1 Navigate to Queries

1. In AppSync, click **"Queries"** in left sidebar

### 10.2 Test createGame Mutation

1. In the query editor, paste:

```graphql
mutation CreateTestGame {
  createGame(
    gameId: "test-game-001"
    roomCode: "ABC123"
    gameMode: "COMPETITIVE"
    turnDuration: 60
    maxPlayers: 2
    isPublic: true
    hostPlayerId: "player-001"
    secretWord: "computer"
  ) {
    gameId
    roomCode
    status
  }
}
```

2. Click the **orange play button**

3. You should see a response like:
```json
{
  "data": {
    "createGame": {
      "gameId": "test-game-001",
      "roomCode": "ABC123",
      "status": "WAITING"
    }
  }
}
```

### 10.3 Test getGameByRoomCode Query

```graphql
query FindGame {
  getGameByRoomCode(roomCode: "ABC123") {
    gameId
    status
    hostPlayerId
  }
}
```

### 10.4 Test Subscription

1. In a new browser tab, open AppSync Queries
2. Paste and run:

```graphql
subscription WatchGuesses {
  onGuessSubmitted(gameId: "test-game-001") {
    word
    distance
    playerId
  }
}
```

3. Keep this tab open
4. In original tab, submit a guess:

```graphql
mutation TestGuess {
  submitGuess(
    gameId: "test-game-001"
    guessId: "guess-001"
    playerId: "player-001"
    playerNickname: "TestPlayer"
    word: "keyboard"
    distance: 245
    similarity: 0.78
    isCorrect: false
    turnNumber: 1
  ) {
    word
    distance
  }
}
```

5. The subscription tab should show the guess appear!

---

## 11. Step 9: Get Credentials for Next.js

### 11.1 Collect Your Settings

From AppSync Console, get:
- **API URL**: Settings → API URL
- **API Key**: Settings → API key

### 11.2 Create IAM User for Server

**Why a separate IAM user?**
> Your Next.js server needs AWS credentials to call AppSync and DynamoDB. We create a limited user just for this app.

1. Go to IAM Console
2. Click **"Users"** → **"Create user"**

3. **User name:**
   ```
   contexto-server
   ```

4. Click **"Next"**

5. **Permissions:**
   Select: **"Attach policies directly"**

   Search and check:
   - `contexto-dynamodb-access` (the policy we created)

6. Click **"Next"** → **"Create user"**

7. Click on the user name to open it

8. Go to **"Security credentials"** tab

9. Under **"Access keys"**, click **"Create access key"**

10. Select: **"Application running outside AWS"**

11. Click **"Next"** → **"Create access key"**

12. **IMPORTANT:** Copy these values (shown only once!):
    - Access key ID
    - Secret access key

### 11.3 Update .env.local

Add to your `.env.local` file (create if doesn't exist):

```bash
# AWS Credentials (Server-side only)
AWS_ACCESS_KEY_ID=AKIAxxxxxxxxxxxx
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxx
AWS_REGION=ap-south-1

# AppSync
APPSYNC_API_URL=https://xxxxxxxx.appsync-api.ap-south-1.amazonaws.com/graphql
APPSYNC_API_KEY=da2-xxxxxxxxxxxx

# DynamoDB
DYNAMODB_TABLE_NAME=contexto-multiplayer
```

**NEVER commit .env.local to git!** It's already in .gitignore.

---

## 12. Troubleshooting

### Problem: "Access Denied" when querying

**Cause:** IAM role doesn't have permission

**Fix:**
1. Go to IAM → Roles → contexto-appsync-role
2. Check the policy allows the table name exactly
3. Make sure the data source is using this role

### Problem: GSI query returns nothing

**Cause:** GSI attributes not populated on items

**Fix:**
1. Check items in DynamoDB have `GSI1PK` and `GSI1SK` attributes
2. These must be set when creating/updating items

### Problem: Subscription doesn't receive updates

**Cause:** Mutation not listed in @aws_subscribe

**Fix:**
1. Check schema has the mutation in @aws_subscribe list
2. Ensure gameId matches between subscription and mutation

### Problem: "Resolver mapping template error"

**Cause:** VTL syntax error

**Fix:**
1. Check for typos in variable names
2. Ensure all $util functions are correct
3. Test with simpler template first

---

## 13. Cost Monitoring

### 13.1 Set Up Billing Alerts

1. Go to AWS Console → Billing → Budgets
2. Click **"Create budget"**
3. Select **"Cost budget"**
4. Set amount to **$1.00** (to catch any unexpected charges)
5. Add your email for alerts

### 13.2 Monitor Free Tier Usage

1. Go to AWS Console → Billing → Free Tier
2. Check usage percentages for:
   - DynamoDB
   - AppSync

### 13.3 Expected Costs

| Scenario | Cost |
|----------|------|
| Development/testing | $0 |
| 100 daily users | $0 |
| 1,000 daily users | $0 - $1 |
| 10,000 daily users | $5 - $15 |

Most small-scale usage stays within free tier!

---

## Next Steps

After completing this setup:

1. **Verify everything works** - Run the test queries
2. **Update .env.local** - Add all credentials
3. **Install AWS SDK** - Run `bun add @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb`
4. **Create API routes** - Start with `/api/multiplayer/game/create`
5. **Build the UI** - Create multiplayer lobby and game components

Refer to `MULTIPLAYER_FEATURES.md` for the complete implementation guide.
