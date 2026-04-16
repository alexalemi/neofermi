/**
 * Test setup: seed Math.random with a deterministic PRNG so Monte Carlo
 * assertions (means, stds, percentiles of sampled distributions) are stable.
 *
 * Uses mulberry32 — fast, passes SmallCrush, adequate for test determinism.
 * Each test resets the seed to the same value so tests are independent.
 */

import { beforeEach } from 'vitest'

const DEFAULT_SEED = 0x12345678

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const realRandom = Math.random

beforeEach(() => {
  Math.random = mulberry32(DEFAULT_SEED)
})

// Expose a helper so individual tests can override the seed if needed.
;(globalThis as { seedRandom?: (seed: number) => void }).seedRandom = (seed: number) => {
  Math.random = mulberry32(seed)
}

// Expose a way to restore real entropy if a test explicitly needs it.
;(globalThis as { unseedRandom?: () => void }).unseedRandom = () => {
  Math.random = realRandom
}
