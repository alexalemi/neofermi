import { describe, it, expect } from 'vitest'
import { lognormal, normal, uniform, plusminus, outof, gamma, to } from '../src/index.js'

describe('Distributions', () => {
  const TOLERANCE = 0.1 // 10% tolerance for statistical tests

  describe('lognormal', () => {
    it('creates distribution with correct sample count', () => {
      const q = lognormal(10, 100, undefined, 0.9, 1000)
      expect(q.sampleCount).toBe(1000)
    })

    it('has mean in expected range', () => {
      // Geometric mean of 10 and 100 is sqrt(1000) ≈ 31.6
      // But lognormal mean is actually higher than geometric mean
      const q = lognormal(10, 100, undefined, 0.9, 20000)
      const mean = q.mean()
      expect(mean).toBeGreaterThan(20) // Above geometric mean
      expect(mean).toBeLessThan(60) // Below upper bound
    })

    it('has 5th and 95th percentiles near bounds', () => {
      const q = lognormal(10, 100, undefined, 0.9, 20000)
      const p5 = q.percentile(0.05)
      const p95 = q.percentile(0.95)

      // Should be roughly near the bounds (within 20%)
      expect(p5).toBeGreaterThan(10 * 0.8)
      expect(p5).toBeLessThan(10 * 1.2)
      expect(p95).toBeGreaterThan(100 * 0.8)
      expect(p95).toBeLessThan(100 * 1.2)
    })

    it('throws on non-positive bounds', () => {
      expect(() => lognormal(-1, 10)).toThrow()
      expect(() => lognormal(0, 10)).toThrow()
    })

    it('respects units', () => {
      const q = lognormal(10, 100, 'meters', 0.9, 100)
      expect(q.unit.toString()).toBe('meters')
    })
  })

  describe('normal', () => {
    it('has mean near center of range', () => {
      const q = normal(0, 100, undefined, 0.9, 20000)
      const mean = q.mean()
      expect(mean).toBeGreaterThan(48)
      expect(mean).toBeLessThan(52)
    })

    it('has 5th and 95th percentiles near bounds', () => {
      const q = normal(0, 100, undefined, 0.9, 20000)
      const p5 = q.percentile(0.05)
      const p95 = q.percentile(0.95)

      // Should be within 10% of the bounds
      expect(p5).toBeGreaterThan(-5)
      expect(p5).toBeLessThan(5)
      expect(p95).toBeGreaterThan(95)
      expect(p95).toBeLessThan(105)
    })

    it('handles negative values', () => {
      const q = normal(-50, 50, undefined, 0.9, 1000)
      const mean = q.mean()
      // With 1000 samples, expect within a couple units of zero
      expect(mean).toBeGreaterThan(-3)
      expect(mean).toBeLessThan(3)
    })
  })

  describe('plusminus', () => {
    it('has correct mean and std', () => {
      const q = plusminus(100, 10, undefined, 20000)
      expect(q.mean()).toBeCloseTo(100, 0) // Within 0.5
      expect(q.std()).toBeCloseTo(10, 0) // Within 0.5
    })
  })

  describe('uniform', () => {
    it('has mean near center', () => {
      const q = uniform(0, 100, undefined, 20000)
      const mean = q.mean()
      expect(mean).toBeCloseTo(50, 0) // Within 0.5
    })

    it('has roughly flat distribution', () => {
      const q = uniform(0, 100, undefined, 20000)
      const p25 = q.percentile(0.25)
      const p50 = q.percentile(0.50)
      const p75 = q.percentile(0.75)

      // Should be close to 25, 50, 75 within a couple units
      expect(p25).toBeGreaterThan(23)
      expect(p25).toBeLessThan(27)
      expect(p50).toBeGreaterThan(48)
      expect(p50).toBeLessThan(52)
      expect(p75).toBeGreaterThan(73)
      expect(p75).toBeLessThan(77)
    })
  })

  describe('outof', () => {
    it('has mean near observed proportion', () => {
      const q = outof(7, 10, 20000)
      const mean = q.mean()
      // With Laplace smoothing: (7+1)/(10+2) = 8/12 ≈ 0.667
      expect(mean).toBeCloseTo(0.667, 1)
    })

    it('values are between 0 and 1', () => {
      const q = outof(5, 10, 1000)
      const values = q.toParticles()
      expect(Math.min(...values)).toBeGreaterThanOrEqual(0)
      expect(Math.max(...values)).toBeLessThanOrEqual(1)
    })

    it('tighter distribution with more data', () => {
      const q1 = outof(7, 10, 20000)
      const q2 = outof(70, 100, 20000)

      // Both have mean near 0.7, but q2 should have smaller std
      expect(q1.mean()).toBeCloseTo(q2.mean(), 1)
      expect(q2.std()).toBeLessThan(q1.std())
    })
  })

  describe('gamma', () => {
    it('creates positive values only', () => {
      const q = gamma(5, 1, undefined, 1000)
      const values = q.toParticles()
      expect(Math.min(...values)).toBeGreaterThan(0)
    })

    it('mean approximates shape*scale', () => {
      const shape = 10
      const scale = 2
      const q = gamma(shape, scale, undefined, 20000)
      const expectedMean = shape * scale
      expect(q.mean()).toBeCloseTo(expectedMean, -0.5) // Within order of magnitude
    })
  })

  describe('to (convenience)', () => {
    it('uses lognormal for positive bounds', () => {
      const q = to(10, 100, undefined, 0.9, 1000)
      // Should behave like lognormal
      const mean = q.mean()
      expect(mean).toBeGreaterThan(10)
      expect(mean).toBeLessThan(100)
    })

    it('uses normal for ranges including negative', () => {
      const q = to(-10, 10, undefined, 0.9, 1000)
      const mean = q.mean()
      // Should behave like normal - mean near 0
      expect(mean).toBeGreaterThan(-2)
      expect(mean).toBeLessThan(2)
    })
  })
})
