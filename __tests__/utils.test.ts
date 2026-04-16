import { describe, it, expect } from 'vitest'
import { erf, erfinv, factor, randn, rand } from '../src/utils/math.js'

describe('Utility math functions', () => {
  describe('erf (error function)', () => {
    it('erf(0) = 0', () => {
      expect(erf(0)).toBeCloseTo(0, 5)
    })

    it('erf is odd function', () => {
      expect(erf(1)).toBeCloseTo(-erf(-1), 5)
    })

    it('erf(1) ≈ 0.8427', () => {
      expect(erf(1)).toBeCloseTo(0.8427, 3)
    })

    it('erf(2) ≈ 0.9953', () => {
      expect(erf(2)).toBeCloseTo(0.9953, 3)
    })

    it('erf approaches 1 for large values', () => {
      expect(erf(5)).toBeCloseTo(1, 5)
    })

    it('erf approaches -1 for large negative values', () => {
      expect(erf(-5)).toBeCloseTo(-1, 5)
    })
  })

  describe('erfinv (inverse error function)', () => {
    it('erfinv(0) = 0', () => {
      expect(erfinv(0)).toBeCloseTo(0, 5)
    })

    it('erfinv round-trips with erf', () => {
      const values = [0.1, 0.3, 0.5, 0.7, 0.9]
      for (const v of values) {
        expect(erf(erfinv(v))).toBeCloseTo(v, 2)
      }
    })

    it('erfinv(-1) returns -Infinity', () => {
      expect(erfinv(-1)).toBe(-Infinity)
    })

    it('erfinv(1) returns Infinity', () => {
      expect(erfinv(1)).toBe(Infinity)
    })

    it('erfinv out of range throws', () => {
      expect(() => erfinv(-1.1)).toThrow()
      expect(() => erfinv(1.1)).toThrow()
    })

    it('erfinv of negative values', () => {
      expect(erfinv(-0.5)).toBeCloseTo(-erfinv(0.5), 2)
    })
  })

  describe('factor (percentile to std devs)', () => {
    it('factor(0.5) = 0 (median)', () => {
      expect(factor(0.5)).toBeCloseTo(0, 5)
    })

    it('factor(0.1587) ≈ -1 (one std dev below)', () => {
      // P(Z < -1) ≈ 0.1587
      expect(factor(0.1587)).toBeCloseTo(-1, 1)
    })

    it('factor(0.8413) ≈ 1 (one std dev above)', () => {
      // P(Z < 1) ≈ 0.8413
      expect(factor(0.8413)).toBeCloseTo(1, 1)
    })

    it('factor(0.025) ≈ -1.96 (2.5th percentile)', () => {
      expect(factor(0.025)).toBeCloseTo(-1.96, 1)
    })
  })

  describe('randn (random normal)', () => {
    it('generates requested number of samples', () => {
      expect(randn(10)).toHaveLength(10)
      expect(randn(100)).toHaveLength(100)
      expect(randn(1)).toHaveLength(1)
    })

    it('generates odd number of samples', () => {
      // Box-Muller generates pairs, so odd count needs special handling
      expect(randn(3)).toHaveLength(3)
      expect(randn(7)).toHaveLength(7)
    })

    it('has approximately zero mean for large n', () => {
      const samples = randn(10000)
      const mean = samples.reduce((a, b) => a + b, 0) / samples.length
      expect(mean).toBeCloseTo(0, 1)
    })

    it('has approximately unit variance for large n', () => {
      const samples = randn(10000)
      const mean = samples.reduce((a, b) => a + b, 0) / samples.length
      const variance = samples.reduce((sum, x) => sum + (x - mean) ** 2, 0) / samples.length
      expect(variance).toBeCloseTo(1, 0)
    })

    it('contains negative values', () => {
      const samples = randn(100)
      expect(samples.some(v => v < 0)).toBe(true)
    })
  })

  describe('rand (random uniform)', () => {
    it('generates requested number of samples', () => {
      expect(rand(10)).toHaveLength(10)
      expect(rand(1)).toHaveLength(1)
    })

    it('all values in [0, 1)', () => {
      const samples = rand(1000)
      samples.forEach(v => {
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThan(1)
      })
    })

    it('has approximately 0.5 mean for large n', () => {
      const samples = rand(10000)
      const mean = samples.reduce((a, b) => a + b, 0) / samples.length
      expect(mean).toBeCloseTo(0.5, 1)
    })
  })
})
