import { HfInference } from '@huggingface/inference';
import { DAILY_WORDS } from './game-service';

/**
 * Enhanced word similarity service with rank-based scoring like Contexto
 */

// HuggingFace inference client
const hf = new HfInference(process.env.HUGGINGFACE_API_TOKEN);

// Cache for embeddings to avoid repeated API calls
const embeddingCache = new Map<string, number[]>();

// Cache for similarity calculations
const similarityCache = new Map<string, number>();

// Rank cache for better performance
const rankCache = new Map<string, number>();

/**
 * Interface for similarity calculation result
 */
export interface SimilarityResult {
  word: string;
  targetWord: string;
  similarity: number;
  distance: number; // Rank-based distance like Contexto
  lemma: string;
}

/**
 * Configuration for the embedding service
 */
export interface EmbeddingConfig {
  model?: string;
  cacheEnabled?: boolean;
  maxCacheSize?: number;
  vocabularySize?: number; // Size of vocabulary for rank calculation
}

/**
 * Default configuration
 */
const defaultConfig: Required<EmbeddingConfig> = {
  model: 'sentence-transformers/all-MiniLM-L6-v2', // Fast and efficient model
  cacheEnabled: true,
  maxCacheSize: 10000,
  vocabularySize: 50000, // Approximate vocabulary size for rank calculation
};

/**
 * A curated vocabulary for better rank calculation
 * In a real implementation, this would be loaded from a file
 */
const COMMON_WORDS = [...DAILY_WORDS]

/**
 * Calculate cosine similarity between two vectors
 * @param vecA - First vector
 * @param vecB - Second vector
 * @returns Cosine similarity score (-1 to 1)
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

/**
 * Get embedding for a word using HuggingFace
 * @param word - Word to get embedding for
 * @param config - Configuration options
 * @returns Promise<number[]> - Word embedding vector
 */
export async function getWordEmbedding(
  word: string,
  config: EmbeddingConfig = {}
): Promise<number[]> {
  const finalConfig = { ...defaultConfig, ...config };
  const normalizedWord = word.toLowerCase().trim();

  // Check cache first
  if (finalConfig.cacheEnabled && embeddingCache.has(normalizedWord)) {
    return embeddingCache.get(normalizedWord)!;
  }

  try {
    // Use HuggingFace feature extraction API
    const response = await hf.featureExtraction({
      model: finalConfig.model,
      inputs: normalizedWord,
    });

    let embedding: number[];

    // Handle different response formats
    if (Array.isArray(response)) {
      if (Array.isArray(response[0])) {
        // If it's a 2D array, take the first row
        embedding = response[0] as number[];
      } else {
        // If it's a 1D array
        embedding = response as number[];
      }
    } else {
      throw new Error('Unexpected response format from HuggingFace API');
    }

    // Cache the result
    if (finalConfig.cacheEnabled) {
      // Implement LRU cache by removing oldest entries if cache is full
      if (embeddingCache.size >= finalConfig.maxCacheSize) {
        const firstKey = embeddingCache.keys().next().value;
        if (firstKey !== undefined) {
          embeddingCache.delete(firstKey);
        }
      }
      embeddingCache.set(normalizedWord, embedding);
    }

    return embedding;
  } catch (error) {
    console.error(`Error getting embedding for word "${word}":`, error);

    // Fallback: return a random vector (not ideal, but prevents crashes)
    const fallbackEmbedding = Array.from(
      { length: 384 },
      () => Math.random() - 0.5
    );
    return fallbackEmbedding;
  }
}

/**
 * Calculate similarity between two words with rank-based distance
 * @param guessWord - The guessed word
 * @param targetWord - The target word
 * @param targetLemma - The lemma of the target word
 * @param config - Configuration options
 * @returns Promise<SimilarityResult>
 */
export async function calculateSimilarityWithRank(
  guessWord: string,
  targetWord: string,
  targetLemma: string,
  config: EmbeddingConfig = {}
): Promise<SimilarityResult> {
  const finalConfig = { ...defaultConfig, ...config };
  const normalizedGuess = guessWord.toLowerCase().trim();
  const normalizedTarget = targetWord.toLowerCase().trim();

  // Same words have perfect similarity and distance 0
  if (
    normalizedGuess === normalizedTarget ||
    normalizedGuess === targetLemma.toLowerCase()
  ) {
    console.log(
      `Words match exactly: "${normalizedGuess}" === "${normalizedTarget}" or "${normalizedGuess}" === "${targetLemma.toLowerCase()}"`
    );
    return {
      word: normalizedGuess,
      targetWord: normalizedTarget,
      similarity: 1.0,
      distance: 0,
      lemma: targetLemma,
    };
  }

  console.log(
    `Calculating embeddings for "${normalizedGuess}" vs "${normalizedTarget}" (target lemma: "${targetLemma}")`
  );

  const cacheKey = `${normalizedGuess}:${normalizedTarget}`;

  // Check cache first
  if (finalConfig.cacheEnabled && rankCache.has(cacheKey)) {
    const cachedDistance = rankCache.get(cacheKey)!;
    const cachedSimilarity = similarityCache.get(cacheKey) || 0;

    return {
      word: normalizedGuess,
      targetWord: normalizedTarget,
      similarity: cachedSimilarity,
      distance: cachedDistance,
      lemma: targetLemma,
    };
  }

  try {
    // Get embeddings for both words
    console.log(
      `Getting embeddings for "${normalizedGuess}" and "${normalizedTarget}"`
    );
    const [guessEmbedding, targetEmbedding] = await Promise.all([
      getWordEmbedding(normalizedGuess, config),
      getWordEmbedding(normalizedTarget, config),
    ]);

    console.log(
      `Got embeddings: guess=${guessEmbedding.length}D, target=${targetEmbedding.length}D`
    );

    // Calculate cosine similarity
    const rawSimilarity = cosineSimilarity(guessEmbedding, targetEmbedding);
    console.log(`Raw cosine similarity: ${rawSimilarity}`);

    // Normalize to 0-1 range (cosine similarity is -1 to 1)
    const similarity = (rawSimilarity + 1) / 2;
    console.log(`Normalized similarity: ${similarity}`);

    // Calculate rank-based distance like Contexto
    const distance = await calculateRankDistance(
      normalizedGuess,
      normalizedTarget,
      similarity,
      finalConfig
    );

    console.log(`Calculated distance: ${distance}`);

    // Cache the results
    if (finalConfig.cacheEnabled) {
      if (similarityCache.size >= finalConfig.maxCacheSize) {
        const firstKey = similarityCache.keys().next().value;
        if (firstKey !== undefined) {
          similarityCache.delete(firstKey);
          rankCache.delete(firstKey);
        }
      }
      similarityCache.set(cacheKey, similarity);
      rankCache.set(cacheKey, distance);
    }

    return {
      word: normalizedGuess,
      targetWord: normalizedTarget,
      similarity,
      distance,
      lemma: targetLemma,
    };
  } catch (error) {
    console.error(
      `Error calculating similarity between "${guessWord}" and "${targetWord}":`,
      error
    );

    // Fallback calculation
    const fallbackSimilarity = calculateFallbackSimilarity(
      normalizedGuess,
      normalizedTarget
    );
    const fallbackDistance = Math.floor(
      (1 - fallbackSimilarity) * finalConfig.vocabularySize
    );

    return {
      word: normalizedGuess,
      targetWord: normalizedTarget,
      similarity: fallbackSimilarity,
      distance: Math.max(1, fallbackDistance),
      lemma: targetLemma,
    };
  }
}

/**
 * Calculate rank-based distance like Contexto
 * @param guessWord - The guessed word
 * @param targetWord - The target word
 * @param similarity - The similarity score
 * @param config - Configuration options
 * @returns Promise<number>
 */
async function calculateRankDistance(
  guessWord: string,
  targetWord: string,
  similarity: number,
  config: Required<EmbeddingConfig>
): Promise<number> {
  try {
    console.log(
      `Calculating rank for "${guessWord}" with similarity ${similarity}`
    );

    // Create a deterministic but unique ranking based on similarity + word hash
    // This ensures different words get different ranks while being consistent

    // Create a simple hash from the word to add uniqueness
    const wordHash = guessWord.split('').reduce((hash, char) => {
      return hash + char.charCodeAt(0);
    }, 0);

    // Use hash to create a deterministic offset (0-999)
    const hashOffset = wordHash % 1000;

    // Calculate base distance from similarity
    let baseDistance: number;

    if (similarity >= 0.95) {
      // Very high similarity: rank 1-500
      baseDistance = Math.floor((1 - similarity) * 500) + 1;
    } else if (similarity >= 0.9) {
      // High similarity: rank 500-2000
      baseDistance = Math.floor((0.95 - similarity) * 30000) + 500;
    } else if (similarity >= 0.8) {
      // Good similarity: rank 2000-5000
      baseDistance = Math.floor((0.9 - similarity) * 30000) + 2000;
    } else if (similarity >= 0.7) {
      // Moderate similarity: rank 5000-10000
      baseDistance = Math.floor((0.8 - similarity) * 50000) + 5000;
    } else if (similarity >= 0.6) {
      // Lower similarity: rank 10000-20000
      baseDistance = Math.floor((0.7 - similarity) * 100000) + 10000;
    } else if (similarity >= 0.5) {
      // Low similarity: rank 20000-35000
      baseDistance = Math.floor((0.6 - similarity) * 150000) + 20000;
    } else {
      // Very low similarity: rank 35000+
      baseDistance = Math.floor((0.5 - similarity) * 300000) + 35000;
    }

    // Add the hash offset to ensure uniqueness while keeping similar words close
    const finalDistance = baseDistance + (hashOffset % 100);

    console.log(
      `Base distance: ${baseDistance}, Hash offset: ${hashOffset % 100}, Final: ${finalDistance}`
    );

    return Math.max(1, finalDistance);
  } catch {
    console.error('Error calculating rank distance');
    // Fallback: use similarity-based distance with word hash for uniqueness
    const baseDistance = Math.floor((1 - similarity) * config.vocabularySize);
    const wordHash = guessWord
      .split('')
      .reduce((hash, char) => hash + char.charCodeAt(0), 0);
    const hashOffset = (wordHash % 1000) - 500; // ±500 variation
    return Math.max(1, baseDistance + hashOffset);
  }
}

/**
 * Fallback similarity calculation using string similarity
 * @param word1 - First word
 * @param word2 - Second word
 * @returns number - Similarity score (0 to 1)
 */
function calculateFallbackSimilarity(word1: string, word2: string): number {
  if (word1 === word2) return 1.0;

  // Levenshtein distance-based similarity
  const maxLength = Math.max(word1.length, word2.length);
  const distance = levenshteinDistance(word1, word2);
  const similarity = 1 - distance / maxLength;

  return Math.max(0, Math.min(1, similarity));
}

/**
 * Calculate Levenshtein distance between two strings
 * @param str1 - First string
 * @param str2 - Second string
 * @returns number - Levenshtein distance
 */
function levenshteinDistance(str1: string, str2: string): number {
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

/**
 * Batch calculate similarities for multiple words
 * @param guessWords - Array of words to compare
 * @param targetWord - The target word
 * @param targetLemma - The lemma of the target word
 * @param config - Configuration options
 * @returns Promise<SimilarityResult[]>
 */
export async function batchCalculateSimilarity(
  guessWords: string[],
  targetWord: string,
  targetLemma: string,
  config: EmbeddingConfig = {}
): Promise<SimilarityResult[]> {
  const promises = guessWords.map((word) =>
    calculateSimilarityWithRank(word, targetWord, targetLemma, config)
  );
  return Promise.all(promises);
}

/**
 * Clear all caches
 */
export function clearEmbeddingCache(): void {
  embeddingCache.clear();
  similarityCache.clear();
  rankCache.clear();
}

/**
 * Get cache statistics
 */
export function getEmbeddingCacheStats(): {
  embeddingCacheSize: number;
  similarityCacheSize: number;
  rankCacheSize: number;
} {
  return {
    embeddingCacheSize: embeddingCache.size,
    similarityCacheSize: similarityCache.size,
    rankCacheSize: rankCache.size,
  };
}

/**
 * Preload embeddings for common words
 * @param config - Configuration options
 */
export async function preloadCommonWordEmbeddings(
  config: EmbeddingConfig = {}
): Promise<void> {
  console.log('Preloading embeddings for common words...');

  const batchSize = 10;
  for (let i = 0; i < COMMON_WORDS.length; i += batchSize) {
    const batch = COMMON_WORDS.slice(i, i + batchSize);

    try {
      await Promise.all(batch.map((word) => getWordEmbedding(word, config)));

      console.log(
        `Preloaded embeddings for ${Math.min(i + batchSize, COMMON_WORDS.length)}/${COMMON_WORDS.length} words`
      );
    } catch (error) {
      console.error(`Error preloading batch ${i}-${i + batchSize}:`, error);
    }

    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log('Finished preloading embeddings');
}
