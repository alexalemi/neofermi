import { describe, it, expect } from 'vitest'
import { formatNumber, formatQuantityConcise } from '../src/utils/format.js'
import { Quantity } from '../src/core/Quantity.js'
import { getDimensionName } from '../src/core/dimensions.js'
import { unit } from 'mathjs'

describe('Formatting', () => {
  describe('formatNumber', () => {
    it('formats integers with one decimal for tens range', () => {
      // 42 is in [10, 100) → toFixed(1) = "42.0"
      expect(formatNumber(42)).toBe('42.0')
    })

    it('formats large numbers in scientific notation', () => {
      const s = formatNumber(1.5e10)
      expect(s).toContain('e+')
    })

    it('formats small numbers in scientific notation', () => {
      const s = formatNumber(0.0001)
      expect(s).toContain('e-')
    })

    it('formats moderate numbers with decimals', () => {
      expect(formatNumber(3.14)).toBe('3.14')
    })

    it('formats hundreds without decimals', () => {
      expect(formatNumber(123)).toBe('123')
    })

    it('formats tens with one decimal', () => {
      expect(formatNumber(12.3)).toBe('12.3')
    })

    it('handles Infinity', () => {
      expect(formatNumber(Infinity)).toBe('Infinity')
    })

    it('handles NaN', () => {
      expect(formatNumber(NaN)).toBe('NaN')
    })

    it('handles zero', () => {
      expect(formatNumber(0)).toBe('0.00')
    })
  })

  describe('formatQuantityConcise', () => {
    it('formats scalar with value and unit', () => {
      const q = new Quantity(42, 'meters')
      const formatted = formatQuantityConcise(q)
      expect(formatted).toContain('42')
      expect(formatted).toContain('meter')
    })

    it('formats distribution with CI', () => {
      const q = new Quantity([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
      const formatted = formatQuantityConcise(q)
      // Should contain brackets for CI
      expect(formatted).toContain('[')
      expect(formatted).toContain(']')
    })

    it('formats dimensionless scalar', () => {
      const q = new Quantity(42)
      const formatted = formatQuantityConcise(q)
      expect(formatted).toBe('42.0')
    })

    it('HTML mode wraps in spans', () => {
      const q = new Quantity(42, 'meters')
      const formatted = formatQuantityConcise(q, { html: true })
      expect(formatted).toContain('<span')
    })
  })

  describe('Dimension names', () => {
    it('length', () => {
      expect(getDimensionName(unit('meter'))).toBe('length')
    })

    it('mass', () => {
      expect(getDimensionName(unit('kg'))).toBe('mass')
    })

    it('time', () => {
      expect(getDimensionName(unit('second'))).toBe('time')
    })

    it('velocity', () => {
      const u = unit('meter').divide(unit('second'))
      expect(getDimensionName(u)).toBe('velocity')
    })

    it('dimensionless returns null or dimensionless', () => {
      const result = getDimensionName(unit(''))
      // Could be null or some string depending on implementation
      expect(result === null || result === 'dimensionless').toBe(true)
    })
  })

  describe('Quantity toString', () => {
    it('scalar displays value and unit', () => {
      const s = new Quantity(42, 'meters').toString()
      expect(s).toContain('42')
      expect(s).toContain('meters')
    })

    it('distribution displays summary with CI', () => {
      const s = new Quantity([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).toString()
      expect(s).toContain('[')
      expect(s).toContain(']')
    })

    it('dimensionless scalar', () => {
      const s = new Quantity(42).toString()
      expect(s).toContain('42')
    })
  })
})
