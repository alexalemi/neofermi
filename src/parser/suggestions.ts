/**
 * "Did you mean …?" suggestions for unknown identifiers, functions, and units.
 */

/** Levenshtein edit distance between two strings. */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  return matrix[b.length][a.length]
}

/**
 * Up to 3 candidates within `maxDistance` edits of `target` (case-insensitive),
 * closest first. Exact matches (distance 0) are excluded.
 */
export function findSimilar(target: string, candidates: string[], maxDistance = 3): string[] {
  const targetLower = target.toLowerCase()
  return candidates
    .map(c => ({ name: c, distance: levenshteinDistance(targetLower, c.toLowerCase()) }))
    .filter(s => s.distance <= maxDistance && s.distance > 0)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3)
    .map(s => s.name)
}

/** Render a suggestion list as a trailing message fragment (`. Did you mean 'x'?`). */
export function formatSuggestion(suggestions: string[]): string {
  if (suggestions.length === 0) return ''
  if (suggestions.length === 1) return `. Did you mean '${suggestions[0]}'?`
  const head = suggestions.slice(0, -1).map(s => `'${s}'`).join(', ')
  return `. Did you mean ${head} or '${suggestions[suggestions.length - 1]}'?`
}
