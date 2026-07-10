/**
 * Deterministic PRNG utilities.
 *
 * mulberry32 — fast, passes SmallCrush, adequate for reproducible Monte
 * Carlo. The same generator seeds the test suite (__tests__/setup.ts) and
 * `neoferminb annotate`, which needs byte-identical output across runs.
 */

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Run `fn` with Math.random replaced by a seeded generator, restoring the
 * real entropy source afterwards (also on throw). Samplers throughout
 * src/distributions/ draw from Math.random, so this makes any sampling
 * inside `fn` deterministic.
 */
export function withSeededRandom<T>(seed: number, fn: () => T): T {
  const realRandom = Math.random
  Math.random = mulberry32(seed)
  try {
    return fn()
  } finally {
    Math.random = realRandom
  }
}
