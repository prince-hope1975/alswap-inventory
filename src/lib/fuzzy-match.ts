/**
 * Fuzzy string matching utilities for product name similarity
 */

/**
 * Calculate Levenshtein distance between two strings
 * (minimum number of single-character edits needed to change one string into the other)
 */
export function levenshteinDistance(str1: string, str2: string): number {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();

    const len1 = s1.length;
    const len2 = s2.length;

    // Create a 2D array for dynamic programming
    const dp: number[][] = Array(len1 + 1)
        .fill(null)
        .map(() => Array(len2 + 1).fill(0));

    // Initialize first row and column
    for (let i = 0; i <= len1; i++) dp[i]![0] = i;
    for (let j = 0; j <= len2; j++) dp[0]![j] = j;

    // Fill the dp table
    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
            dp[i]![j] = Math.min(
                dp[i - 1]![j]! + 1,      // deletion
                dp[i]![j - 1]! + 1,      // insertion
                dp[i - 1]![j - 1]! + cost // substitution
            );
        }
    }

    return dp[len1]![len2]!;
}

/**
 * Calculate similarity score between two strings (0-1, where 1 is identical)
 */
export function similarityScore(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;

    const distance = levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);

    if (maxLength === 0) return 1;

    return 1 - distance / maxLength;
}

/**
 * Check if two strings are similar based on a threshold
 */
export function isSimilar(str1: string, str2: string, threshold = 0.7): boolean {
    return similarityScore(str1, str2) >= threshold;
}

/**
 * Find similar strings from a list
 */
export function findSimilar(
    target: string,
    candidates: string[],
    threshold = 0.7
): Array<{ value: string; score: number }> {
    return candidates
        .map((candidate) => ({
            value: candidate,
            score: similarityScore(target, candidate),
        }))
        .filter((item) => item.score >= threshold)
        .sort((a, b) => b.score - a.score);
}

/**
 * Check for exact match (case-insensitive)
 */
export function isExactMatch(str1: string, str2: string): boolean {
    return str1.toLowerCase().trim() === str2.toLowerCase().trim();
}
