import { HfInference } from '@huggingface/inference';

// HuggingFace inference client
const hf = new HfInference(process.env.HUGGINGFACE_API_TOKEN);

// Cache for embeddings to avoid repeated API calls
const embeddingCache = new Map<string, number[]>();

// Cache for similarity calculations
const similarityCache = new Map<string, number>();

/**
 * Interface for word similarity calculation
 */
export interface WordSimilarityResult {
  word: string;
  similarity: number;
  position?: number;
}

/**
 * Configuration for the word similarity service
 */
export interface SimilarityConfig {
  model?: string;
  cacheEnabled?: boolean;
  maxCacheSize?: number;
}

/**
 * Default configuration
 */
const defaultConfig: Required<SimilarityConfig> = {
  model: 'sentence-transformers/all-MiniLM-L6-v2', // Free, fast, and good quality model
  cacheEnabled: true,
  maxCacheSize: 10000,
};

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
  config: SimilarityConfig = {}
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
 * Calculate similarity between two words
 * @param word1 - First word
 * @param word2 - Second word
 * @param config - Configuration options
 * @returns Promise<number> - Similarity score (0 to 1)
 */
export async function calculateWordSimilarity(
  word1: string,
  word2: string,
  config: SimilarityConfig = {}
): Promise<number> {
  const finalConfig = { ...defaultConfig, ...config };
  const normalizedWord1 = word1.toLowerCase().trim();
  const normalizedWord2 = word2.toLowerCase().trim();

  // Same words have perfect similarity
  if (normalizedWord1 === normalizedWord2) {
    return 1.0;
  }

  const cacheKey = `${normalizedWord1}:${normalizedWord2}`;
  const reverseCacheKey = `${normalizedWord2}:${normalizedWord1}`;

  // Check cache first
  if (finalConfig.cacheEnabled) {
    if (similarityCache.has(cacheKey)) {
      return similarityCache.get(cacheKey)!;
    }
    if (similarityCache.has(reverseCacheKey)) {
      return similarityCache.get(reverseCacheKey)!;
    }
  }

  try {
    // Get embeddings for both words
    const [embedding1, embedding2] = await Promise.all([
      getWordEmbedding(normalizedWord1, config),
      getWordEmbedding(normalizedWord2, config),
    ]);

    // Calculate cosine similarity
    const similarity = cosineSimilarity(embedding1, embedding2);

    // Normalize to 0-1 range (cosine similarity is -1 to 1)
    const normalizedSimilarity = (similarity + 1) / 2;

    // Cache the result
    if (finalConfig.cacheEnabled) {
      // Implement LRU cache
      if (similarityCache.size >= finalConfig.maxCacheSize) {
        const firstKey = similarityCache.keys().next().value;
        if (firstKey !== undefined) {
          similarityCache.delete(firstKey);
        }
      }
      similarityCache.set(cacheKey, normalizedSimilarity);
    }

    return normalizedSimilarity;
  } catch (error) {
    console.error(
      `Error calculating similarity between "${word1}" and "${word2}":`,
      error
    );
    return 0; // Return 0 similarity on error
  }
}

/**
 * Calculate similarities between a target word and multiple words
 * @param targetWord - The secret/target word
 * @param words - Array of words to compare
 * @param config - Configuration options
 * @returns Promise<WordSimilarityResult[]> - Array of similarity results
 */
export async function calculateMultipleWordSimilarities(
  targetWord: string,
  words: string[],
  config: SimilarityConfig = {}
): Promise<WordSimilarityResult[]> {
  const similarities = await Promise.all(
    words.map(async (word) => ({
      word,
      similarity: await calculateWordSimilarity(targetWord, word, config),
    }))
  );

  // Sort by similarity (highest first) and add positions
  const sorted = similarities
    .sort((a, b) => b.similarity - a.similarity)
    .map((result, index) => ({
      ...result,
      position: index + 1,
    }));

  return sorted;
}

/**
 * Get the position/rank of a word compared to a target word among a list of words
 * @param targetWord - The secret/target word
 * @param queryWord - The word to find the position for
 * @param allWords - All words in the game
 * @param config - Configuration options
 * @returns Promise<number> - Position (1-based)
 */
export async function getWordPosition(
  targetWord: string,
  queryWord: string,
  allWords: string[],
  config: SimilarityConfig = {}
): Promise<number> {
  const results = await calculateMultipleWordSimilarities(
    targetWord,
    allWords,
    config
  );
  const wordResult = results.find(
    (r) => r.word.toLowerCase() === queryWord.toLowerCase()
  );
  return wordResult?.position || allWords.length + 1;
}

/**
 * Clear all caches
 */
export function clearCache(): void {
  embeddingCache.clear();
  similarityCache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    embeddingCacheSize: embeddingCache.size,
    similarityCacheSize: similarityCache.size,
  };
}
