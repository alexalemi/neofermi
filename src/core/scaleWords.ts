/**
 * Scale word multipliers — "1 million USD", "3 thousand years", etc.
 *
 * Long-form words are the canonical set: the grammar's `ScaleWord` rule
 * must list these same keys so parse-time and eval-time agree on what
 * qualifies as a scale word.
 *
 * Short-form abbreviations (K/M/B/T) are NOT listed in the grammar's
 * ScaleWord rule — they parse as bare identifiers and fall through the
 * back-compat "unit slot is really a multiplier" path in the evaluator.
 */

export const LONG_SCALE_WORDS = {
  hundred: 1e2,
  thousand: 1e3,
  million: 1e6,
  billion: 1e9,
  trillion: 1e12,
  quadrillion: 1e15,
  quintillion: 1e18,
  sextillion: 1e21,
  septillion: 1e24,
} as const

export const SHORT_SCALE_WORDS = {
  K: 1e3,
  M: 1e6,
  B: 1e9,
  T: 1e12,
} as const

export const SCALE_WORDS: Record<string, number> = {
  ...LONG_SCALE_WORDS,
  ...SHORT_SCALE_WORDS,
}

export type LongScaleWord = keyof typeof LONG_SCALE_WORDS
