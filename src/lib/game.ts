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
  position: number;
  similarity: number;
  timestamp: Date;
}

export interface GameConfig {
  maxHints?: number;
  enableHints?: boolean;
  timeLimit?: number; // in minutes, 0 for no limit
}

// Common English words for the game
const COMMON_WORDS = [
  'cat',
  'dog',
  'house',
  'car',
  'tree',
  'water',
  'fire',
  'book',
  'music',
  'love',
  'friend',
  'family',
  'school',
  'work',
  'money',
  'time',
  'life',
  'world',
  'person',
  'place',
  'thing',
  'way',
  'day',
  'man',
  'woman',
  'child',
  'year',
  'government',
  'company',
  'group',
  'problem',
  'service',
  'hand',
  'part',
  'head',
  'eye',
  'face',
  'fact',
  'week',
  'month',
  'idea',
  'story',
  'result',
  'change',
  'morning',
  'reason',
  'research',
  'girl',
  'guy',
  'moment',
  'air',
  'teacher',
  'force',
  'education',
  'foot',
  'boy',
  'age',
  'policy',
  'number',
  'office',
  'door',
  'health',
  'art',
  'war',
  'history',
  'party',
  'within',
  'grow',
  'draw',
  'machine',
  'game',
  'player',
  'law',
  'late',
  'member',
  'pay',
  'human',
  'both',
  'local',
  'sure',
  'something',
  'without',
  'come',
  'me',
  'back',
  'better',
  'general',
  'process',
  'she',
  'heat',
  'thanks',
  'specific',
  'enough',
  'long',
  'lot',
  'hand',
  'popular',
  'small',
  'though',
  'experience',
  'job',
  'book',
  'end',
  'point',
  'type',
  'home',
  'economy',
  'away',
  'big',
  'internet',
  'possible',
  'television',
  'three',
  'understand',
  'various',
  'yourself',
  'card',
  'difficult',
  'including',
  'list',
  'mind',
  'particular',
  'real',
  'science',
  'similar',
  'social',
  'strategy',
  'student',
  'project',
  'consume',
  'budget',
  'market',
  'player',
  'significand',
  'series',
  'model',
  'activity',
  'element',
  'analysis',
  'agreement',
  'cancer',
  'clean',
  'close',
  'concern',
  'design',
];

// More complex words for higher difficulty
const ADVANCED_WORDS = [
  'philosophy',
  'architecture',
  'democracy',
  'literature',
  'technology',
  'psychology',
  'imagination',
  'revolution',
  'civilization',
  'communication',
  'opportunity',
  'responsibility',
  'understanding',
  'environment',
  'development',
  'relationship',
  'information',
  'organization',
  'population',
  'international',
  'representative',
  'administration',
  'infrastructure',
  'sustainability',
  'entrepreneurship',
  'globalization',
  'transformation',
  'collaboration',
  'innovation',
  'consciousness',
  'perspective',
  'achievement',
  'independence',
  'significance',
  'diversity',
  'complexity',
  'creativity',
  'authenticity',
  'productivity',
  'flexibility',
  'reliability',
];

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

    this.wordList = [...COMMON_WORDS, ...ADVANCED_WORDS];
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
    const index = gameNumber % this.wordList.length;
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

    // For now, we'll simulate the similarity calculation
    // In a real implementation, this would use the word-similarity service
    const similarity = this.calculateSimularity(
      normalizedWord,
      this.gameState.secretWord
    );
    const position = this.calculatePosition(normalizedWord, similarity);

    const guessResult: GuessResult = {
      word: normalizedWord,
      position,
      similarity,
      timestamp: new Date(),
    };

    this.gameState.guesses.push(guessResult);

    // Check if the guess is correct
    if (normalizedWord === this.gameState.secretWord.toLowerCase()) {
      this.gameState.isComplete = true;
      this.gameState.isWon = true;
      this.gameState.endTime = new Date();
    }

    // Sort guesses by position (best first)
    this.gameState.guesses.sort((a, b) => a.position - b.position);

    return guessResult;
  }

  private calculateSimularity(guessedWord: string, secretWord: string): number {
    // Simplified similarity calculation
    // In production, this would use the HuggingFace embedding service

    if (guessedWord === secretWord) {
      return 1.0;
    }

    // Simple Levenshtein-based similarity as fallback
    const maxLength = Math.max(guessedWord.length, secretWord.length);
    const distance = this.levenshteinDistance(guessedWord, secretWord);
    const similarity = 1 - distance / maxLength;

    // Add some randomness to simulate semantic similarity
    const semanticBonus = Math.random() * 0.3;
    return Math.min(Math.max(similarity + semanticBonus, 0), 1);
  }

  private calculatePosition(word: string, similarity: number): number {
    // Simulate position based on similarity
    // Higher similarity = better position (lower number)
    const totalWords = 50000; // Simulate total vocabulary size
    const position = Math.floor((1 - similarity) * totalWords) + 1;
    return Math.max(1, position);
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
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
    const hints = [
      `The word has ${secretWord.length} letters`,
      `The word starts with "${secretWord[0].toUpperCase()}"`,
      `The word ends with "${secretWord[secretWord.length - 1]}"`,
      `The word contains the letter "${secretWord[Math.floor(secretWord.length / 2)]}"`,
    ];

    return hints[hintsGiven] || 'No more hints available';
  }

  public getStats() {
    return {
      gameNumber: this.gameState.gameNumber,
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
      .sort((a, b) => a.position - b.position)
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
      .filter((g) => milestones.some((m) => g.position <= m))
      .slice(0, 5);

    bestGuesses.forEach((guess) => {
      const emoji =
        guess.position === 1
          ? '🎯'
          : guess.position <= 10
            ? '🔥'
            : guess.position <= 100
              ? '⭐'
              : '✨';
      result += `${emoji} #${guess.position}: ${guess.word}\n`;
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
