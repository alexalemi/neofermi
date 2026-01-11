import { describe, it, expect } from 'vitest'
import { Quantity } from '../src/core/Quantity.js'

describe('Quantity', () => {
  describe('construction', () => {
    it('creates a scalar quantity', () => {
      const q = new Quantity(5, 'meters')
      expect(q.isScalar()).toBe(true)
      expect(q.isDistribution()).toBe(false)
      expect(q.value).toBe(5)
    })

    it('creates a distribution quantity', () => {
      const q = new Quantity([1, 2, 3, 4, 5], 'meters')
      expect(q.isDistribution()).toBe(true)
      expect(q.isScalar()).toBe(false)
      expect(q.sampleCount).toBe(5)
    })

    it('creates dimensionless quantity', () => {
      const q = new Quantity(10)
      expect(q.unit.toString()).toBe('')
    })
  })

  describe('statistics', () => {
    it('calculates mean correctly', () => {
      const q = new Quantity([1, 2, 3, 4, 5])
      expect(q.mean()).toBe(3)
    })

    it('calculates median correctly', () => {
      const q = new Quantity([1, 2, 3, 4, 5])
      expect(q.median()).toBe(3)
    })

    it('calculates std correctly', () => {
      const q = new Quantity([1, 2, 3, 4, 5])
      const std = q.std()
      expect(std).toBeCloseTo(Math.sqrt(2), 5)
    })

    it('calculates percentile correctly', () => {
      const q = new Quantity([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
      // Median of 10 values: between 5 and 6
      const median = q.percentile(0.5)
      expect(median).toBeGreaterThanOrEqual(5)
      expect(median).toBeLessThanOrEqual(6)
      expect(q.percentile(0.0)).toBe(1)
      expect(q.percentile(1.0)).toBe(10)
    })

    it('returns scalar value for scalar quantities', () => {
      const q = new Quantity(42)
      expect(q.mean()).toBe(42)
      expect(q.median()).toBe(42)
      expect(q.std()).toBe(0)
      expect(q.percentile(0.5)).toBe(42)
    })
  })

  describe('arithmetic', () => {
    it('adds compatible quantities', () => {
      const a = new Quantity(3, 'meters')
      const b = new Quantity(4, 'meters')
      const c = a.add(b)
      expect(c.value).toBe(7)
      expect(c.unit.toString()).toBe('meters')
    })

    it('throws on incompatible addition', () => {
      const a = new Quantity(3, 'meters')
      const b = new Quantity(4, 'seconds')
      expect(() => a.add(b)).toThrow()
    })

    it('multiplies quantities', () => {
      const a = new Quantity(3, 'meters')
      const b = new Quantity(4, 'seconds')
      const c = a.multiply(b)
      expect(c.value).toBe(12)
      expect(c.unit.toString()).toContain('meter')
      expect(c.unit.toString()).toContain('second')
    })

    it('divides quantities', () => {
      const a = new Quantity(12, 'meters')
      const b = new Quantity(4, 'seconds')
      const c = a.divide(b)
      expect(c.value).toBe(3)
    })

    it('handles power operation', () => {
      const a = new Quantity(3, 'meters')
      const b = a.pow(2)
      expect(b.value).toBe(9)
    })

    it('element-wise addition of distributions', () => {
      const a = new Quantity([1, 2, 3])
      const b = new Quantity([4, 5, 6])
      const c = a.add(b)
      expect(Array.isArray(c.value)).toBe(true)
      expect((c.value as number[]).length).toBe(3)
      expect(c.value).toEqual([5, 7, 9])
    })

    it('broadcasts scalar with distribution', () => {
      const a = new Quantity(10)
      const b = new Quantity([1, 2, 3])
      const c = a.add(b)
      expect(Array.isArray(c.value)).toBe(true)
      expect((c.value as number[]).length).toBe(3)
      expect(c.value).toEqual([11, 12, 13])
    })
  })

  describe('unit conversion', () => {
    it('converts between compatible units', () => {
      const a = new Quantity(1000, 'meters')
      const b = a.to('km')
      expect(b.value).toBeCloseTo(1, 5)
      expect(b.unit.toString()).toBe('km')
    })

    it('throws on incompatible conversion', () => {
      const a = new Quantity(5, 'meters')
      expect(() => a.to('seconds')).toThrow()
    })

    it('converts distributions', () => {
      const a = new Quantity([1000, 2000, 3000], 'meters')
      const b = a.to('km')
      expect(Array.isArray(b.value)).toBe(true)
      const values = b.value as number[]
      expect(values[0]).toBeCloseTo(1, 5)
      expect(values[1]).toBeCloseTo(2, 5)
      expect(values[2]).toBeCloseTo(3, 5)
    })
  })
})
