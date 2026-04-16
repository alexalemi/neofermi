import { describe, it, expect } from 'vitest'
import { parse, Evaluator } from '../src/parser/index.js'

describe('Evaluator', () => {
  describe('Let bindings', () => {
    it('binds value in body scope', () => {
      const result = parse('let x = 5 in x * 2')
      expect(result?.value).toBe(10)
    })

    it('does not leak binding outside scope', () => {
      const evaluator = new Evaluator()
      parse('let x = 5 in x * 2', evaluator)
      expect(() => parse('x', evaluator)).toThrow('Undefined variable')
    })

    it('shadows existing variable and restores', () => {
      const evaluator = new Evaluator()
      parse('x = 100', evaluator)
      const inner = parse('let x = 5 in x * 2', evaluator)
      expect(inner?.value).toBe(10)
      // Original value restored
      const outer = parse('x', evaluator)
      expect(outer?.value).toBe(100)
    })

    it('nests let bindings', () => {
      const result = parse('let x = 2 in let y = 3 in x * y')
      expect(result?.value).toBe(6)
    })
  })

  describe('If expressions', () => {
    it('evaluates then branch when true', () => {
      const result = parse('if 1 > 0 then 10 else 20')
      expect(result?.value).toBe(10)
    })

    it('evaluates else branch when false', () => {
      const result = parse('if 0 > 1 then 10 else 20')
      expect(result?.value).toBe(20)
    })

    it('treats nonzero as truthy', () => {
      const result = parse('if 5 then 10 else 20')
      expect(result?.value).toBe(10)
    })

    it('treats zero as falsy', () => {
      const result = parse('if 0 then 10 else 20')
      expect(result?.value).toBe(20)
    })

    it('works with comparison operators', () => {
      expect(parse('if 3 >= 3 then 1 else 0')?.value).toBe(1)
      expect(parse('if 3 <= 2 then 1 else 0')?.value).toBe(0)
      expect(parse('if 3 == 3 then 1 else 0')?.value).toBe(1)
      expect(parse('if 3 != 3 then 1 else 0')?.value).toBe(0)
    })

    it('works with variables', () => {
      const evaluator = new Evaluator()
      parse('x = 10', evaluator)
      const result = parse('if x > 5 then x * 2 else x / 2', evaluator)
      expect(result?.value).toBe(20)
    })
  })

  describe('Comparison operators (via if expressions)', () => {
    // Comparisons are only valid inside if-then-else in the grammar
    it('greater than', () => {
      expect(parse('if 5 > 3 then 1 else 0')?.value).toBe(1)
      expect(parse('if 3 > 5 then 1 else 0')?.value).toBe(0)
    })

    it('less than', () => {
      expect(parse('if 3 < 5 then 1 else 0')?.value).toBe(1)
      expect(parse('if 5 < 3 then 1 else 0')?.value).toBe(0)
    })

    it('greater or equal', () => {
      expect(parse('if 5 >= 5 then 1 else 0')?.value).toBe(1)
      expect(parse('if 5 >= 6 then 1 else 0')?.value).toBe(0)
    })

    it('less or equal', () => {
      expect(parse('if 5 <= 5 then 1 else 0')?.value).toBe(1)
      expect(parse('if 6 <= 5 then 1 else 0')?.value).toBe(0)
    })

    it('equality', () => {
      expect(parse('if 5 == 5 then 1 else 0')?.value).toBe(1)
      expect(parse('if 5 == 6 then 1 else 0')?.value).toBe(0)
    })

    it('inequality', () => {
      expect(parse('if 5 != 6 then 1 else 0')?.value).toBe(1)
      expect(parse('if 5 != 5 then 1 else 0')?.value).toBe(0)
    })

    it('comparison with distributions selects element-wise', () => {
      const evaluator = new Evaluator()
      parse('x = 1 to 100', evaluator)
      const result = parse('if x > 50 then 1 else 0', evaluator)
      expect(result?.isDistribution()).toBe(true)
      const mean = result?.mean() ?? 0
      // Some fraction should be > 50
      expect(mean).toBeGreaterThan(0.05)
      expect(mean).toBeLessThan(0.95)
    })
  })

  describe('User-defined functions', () => {
    it('defines and calls a function', () => {
      const evaluator = new Evaluator()
      parse('double(x) = x * 2', evaluator)
      const result = parse('double(5)', evaluator)
      expect(result?.value).toBe(10)
    })

    it('handles multiple parameters', () => {
      const evaluator = new Evaluator()
      parse('add(a, b) = a + b', evaluator)
      const result = parse('add(3, 7)', evaluator)
      expect(result?.value).toBe(10)
    })

    it('wrong argument count throws', () => {
      const evaluator = new Evaluator()
      parse('f(x) = x + 1', evaluator)
      expect(() => parse('f(1, 2)', evaluator)).toThrow(/expects 1 arguments/)
    })

    it('function does not leak parameter bindings', () => {
      const evaluator = new Evaluator()
      parse('f(x) = x * 2', evaluator)
      parse('f(5)', evaluator)
      expect(() => parse('x', evaluator)).toThrow('Undefined variable')
    })

    it('function restores previous variable values', () => {
      const evaluator = new Evaluator()
      parse('x = 100', evaluator)
      parse('f(x) = x * 2', evaluator)
      parse('f(5)', evaluator)
      const result = parse('x', evaluator)
      expect(result?.value).toBe(100)
    })

    it('functions can call other functions', () => {
      const evaluator = new Evaluator()
      parse('square(x) = x ^ 2', evaluator)
      parse('sum_of_squares(a, b) = square(a) + square(b)', evaluator)
      const result = parse('sum_of_squares(3, 4)', evaluator)
      expect(result?.value).toBe(25)
    })

    it('recursive-like calls through variables work', () => {
      const evaluator = new Evaluator()
      parse('f(x) = x + 1', evaluator)
      const result = parse('f(f(3))', evaluator)
      expect(result?.value).toBe(5)
    })

    it('functions work with distributions', () => {
      const evaluator = new Evaluator()
      parse('double(x) = x * 2', evaluator)
      const result = parse('double(1 to 10)', evaluator)
      expect(result?.isDistribution()).toBe(true)
      const mean = result?.mean() ?? 0
      expect(mean).toBeGreaterThan(2)
      expect(mean).toBeLessThan(20)
    })
  })

  describe('Uniform distribution (..)', () => {
    it('creates uniform distribution', () => {
      const result = parse('0 .. 100')
      expect(result?.isDistribution()).toBe(true)
      const mean = result?.mean() ?? 0
      expect(mean).toBeCloseTo(50, -1)
    })

    it('thru keyword is alias for ..', () => {
      const result = parse('0 thru 100')
      expect(result?.isDistribution()).toBe(true)
      const mean = result?.mean() ?? 0
      expect(mean).toBeCloseTo(50, -1)
    })

    it('uniform with trailing unit', () => {
      const result = parse('0 .. 100 meters')
      expect(result?.isDistribution()).toBe(true)
      expect(result?.unit.toString()).toBe('meters')
    })

    it('uniform converts compatible units on both bounds', () => {
      // 50 cm .. 2 m: right unit wins ('m'), left converts to 0.5 m.
      // Samples should span 0.5..2 m, not 50..2 (which would be invalid) or
      // 0.5..0.02 (if both were incorrectly rescaled).
      const result = parse('50 cm .. 2 m')
      expect(result?.isDistribution()).toBe(true)
      expect(result?.unit.toString()).toBe('m')
      const particles = result?.toParticles() ?? []
      const lo = Math.min(...particles)
      const hi = Math.max(...particles)
      expect(lo).toBeGreaterThanOrEqual(0.5)
      expect(hi).toBeLessThanOrEqual(2)
    })

    it('uniform rejects incompatible units', () => {
      expect(() => parse('1 m .. 2 s')).toThrow(/[Ii]ncompatible/)
    })
  })

  describe('Normal distribution (+/-)', () => {
    it('creates normal distribution with +-', () => {
      const result = parse('100 +- 10')
      expect(result?.isDistribution()).toBe(true)
      expect(result?.mean()).toBeCloseTo(100, -1)
    })

    it('creates normal distribution with +/-', () => {
      const result = parse('100 +/- 10')
      expect(result?.isDistribution()).toBe(true)
      expect(result?.mean()).toBeCloseTo(100, -1)
    })

    it('creates normal distribution with pm', () => {
      const result = parse('100 pm 10')
      expect(result?.isDistribution()).toBe(true)
      expect(result?.mean()).toBeCloseTo(100, -1)
    })

    it('normal with trailing unit on sigma', () => {
      // "100 +/- 10 meters" — meters attaches to sigma,
      // and the result inherits the unit
      const result = parse('100 +/- 10 meters')
      expect(result?.isDistribution()).toBe(true)
      expect(result?.unit.toString()).toBe('meters')
    })

    it('normal converts sigma to mean unit when both are set', () => {
      // 1 m ± 100 cm should be 1 m ± 1 m, not 1 ± 100 with label "m"
      const result = parse('1 m +- 100 cm')
      expect(result?.isDistribution()).toBe(true)
      expect(result?.mean()).toBeCloseTo(1, 0)
      // std of Monte Carlo normal(1-1, 1+1) over many samples ≈ 1
      expect(result?.std()).toBeCloseTo(1, 0)
      expect(result?.unit.toString()).toBe('m')
    })

    it('normal rejects incompatible units', () => {
      expect(() => parse('1 m +- 2 s')).toThrow(/[Ii]ncompatible/)
    })
  })

  describe('Beta distributions', () => {
    it('of creates beta distribution', () => {
      const result = parse('7 of 10')
      expect(result?.isDistribution()).toBe(true)
      const mean = result?.mean() ?? 0
      // Laplace smoothing: (7+1)/(10+2) = 0.667
      expect(mean).toBeCloseTo(0.667, 1)
    })

    it('against creates beta distribution', () => {
      const result = parse('7 against 3')
      expect(result?.isDistribution()).toBe(true)
    })

    it('of values are between 0 and 1', () => {
      const result = parse('5 of 10')
      const particles = result?.toParticles() ?? []
      expect(particles.every(v => v >= 0 && v <= 1)).toBe(true)
    })
  })

  describe('Weighted sets', () => {
    it('equal-weight set', () => {
      const result = parse('{1, 2, 3}')
      expect(result?.isDistribution()).toBe(true)
      const mean = result?.mean() ?? 0
      expect(mean).toBeCloseTo(2, 0)
    })

    it('weighted set', () => {
      const result = parse('{1: 1, 10: 9}')
      expect(result?.isDistribution()).toBe(true)
      const mean = result?.mean() ?? 0
      // Weighted mean: (1*1 + 10*9)/10 = 91/10 = 9.1
      expect(mean).toBeCloseTo(9.1, 0)
    })

    it('weighted set with custom unit', () => {
      // 'days' conflicts with mathjs built-in, use a label unit instead
      const result = parse("{365: 303, 366: 97} 'calendardays")
      expect(result?.isDistribution()).toBe(true)
    })
  })

  describe('Percent and db twiddles', () => {
    it('percent creates lognormal factor', () => {
      const result = parse('5%')
      expect(result?.isDistribution()).toBe(true)
      const mean = result?.mean() ?? 0
      // percent(5) = lognormal(1/1.05, 1.05) ≈ centered around 1
      expect(mean).toBeCloseTo(1, 1)
    })

    it('db twiddle creates lognormal factor', () => {
      const result = parse('0db')
      expect(result?.isDistribution()).toBe(true)
    })

    it('negative db twiddle', () => {
      const result = parse('-10db')
      expect(result?.isDistribution()).toBe(true)
      // -10db should be wider than 0db
      const wide = parse('-10db')
      const narrow = parse('10db')
      expect(wide!.std()).toBeGreaterThan(narrow!.std())
    })
  })

  describe('Sig fig numbers', () => {
    it('creates uniform distribution from sig figs', () => {
      const result = parse("'3.14")
      expect(result?.isDistribution()).toBe(true)
      // 3.14 has uncertainty ±0.005
      expect(result?.mean()).toBeCloseTo(3.14, 1)
    })

    it('sig fig with unit', () => {
      const result = parse("'3.14 meters")
      expect(result?.isDistribution()).toBe(true)
      expect(result?.unit.toString()).toBe('meters')
    })

    it('trailing zeros matter', () => {
      const result = parse("'1.30")
      // 1.30 has 3 sig figs, uncertainty ±0.005
      expect(result?.isDistribution()).toBe(true)
      const std = result?.std() ?? 0
      expect(std).toBeLessThan(0.01)
    })

    it('integer with trailing zeros has larger uncertainty', () => {
      const result = parse("'130")
      // 130 has 2 sig figs (trailing zero ambiguous), uncertainty ±5
      expect(result?.isDistribution()).toBe(true)
      const std = result?.std() ?? 0
      expect(std).toBeGreaterThan(1)
    })
  })

  describe('Dimensionless multipliers', () => {
    it('million multiplier', () => {
      const result = parse('5 million')
      expect(result?.value).toBe(5e6)
    })

    it('billion multiplier', () => {
      const result = parse('2 billion')
      expect(result?.value).toBe(2e9)
    })

    it('thousand multiplier', () => {
      const result = parse('10 thousand')
      expect(result?.value).toBe(10000)
    })

    it('K abbreviation', () => {
      const result = parse('50 K')
      expect(result?.value).toBe(50000)
    })

    it('M abbreviation', () => {
      const result = parse('3 M')
      expect(result?.value).toBe(3e6)
    })

    it('multiplier applies to both bounds when on trailing position', () => {
      // "1 to 10 million" applies million to both 1 and 10
      const result = parse('1 to 10 million')
      expect(result?.isDistribution()).toBe(true)
      const mean = result?.mean() ?? 0
      expect(mean).toBeGreaterThan(1e6)
      expect(mean).toBeLessThan(10e6)
    })

    it('separate multipliers on each bound', () => {
      // "100 thousand to 1 million" — each bound has its own multiplier
      const result = parse('100 thousand to 1 million')
      expect(result?.isDistribution()).toBe(true)
      const mean = result?.mean() ?? 0
      // lognormal(100000, 1000000) — geometric mean ~ 316k
      expect(mean).toBeGreaterThan(1e5)
    })
  })

  describe('Multi-statement programs', () => {
    it('evaluates multi-line programs', () => {
      const evaluator = new Evaluator()
      const result = parse('x = 10\ny = 20\nx + y', evaluator)
      expect(result?.value).toBe(30)
    })

    it('variables persist across lines', () => {
      const evaluator = new Evaluator()
      parse('distance = 100 meters', evaluator)
      parse('time = 10 seconds', evaluator)
      const result = parse('distance / time', evaluator)
      expect(result?.value).toBe(10)
    })

    it('comments are ignored in multi-line', () => {
      const evaluator = new Evaluator()
      const result = parse('# define x\nx = 5\n# use x\nx * 3', evaluator)
      expect(result?.value).toBe(15)
    })
  })

  describe('Physical constants', () => {
    it('speed of light is available', () => {
      const result = parse('c')
      expect(result?.value).toBeCloseTo(299792458, -5)
    })

    it('pi is available', () => {
      const result = parse('pi')
      expect(result?.value).toBeCloseTo(Math.PI)
    })

    it('e is available', () => {
      const result = parse('e')
      expect(result?.value).toBeCloseTo(Math.E)
    })

    it('constants have correct units', () => {
      const evaluator = new Evaluator()
      const c = parse('c', evaluator)
      // Speed of light should have velocity units
      expect(c?.unit.toString()).toContain('m')
    })
  })

  describe('SI conversion', () => {
    it('converts to SI base units', () => {
      const result = parse('1 km as SI')
      expect(result?.value).toBeCloseTo(1000)
    })
  })

  describe('Operator precedence edge cases', () => {
    it('exponentiation is right-associative', () => {
      const result = parse('2 ^ 3 ^ 2')
      // Right associative: 2 ^ (3^2) = 2^9 = 512
      expect(result?.value).toBe(512)
    })

    it('range has lower precedence than arithmetic', () => {
      const result = parse('2 * 5 to 3 * 10')
      // Should be (2*5) to (3*10) = 10 to 30
      expect(result?.isDistribution()).toBe(true)
    })

    it('unary minus binds tighter than power', () => {
      const result = parse('-2 ^ 2')
      // Grammar: Unary is above Power, so this is (-2)^2 = 4
      expect(result?.value).toBe(4)
    })

    it('conversion has lowest precedence', () => {
      const result = parse('1000 meters + 500 meters as km')
      // Should be (1000m + 500m) as km = 1.5 km
      expect(result?.value).toBeCloseTo(1.5, 1)
    })
  })
})
