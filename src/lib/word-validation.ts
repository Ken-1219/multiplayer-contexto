import axios from 'axios';
import natural from 'natural';

/**
 * Interface for word validation result
 */
export interface WordValidationResult {
  isValid: boolean;
  error?: string;
  lemma?: string;
  word: string;
}

/**
 * Interface for lemmatization result
 */
export interface LemmatizationResult {
  original: string;
  lemma: string;
  success: boolean;
}

/**
 * Cache for word validation results to avoid repeated API calls
 */
const validationCache = new Map<string, WordValidationResult>();
const lemmaCache = new Map<string, string>();

/**
 * Configuration for word validation
 */
export interface ValidationConfig {
  cacheEnabled?: boolean;
  maxCacheSize?: number;
  timeout?: number;
}

const defaultConfig: Required<ValidationConfig> = {
  cacheEnabled: true,
  maxCacheSize: 5000,
  timeout: 5000,
};

/**
 * Validate a word using multiple strategies
 * @param word - Word to validate
 * @param config - Configuration options
 * @returns Promise<WordValidationResult>
 */
export async function validateWord(
  word: string,
  config: ValidationConfig = {}
): Promise<WordValidationResult> {
  const finalConfig = { ...defaultConfig, ...config };
  const normalizedWord = word.toLowerCase().trim();

  // Basic validation
  if (!normalizedWord || normalizedWord.length < 2) {
    return {
      isValid: false,
      error: 'Word must be at least 2 characters long',
      word: normalizedWord,
    };
  }

  if (normalizedWord.length > 50) {
    return {
      isValid: false,
      error: 'Word must be less than 50 characters',
      word: normalizedWord,
    };
  }

  // Allow only letters, hyphens, and apostrophes
  const validWordRegex = /^[a-zA-Z\-']+$/;
  if (!validWordRegex.test(normalizedWord)) {
    return {
      isValid: false,
      error: 'Word can only contain letters, hyphens, and apostrophes',
      word: normalizedWord,
    };
  }

  // Check cache first
  if (finalConfig.cacheEnabled && validationCache.has(normalizedWord)) {
    return validationCache.get(normalizedWord)!;
  }

  try {
    // Try multiple validation strategies
    const isValid = await isValidEnglishWord(normalizedWord, finalConfig);
    const lemma = await getLemma(normalizedWord, finalConfig);

    const result: WordValidationResult = {
      isValid,
      word: normalizedWord,
      lemma,
      ...(isValid ? {} : { error: "Word doesn't exist in English dictionary" }),
    };

    // Cache the result
    if (finalConfig.cacheEnabled) {
      if (validationCache.size >= finalConfig.maxCacheSize) {
        const firstKey = validationCache.keys().next().value;
        if (firstKey !== undefined) {
          validationCache.delete(firstKey);
        }
      }
      validationCache.set(normalizedWord, result);
    }

    return result;
  } catch (error) {
    console.error(`Error validating word "${word}":`, error);

    // Fallback: use basic validation
    const fallbackLemma = await getLemmaFallback(normalizedWord);
    return {
      isValid: true, // Assume valid on error to not block gameplay
      word: normalizedWord,
      lemma: fallbackLemma,
    };
  }
}

/**
 * Check if a word is valid using online dictionary API
 * @param word - Word to check
 * @param config - Configuration options
 * @returns Promise<boolean>
 */
async function isValidEnglishWord(
  word: string,
  config: Required<ValidationConfig>
): Promise<boolean> {
  try {
    // Use Free Dictionary API
    const response = await axios.get(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`,
      {
        timeout: config.timeout,
        validateStatus: (status) => status < 500, // Don't throw on 404
      }
    );

    return (
      response.status === 200 &&
      Array.isArray(response.data) &&
      response.data.length > 0
    );
  } catch {
    // If API fails, try WordsAPI as backup
    try {
      const wordsApiResponse = await axios.get(
        `https://wordsapiv1.p.rapidapi.com/words/${word}`,
        {
          timeout: config.timeout,
          headers: {
            'X-RapidAPI-Key': process.env.WORDS_API_KEY || '',
            'X-RapidAPI-Host': 'wordsapiv1.p.rapidapi.com',
          },
          validateStatus: (status) => status < 500,
        }
      );

      return wordsApiResponse.status === 200;
    } catch {
      // If both APIs fail, use local fallback
      return isValidWordFallback(word);
    }
  }
}

/**
 * Get lemma (base form) of a word
 * @param word - Word to lemmatize
 * @param config - Configuration options
 * @returns Promise<string>
 */
export async function getLemma(
  word: string,
  config: ValidationConfig = {}
): Promise<string> {
  const finalConfig = { ...defaultConfig, ...config };
  const normalizedWord = word.toLowerCase().trim();

  // Check cache first
  if (finalConfig.cacheEnabled && lemmaCache.has(normalizedWord)) {
    return lemmaCache.get(normalizedWord)!;
  }

  try {
    // Try online lemmatization first
    const lemma = await getLemmaOnline(normalizedWord, finalConfig);

    // Cache the result
    if (finalConfig.cacheEnabled) {
      if (lemmaCache.size >= finalConfig.maxCacheSize) {
        const firstKey = lemmaCache.keys().next().value;
        if (firstKey !== undefined) {
          lemmaCache.delete(firstKey);
        }
      }
      lemmaCache.set(normalizedWord, lemma);
    }

    return lemma;
  } catch {
    // Fallback to local lemmatization
    return getLemmaFallback(normalizedWord);
  }
}

/**
 * Get lemma using online API
 * @param word - Word to lemmatize
 * @param config - Configuration options
 * @returns Promise<string>
 */
async function getLemmaOnline(
    word: string,
    config: Required<ValidationConfig>
): Promise<string> {
    try {
        // First try local lemmatization
        const localLemma = getLemmaFallback(word);
        
        // If we got a valid result from local lemmatization, return it
        if (localLemma && localLemma.trim() !== '') {
            return localLemma;
        }
        
        // Otherwise, use Free Dictionary API as backup
        const response = await axios.get(
            `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`,
            {
                timeout: config.timeout,
            }
        );

        if (
            response.status === 200 &&
            Array.isArray(response.data) &&
            response.data.length > 0
        ) {
            const entry = response.data[0];
            // The word in the response is often the lemma
            return entry.word || word;
        }
        
        // If API call didn't give us a useful result, return original word
        return word;
    } catch {
        // In case of error, return original word
        return word;
    }
}

/**
 * Fallback lemmatization using Natural library
 * @param word - Word to lemmatize
 * @returns string
 */
function getLemmaFallback(word: string): string {
  try {
    // Use Natural's stemmer as a basic lemmatizer
    const stemmed = natural.PorterStemmer.stem(word);

    // For better results, we can add some basic rules
    const basicLemma = applyBasicLemmaRules(word);

    // Return the better of the two
    return basicLemma.length >= stemmed.length ? basicLemma : stemmed;
  } catch {
    return word; // Return original word if lemmatization fails
  }
}

/**
 * Apply basic lemmatization rules
 * @param word - Word to lemmatize
 * @returns string
 */
function applyBasicLemmaRules(word: string): string {
  const lower = word.toLowerCase();

  // Handle common plural forms
  if (lower.endsWith('ies') && lower.length > 4) {
    return lower.slice(0, -3) + 'y';
  }
  if (lower.endsWith('es') && lower.length > 3 && !lower.endsWith('ses')) {
    const base = lower.slice(0, -2);
    if (
      base.endsWith('sh') ||
      base.endsWith('ch') ||
      base.endsWith('x') ||
      base.endsWith('z')
    ) {
      return base;
    }
    return lower.slice(0, -1); // Remove just 's'
  }
  if (lower.endsWith('s') && lower.length > 2) {
    return lower.slice(0, -1);
  }

  // Handle common verb forms
  if (lower.endsWith('ing') && lower.length > 4) {
    const base = lower.slice(0, -3);
    // Handle doubled consonants (running -> run)
    if (
      base.length > 2 &&
      base[base.length - 1] === base[base.length - 2] &&
      'bcdfghjklmnpqrstvwxyz'.includes(base[base.length - 1])
    ) {
      return base.slice(0, -1);
    }
    return base;
  }

  if (lower.endsWith('ed') && lower.length > 3) {
    const base = lower.slice(0, -2);
    // Handle doubled consonants
    if (
      base.length > 2 &&
      base[base.length - 1] === base[base.length - 2] &&
      'bcdfghjklmnpqrstvwxyz'.includes(base[base.length - 1])
    ) {
      return base.slice(0, -1);
    }
    return base;
  }

  return lower;
}

/**
 * Fallback word validation using basic heuristics
 * @param word - Word to validate
 * @returns boolean
 */
function isValidWordFallback(word: string): boolean {
  const lower = word.toLowerCase();

  // Very basic checks - in a real implementation, you'd use a word list
  // For now, we'll be permissive and assume most reasonable words are valid

  // Reject obviously invalid patterns
  if (lower.length < 2) return false;
  if (lower.length > 50) return false;

  // Reject words with too many repeated characters
  const repeatedCharCount = (lower.match(/(.)\1{3,}/g) || []).length;
  if (repeatedCharCount > 0) return false;

  // Reject words with no vowels (except some exceptions)
  const vowels = lower.match(/[aeiou]/g);
  if (
    !vowels &&
    !['by', 'my', 'gym', 'fly', 'dry', 'try', 'cry', 'sky', 'shy'].includes(
      lower
    )
  ) {
    return false;
  }

  // Accept most other words
  return true;
}

/**
 * Batch validate multiple words
 * @param words - Array of words to validate
 * @param config - Configuration options
 * @returns Promise<WordValidationResult[]>
 */
export async function validateWords(
  words: string[],
  config: ValidationConfig = {}
): Promise<WordValidationResult[]> {
  const promises = words.map((word) => validateWord(word, config));
  return Promise.all(promises);
}

/**
 * Clear validation cache
 */
export function clearValidationCache(): void {
  validationCache.clear();
  lemmaCache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  validationCacheSize: number;
  lemmaCacheSize: number;
} {
  return {
    validationCacheSize: validationCache.size,
    lemmaCacheSize: lemmaCache.size,
  };
}
