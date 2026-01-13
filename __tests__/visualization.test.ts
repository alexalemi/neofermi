/**
 * Tests for visualization module
 *
 * Note: Canvas rendering tests require a DOM environment.
 * These tests focus on data calculation functions.
 */

import { describe, it, expect } from 'vitest'
import { calculateDotplotData, calculateHistogramData } from '../src/visualization/index.js'

describe('Visualization', () => {
  describe('calculateDotplotData', () => {
    it('calculates quantile positions correctly', () => {
      // Simple case: values 1-100
      const samples = Array.from({ length: 100 }, (_, i) => i + 1)
      const data = calculateDotplotData(samples, 10)

      expect(data.quantiles).toHaveLength(10)
      expect(data.min).toBe(1)
      expect(data.max).toBe(100)

      // Quantiles are at bin centers: (i + 0.5) / numDots
      // For 10 dots: 0.05, 0.15, 0.25, 0.35, 0.45...
      // Index = floor(p * n), so for p=0.05, n=100: index=5, value=6 (1-indexed data)
      expect(data.quantiles[0]).toBe(6) // floor(0.05 * 100) + 1
      expect(data.quantiles[4]).toBe(46) // floor(0.45 * 100) + 1
    })

    it('handles single value', () => {
      const samples = [42, 42, 42, 42, 42]
      const data = calculateDotplotData(samples, 5)

      expect(data.quantiles).toHaveLength(5)
      expect(data.min).toBe(42)
      expect(data.max).toBe(42)
      data.quantiles.forEach((q) => expect(q).toBe(42))
    })

    it('preserves unit information', () => {
      const samples = [1, 2, 3, 4, 5]
      const data = calculateDotplotData(samples, 3, 'meters')

      expect(data.unit).toBe('meters')
    })
  })

  describe('calculateHistogramData', () => {
    it('calculates histogram bins correctly', () => {
      // Values clustered in two groups
      const samples = [...Array(50).fill(10), ...Array(50).fill(90)]
      const data = calculateHistogramData(samples, 10)

      expect(data.bins).toHaveLength(10)
      expect(data.binEdges).toHaveLength(11)
      expect(data.min).toBe(10)
      expect(data.max).toBe(90)

      // First bin (10-18) should have 50 counts
      expect(data.bins[0]).toBe(50)
      // Last bin (82-90) should have 50 counts
      expect(data.bins[9]).toBe(50)
      // Middle bins should be empty
      for (let i = 1; i < 9; i++) {
        expect(data.bins[i]).toBe(0)
      }
    })

    it('handles uniform distribution', () => {
      const samples = Array.from({ length: 100 }, (_, i) => i)
      const data = calculateHistogramData(samples, 10)

      // Each bin should have roughly equal counts
      data.bins.forEach((count) => {
        expect(count).toBeGreaterThanOrEqual(9)
        expect(count).toBeLessThanOrEqual(11)
      })
    })

    it('handles constant values', () => {
      const samples = Array(100).fill(42)
      const data = calculateHistogramData(samples, 5)

      expect(data.min).toBe(42)
      expect(data.max).toBe(42)
      // All values go to first bin when range is 0
      expect(data.bins[0]).toBe(100)
    })

    it('preserves unit information', () => {
      const samples = [1, 2, 3, 4, 5]
      const data = calculateHistogramData(samples, 3, 'kg')

      expect(data.unit).toBe('kg')
    })
  })
})
