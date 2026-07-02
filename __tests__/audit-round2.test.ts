/**
 * Regression tests for the second audit pass (2026-07-01).
 * Each block pins a specific bug so it can't silently return.
 */
import { describe, it, expect } from 'vitest'
import { parse } from '../src/parser/index.js'
import { lognormal } from '../src/distributions/lognormal.js'
import { weighted } from '../src/distributions/weighted.js'
import { percent, db } from '../src/distributions/convenience.js'
import { processMarkdown } from '../src/editor/markdown-processor.js'
import { getVizData } from '../src/visualization/index.js'
import { generateLinearTicks } from '../src/visualization/axisUtils.js'

describe('Audit round 2 regressions', () => {
  describe('grammar: division vs reciprocal units', () => {
    it('spaced / after a number is division, even by a variable shadowing a unit', () => {
      expect(parse('x = 4\n100 / x')?.value).toBe(25)
      expect(parse('m = 3\n100 / m')?.value).toBeCloseTo(100 / 3)
    })

    it('tight /unit is still a reciprocal unit', () => {
      const r = parse('5 /day')
      expect(r?.value).toBe(5)
      expect(r?.unit.toString()).toBe('day^-1')
    })

    it('per requires a word boundary (percent is not per+cent)', () => {
      // `percent` is not a known unit; the point is the error names the
      // full word instead of the `cent` remnant `per` used to leave behind
      expect(() => parse('3 percent + 1')).toThrow(/percent/)
    })
  })

  describe('grammar: signed unit powers', () => {
    it('3 m^-2 is 3 reciprocal-square-meters, not (3 m)^-2', () => {
      const r = parse('3 m^-2')
      expect(r?.value).toBe(3)
      expect(r?.unit.toString()).toBe('m^-2')
    })
  })

  describe('grammar: statements do not fuse across newlines', () => {
    it('a line starting with a minus is a new statement', () => {
      // `x = 5\n-3` used to evaluate to x = 2
      expect(parse('x = 5\n-3\nx')?.value).toBe(5)
    })

    it('trailing operator still continues to the next line', () => {
      expect(parse('x = 5 +\n3')?.value).toBe(8)
    })

    it('function calls do not span statement boundaries', () => {
      // `f\n(3)` used to silently call f(3)
      expect(() => parse('f(y) = y + 1\nf\n(3)')).toThrow()
    })
  })

  describe('grammar: comparisons as expressions', () => {
    it('top-level comparison', () => {
      expect(parse('3 > 2')?.value).toBe(1)
    })

    it('parenthesized if condition', () => {
      expect(parse('if (3 > 2) then 1 else 0')?.value).toBe(1)
    })
  })

  describe('grammar: linear-time nesting (no PEG re-parse blowup)', () => {
    it('parses 40 levels of parens quickly', () => {
      const deep = '('.repeat(40) + '1+1' + ')'.repeat(40)
      const start = performance.now()
      expect(parse(deep)?.value).toBe(2)
      expect(performance.now() - start).toBeLessThan(1000)
    })
  })

  describe('functions: dimensionless vs value-bearing units', () => {
    it('min/max/clamp align dozen against bare numbers', () => {
      expect(parse('min(10, 1 dozen)')?.value).toBe(10)
      expect(parse('max(10, 1 dozen)')?.value).toBe(12)
      expect(parse('clamp(20, 1 dozen, 2 dozen)')?.value).toBe(20)
    })

    it('atan2/hypot align compound dimensionless ratios', () => {
      expect(parse('hypot(10, 1 dozen)')?.value).toBeCloseTo(Math.hypot(10, 12))
      expect(parse('min(1000, 3 feet/mm)')?.value).toBeCloseTo(914.4)
    })
  })

  describe('evaluator: unit handling', () => {
    it('if-branches cannot mix a bare number with a dimensioned unit', () => {
      expect(() => parse('if (1 to 2) > 1.5 then 10 else 5 m')).toThrow(/incompatible/)
    })

    it('unit powers of zero are legal', () => {
      expect(parse('2 m^0')?.value).toBe(2)
    })

    it("of/against reject dimensioned counts instead of dropping the unit", () => {
      expect(() => parse('3 of 10 m')).toThrow(/dimensionless/)
      expect(() => parse('3 against 10 kg')).toThrow(/dimensionless/)
    })

    it('per/reciprocal units display without a leaked literal 1', () => {
      expect(parse('5 per day')?.unit.toString()).toBe('day^-1')
      expect(parse('60 rpm')?.unit.toString()).toBe('minute^-1')
      expect(parse('1/(2 km)')?.unit.toString()).toBe('km^-1')
    })
  })

  describe('constants: calorie matches the calorie unit', () => {
    it('calorie constant is thermochemical (4.184 J), kcal is 4184 J', () => {
      expect(parse('calorie as J')?.value).toBeCloseTo(4.184)
      expect(parse('kcal as J')?.value).toBeCloseTo(4184)
      expect(parse('food_calorie as J')?.value).toBeCloseTo(4184)
    })
  })

  describe('dimension names use the real mathjs order', () => {
    it('mol is amount of substance, candela is luminous intensity', () => {
      expect(parse('1 mol')?.dimensionName()).toBe('amount of substance')
      expect(parse('1 candela')?.dimensionName()).toBe('luminous intensity')
      expect(parse('1 mol / 1 m^3')?.dimensionName()).toBe('concentration')
    })
  })

  describe('distributions: overflow and validation', () => {
    it('lognormal parameters are computed in log space (no a*b overflow)', () => {
      const s = lognormal(1e200, 1e250).toParticles()
      const sorted = [...s].sort((a, b) => a - b)
      const median = sorted[sorted.length >> 1]
      expect(Math.log10(median)).toBeGreaterThan(220)
      expect(Math.log10(median)).toBeLessThan(230)
    })

    it('weighted rejects NaN and infinite weights', () => {
      expect(() => weighted([1, 2], [1, NaN])).toThrow(/finite/)
      expect(() => weighted([1, 2], [Infinity, 1])).toThrow(/finite/)
    })

    it('percent/db degrade to exactly 1 when the spread underflows', () => {
      expect(percent(1e-14).value).toBe(1)
      expect(db(200).value).toBe(1)
      expect(percent(1e-10).isDistribution()).toBe(true)
    })

    it('weighted sets accept negative values', () => {
      const r = parse('{-1, 1}')
      expect(r?.isDistribution()).toBe(true)
      expect(Math.abs(r!.mean())).toBeLessThan(0.1)
    })
  })

  describe('editor: raw HTML in markdown is escaped', () => {
    it('does not pass event-handler attributes through to the preview', () => {
      const doc = processMarkdown('<img src="x" onerror="alert(1)">')
      const html = doc.render(new Map())
      expect(html).not.toContain('<img')
      expect(html).toContain('&lt;img')
    })
  })

  describe('viz: histogram data is finer than the 20 dot quantiles', () => {
    it('getVizData carries ~200 histogram quantiles', () => {
      const q = lognormal(10, 100)
      const viz = getVizData(q)
      expect(viz.quantiles).toHaveLength(20)
      expect(viz.histQuantiles).toHaveLength(200)
    })

    it('generateLinearTicks respects maxTicks', () => {
      expect(generateLinearTicks(0, 1, 5).length).toBeLessThanOrEqual(5)
    })
  })
})
