import { describe, it, expect } from 'vitest'
import { parse, parseToAST, isValidSyntax, Evaluator } from '../src/parser/index.js'

describe('Parser', () => {
  describe('Syntax validation', () => {
    it('validates correct syntax', () => {
      expect(isValidSyntax('1 + 2')).toBe(true)
      expect(isValidSyntax('x = 10')).toBe(true)
      expect(isValidSyntax('1 to 10')).toBe(true)
      expect(isValidSyntax('1 to 10 meters')).toBe(true)
    })

    it('rejects invalid syntax', () => {
      expect(isValidSyntax('1 +')).toBe(false)
      expect(isValidSyntax('= 10')).toBe(false)
      expect(isValidSyntax('to 10')).toBe(false)
    })
  })

  describe('Number literals', () => {
    it('parses integers', () => {
      const result = parse('42')
      expect(result?.value).toBe(42)
    })

    it('parses floats', () => {
      const result = parse('3.14')
      expect(result?.value).toBe(3.14)
    })

    it('parses scientific notation', () => {
      const result = parse('1.5e10')
      expect(result?.value).toBe(1.5e10)
    })

    it('parses numbers with units', () => {
      const result = parse('100 meters')
      expect(result?.value).toBe(100)
      expect(result?.unit.toString()).toBe('meters')
    })
  })

  describe('Arithmetic', () => {
    it('evaluates addition', () => {
      const result = parse('2 + 3')
      expect(result?.value).toBe(5)
    })

    it('evaluates subtraction', () => {
      const result = parse('10 - 3')
      expect(result?.value).toBe(7)
    })

    it('evaluates multiplication', () => {
      const result = parse('4 * 5')
      expect(result?.value).toBe(20)
    })

    it('evaluates division', () => {
      const result = parse('20 / 4')
      expect(result?.value).toBe(5)
    })

    it('evaluates exponentiation with ^', () => {
      const result = parse('2 ^ 3')
      expect(result?.value).toBe(8)
    })

    it('evaluates exponentiation with **', () => {
      const result = parse('2 ** 3')
      expect(result?.value).toBe(8)
    })

    it('respects operator precedence', () => {
      const result = parse('2 + 3 * 4')
      expect(result?.value).toBe(14) // not 20
    })

    it('handles parentheses', () => {
      const result = parse('(2 + 3) * 4')
      expect(result?.value).toBe(20)
    })
  })

  describe('Unary minus', () => {
    it('negates numbers', () => {
      const result = parse('-5')
      expect(result?.value).toBe(-5)
    })

    it('works in expressions', () => {
      const result = parse('10 + -5')
      expect(result?.value).toBe(5)
    })
  })

  describe('Variables', () => {
    it('assigns and retrieves variables', () => {
      const evaluator = new Evaluator()
      parse('x = 10', evaluator)
      const result = parse('x', evaluator)
      expect(result?.value).toBe(10)
    })

    it('uses variables in expressions', () => {
      const evaluator = new Evaluator()
      parse('x = 10', evaluator)
      const result = parse('x * 2', evaluator)
      expect(result?.value).toBe(20)
    })

    it('throws on undefined variable', () => {
      expect(() => parse('undefinedVar')).toThrow('Undefined variable')
    })
  })

  describe('Range operator (to)', () => {
    it('creates unitless range', () => {
      const result = parse('1 to 10')
      expect(result?.isDistribution()).toBe(true)
      const mean = result?.mean()
      expect(mean).toBeGreaterThan(1)
      expect(mean).toBeLessThan(10)
    })

    it('creates range with trailing unit', () => {
      const result = parse('1 to 10 meters')
      expect(result?.isDistribution()).toBe(true)
      expect(result?.unit.toString()).toBe('meters')
    })

    it('handles ranges in expressions', () => {
      const result = parse('2 * 5 to 3 * 10')
      expect(result?.isDistribution()).toBe(true)
      const mean = result?.mean()
      expect(mean).toBeGreaterThan(10)
      expect(mean).toBeLessThan(30)
    })

    it('errors on mixed unit/unitless', () => {
      expect(() => parse('1 meters to 10')).toThrow('Cannot mix')
    })
  })

  describe('Unit conversion', () => {
    it('converts with as keyword', () => {
      const result = parse('100 centimeters as meters')
      expect(result?.value).toBeCloseTo(1, 2)
      expect(result?.unit.toString()).toBe('meters')
    })

    it('converts with -> operator', () => {
      const result = parse('1000 meters -> kilometers')
      expect(result?.value).toBeCloseTo(1, 2)
      expect(result?.unit.toString()).toBe('kilometers')
    })

    it('converts ranges', () => {
      const result = parse('1 to 10 meters as feet')
      expect(result?.isDistribution()).toBe(true)
      expect(result?.unit.toString()).toBe('feet')
      const mean = result?.mean()
      expect(mean).toBeGreaterThan(3) // > 3 feet
      expect(mean).toBeLessThan(33) // < 33 feet
    })
  })

  describe('Function calls', () => {
    it('calls lognormal', () => {
      const result = parse('lognormal(10, 100)')
      expect(result?.isDistribution()).toBe(true)
      const mean = result?.mean()
      expect(mean).toBeGreaterThan(10)
      expect(mean).toBeLessThan(100)
    })

    it('calls normal', () => {
      const result = parse('normal(0, 100)')
      expect(result?.isDistribution()).toBe(true)
    })

    it('calls outof', () => {
      const result = parse('outof(7, 10)')
      expect(result?.isDistribution()).toBe(true)
      const mean = result?.mean()
      expect(mean).toBeGreaterThan(0.6)
      expect(mean).toBeLessThan(0.75)
    })
  })

  describe('Comments', () => {
    it('ignores comments', () => {
      const result = parse('# This is a comment\n42')
      expect(result?.value).toBe(42)
    })

    it('handles inline comments', () => {
      const result = parse('10 + 5 # adding')
      expect(result?.value).toBe(15)
    })
  })

  describe('Complex expressions', () => {
    it('evaluates party planning example', () => {
      const evaluator = new Evaluator()
      parse('guests = 50 to 100', evaluator)
      parse('hotdogs_per_guest = 1 to 3', evaluator)
      const result = parse('guests * hotdogs_per_guest', evaluator)

      expect(result?.isDistribution()).toBe(true)
      const mean = result?.mean()
      expect(mean).toBeGreaterThan(50)
      expect(mean).toBeLessThan(300)
    })

    it('handles unit arithmetic', () => {
      const evaluator = new Evaluator()
      parse('distance = 100 meters', evaluator)
      parse('time = 10 seconds', evaluator)
      const result = parse('distance / time', evaluator)

      expect(result?.unit.toString()).toContain('meter')
      expect(result?.unit.toString()).toContain('second')
    })
  })

  describe('CRPS scoring', () => {
    it('computes crps for distribution vs scalar', () => {
      const result = parse('crps(plusminus(50, 10), 50)')
      expect(result?.isScalar()).toBe(true)
      expect(result?.value as number).toBeGreaterThanOrEqual(0)
    })

    it('crps increases with distance from mean', () => {
      const close = parse('crps(plusminus(50, 10), 50)')
      const far = parse('crps(plusminus(50, 10), 80)')
      expect((close?.value as number)).toBeLessThan((far?.value as number))
    })

    it('crps preserves units', () => {
      const evaluator = new Evaluator()
      parse('dist = plusminus(50, 10) * 1 meter', evaluator)
      parse('obs = 50 meters', evaluator)
      const result = parse('crps(dist, obs)', evaluator)
      expect(result?.unit.toString()).toBe('meter')
    })
  })
})
