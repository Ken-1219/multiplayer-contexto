import { DAILY_WORDS } from './game-service';

export interface GameState {
  gameNumber: number;
  secretWord: string;
  guesses: GuessResult[];
  isComplete: boolean;
  isWon: boolean;
  startTime: Date;
  endTime?: Date;
}

export interface GuessResult {
  word: string;
  lemma: string;
  distance: number;
  similarity: number;
  timestamp: Date;
  isCorrect: boolean;
}

export interface GameConfig {
  maxHints?: number;
  enableHints?: boolean;
  timeLimit?: number; // in minutes, 0 for no limit
}

export class GameService {
  private gameState: GameState;
  private config: Required<GameConfig>;
  private wordList: string[];

  constructor(config: GameConfig = {}) {
    this.config = {
      maxHints: 3,
      enableHints: true,
      timeLimit: 0,
      ...config,
    };

    this.wordList = [...DAILY_WORDS];
    this.gameState = this.initializeGame();
  }

  private initializeGame(): GameState {
    const gameNumber = this.generateGameNumber();
    const secretWord = this.selectSecretWord(gameNumber);

    return {
      gameNumber,
      secretWord,
      guesses: [],
      isComplete: false,
      isWon: false,
      startTime: new Date(),
    };
  }

  private generateGameNumber(): number {
    // Generate a daily game number based on current date
    const today = new Date();
    const startDate = new Date('2024-01-01'); // Game start date
    const diffTime = Math.abs(today.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  private selectSecretWord(gameNumber: number): string {
    // Use game number as seed for consistent daily words
    const index = (gameNumber - 1) % this.wordList.length; // gameNumber starts from 1
    return this.wordList[index];
  }

  public getGameState(): GameState {
    return { ...this.gameState };
  }

  public getSecretWord(): string {
    // Only return if game is complete or in development mode
    if (this.gameState.isComplete || process.env.NODE_ENV === 'development') {
      return this.gameState.secretWord;
    }
    return '';
  }

  public async submitGuess(word: string): Promise<GuessResult> {
    if (this.gameState.isComplete) {
      throw new Error('Game is already complete');
    }

    const normalizedWord = word.toLowerCase().trim();

    if (!normalizedWord || normalizedWord.length < 2) {
      throw new Error('Word must be at least 2 characters long');
    }

    // Check if word was already guessed
    const existingGuess = this.gameState.guesses.find(
      (g) => g.word.toLowerCase() === normalizedWord
    );
    if (existingGuess) {
      throw new Error('Word already guessed');
    }

    // Call the API to validate and calculate similarity
    try {
      const response = await fetch('/api/game/guess', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          word: normalizedWord,
          gameNumber: this.gameState.gameNumber,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        // Handle specific error cases with user-friendly messages
        if (result.error && result.error.includes("doesn't exist")) {
          throw new Error("Word doesn't exist. Please enter a valid word.");
        }
        if (result.error && result.error.includes('already guessed')) {
          throw new Error('Word already guessed. Try a different word.');
        }
        if (result.error && result.error.includes('Rate limit')) {
          throw new Error(
            'Too many guesses. Please wait a moment and try again.'
          );
        }

        throw new Error(result.error || 'Failed to process guess');
      }

      const guessResult: GuessResult = {
        word: result.data.word,
        lemma: result.data.lemma,
        distance: result.data.distance,
        similarity: result.data.similarity,
        timestamp: new Date(),
        isCorrect: result.data.isCorrect,
      };

      this.gameState.guesses.push(guessResult);

      // Check if the guess is correct
      if (result.data.isCorrect) {
        this.gameState.isComplete = true;
        this.gameState.isWon = true;
        this.gameState.endTime = new Date();
      }

      // Sort guesses by distance (best first - lower distance is better)
      this.gameState.guesses.sort((a, b) => a.distance - b.distance);

      return guessResult;
    } catch (error) {
      console.error('Error submitting guess:', error);

      // If it's already an Error with a message, preserve it
      if (error instanceof Error) {
        throw error;
      }

      // Otherwise, throw a generic error
      throw new Error('Failed to submit guess. Please try again.');
    }
  }

  public getHint(): string {
    if (!this.config.enableHints) {
      throw new Error('Hints are disabled');
    }

    const hintsGiven = this.gameState.guesses.filter((g) =>
      g.word.startsWith('hint:')
    ).length;

    if (hintsGiven >= this.config.maxHints) {
      throw new Error('Maximum hints reached');
    }

    // Generate hint based on secret word
    const secretWord = this.gameState.secretWord;
    const hintTypes = [
      `Starts with: ${secretWord[0].toUpperCase()}`,
      `Length: ${secretWord.length} letters`,
      `Contains the letter: ${secretWord[Math.floor(secretWord.length / 2)]}`,
      `Rhymes with words ending in: ${secretWord.slice(-2)}`,
    ];

    return hintTypes[hintsGiven] || 'No more hints available';
  }

  public getStats() {
    return {
      totalGuesses: this.gameState.guesses.length,
      isComplete: this.gameState.isComplete,
      isWon: this.gameState.isWon,
      elapsedTime: this.gameState.endTime
        ? this.gameState.endTime.getTime() - this.gameState.startTime.getTime()
        : Date.now() - this.gameState.startTime.getTime(),
      bestGuess:
        this.gameState.guesses.length > 0 ? this.gameState.guesses[0] : null,
    };
  }

  public resetGame(): GameState {
    this.gameState = this.initializeGame();
    return this.getGameState();
  }

  public getLeaderboard(): GuessResult[] {
    return [...this.gameState.guesses]
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 10); // Top 10 guesses
  }

  public shareResults(): string {
    if (!this.gameState.isComplete) {
      return 'Game is not complete yet!';
    }

    const gameNumber = this.gameState.gameNumber;
    const totalGuesses = this.gameState.guesses.length;
    const won = this.gameState.isWon ? '🎉' : '💭';

    let result = `Contexto #${gameNumber} ${won}\n`;
    result += `${totalGuesses} guess${totalGuesses !== 1 ? 'es' : ''}\n\n`;

    // Show progression of best guesses
    const milestones = [1, 10, 100, 1000];
    const bestGuesses = this.gameState.guesses
      .filter((g) => milestones.some((m) => g.distance <= m))
      .slice(0, 5);

    bestGuesses.forEach((guess) => {
      const emoji =
        guess.distance === 1
          ? '🎯'
          : guess.distance <= 10
            ? '🔥'
            : guess.distance <= 100
              ? '⭐'
              : '✨';
      result += `${emoji} #${guess.distance}: ${guess.word}\n`;
    });

    result += '\nPlay at: contexto-multiplayer.com';
    return result;
  }
}

// Export singleton instance
let gameInstance: GameService | null = null;

export function getGameService(config?: GameConfig): GameService {
  if (!gameInstance) {
    gameInstance = new GameService(config);
  }
  return gameInstance;
}

export function resetGameService(): void {
  gameInstance = null;
}
