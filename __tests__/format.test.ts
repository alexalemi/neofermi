import { describe, it, expect } from 'vitest'
import {
  formatNumber,
  formatQuantityConcise,
  formatWithSigFigs,
  sigFigsForUncertainty,
} from '../src/utils/format.js'
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

  describe('Adaptive sig-figs (distribution display)', () => {
    it('collapses median precision when CI spans an order of magnitude', () => {
      // Mirrors the user-reported case: a wide interval shouldn't show
      // six-digit medians. A 68% CI spanning ~10× should get 1 sig fig.
      const particles: number[] = []
      const lo = Math.log(1e5)
      const hi = Math.log(3e6)
      for (let i = 0; i < 1000; i++) {
        const t = i / 999
        particles.push(Math.exp(lo + t * (hi - lo)))
      }
      const q = new Quantity(particles)
      const formatted = formatQuantityConcise(q)
      // Median ~5e5 at 1 sig fig should end in at least five trailing
      // zeros ("500000"), not arbitrary digits ("794015"). Also reject
      // the pre-fix leading-digit patterns like "7", "8", "9".
      const [medianStr] = formatted.split(' ')
      expect(medianStr).toMatch(/^[1-9](?:e\+\d+|00000)$/)
    })

    it('preserves precision when CI is tight', () => {
      // Uniform on [99.99, 100.01]: CI half-width ≈ 0.007, median ~100
      // → value/halfWidth ~15000 → many sig figs.
      const particles = Array.from(
        { length: 1000 },
        (_, i) => 99.99 + 0.02 * ((i + 0.5) / 1000),
      )
      const q = new Quantity(particles)
      const formatted = formatQuantityConcise(q)
      expect(formatted).toMatch(/100\.0\d/) // e.g. "100.00" for median
    })
  })

  describe('sigFigsForUncertainty', () => {
    it('gives 1 sig fig when CI half-width exceeds the value', () => {
      expect(sigFigsForUncertainty(794015, 1e6)).toBe(1)
    })

    it('gives many sig figs when CI is tight', () => {
      expect(sigFigsForUncertainty(100, 0.01)).toBeGreaterThanOrEqual(4)
    })

    it('handles zero uncertainty safely', () => {
      expect(sigFigsForUncertainty(100, 0)).toBeGreaterThanOrEqual(1)
    })
  })

  describe('formatWithSigFigs', () => {
    it('rounds 794015 to 1 sig fig as 800000', () => {
      expect(formatWithSigFigs(794015, 1)).toBe('800000')
    })

    it('switches to scientific for magnitudes >= 1e6', () => {
      expect(formatWithSigFigs(2.44e6, 2)).toMatch(/^2\.4e\+6$/)
    })

    it('renders tight values with decimals', () => {
      expect(formatWithSigFigs(1.234, 3)).toBe('1.23')
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
