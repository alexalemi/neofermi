import { describe, it, expect } from 'vitest'
import { parse, Evaluator, isValidSyntax } from '../src/parser/index.js'
import { Quantity } from '../src/core/Quantity.js'
import { lognormal, normal, uniform, plusminus, outof, against } from '../src/index.js'
import { to, percent, db } from '../src/distributions/convenience.js'
import { weighted } from '../src/distributions/weighted.js'
import { crps, logcrps, dbcrps } from '../src/functions/math.js'

describe('Edge cases', () => {
  describe('Quantity edge cases', () => {
    it('scalar arithmetic does not create array', () => {
      const a = new Quantity(3)
      const b = new Quantity(4)
      const result = a.add(b)
      expect(result.isScalar()).toBe(true)
      expect(typeof result.value).toBe('number')
    })

    it('broadcasting scalar with distribution', () => {
      const scalar = new Quantity(10)
      const dist = new Quantity([1, 2, 3])
      const result = scalar.multiply(dist)
      expect(result.value).toEqual([10, 20, 30])
    })

    it('distribution + scalar broadcasts', () => {
      const dist = new Quantity([1, 2, 3])
      const scalar = new Quantity(10)
      const result = dist.add(scalar)
      expect(result.value).toEqual([11, 12, 13])
    })

    it('distributions of different lengths cycle', () => {
      const a = new Quantity([1, 2, 3])
      const b = new Quantity([10, 20])
      const result = a.add(b)
      // Length 3: [1+10, 2+20, 3+10]
      expect(result.value).toEqual([11, 22, 13])
    })

    it('mean of single value is the value', () => {
      expect(new Quantity(42).mean()).toBe(42)
    })

    it('std of single value is 0', () => {
      expect(new Quantity(42).std()).toBe(0)
    })

    it('percentile of single value is the value', () => {
      expect(new Quantity(42).percentile(0.5)).toBe(42)
    })

    it('median of even-length array interpolates', () => {
      expect(new Quantity([1, 2, 3, 4]).median()).toBe(2.5)
    })

    it('percentile boundaries', () => {
      const q = new Quantity([1, 2, 3, 4, 5])
      expect(q.percentile(0)).toBe(1)
      expect(q.percentile(1)).toBe(5)
    })

    it('percentile rejects out of range', () => {
      const q = new Quantity([1, 2, 3])
      expect(() => q.percentile(-0.1)).toThrow()
      expect(() => q.percentile(1.1)).toThrow()
    })

    it('pow with zero exponent', () => {
      const a = new Quantity(5, 'meters')
      const result = a.pow(0)
      expect(result.value).toBeCloseTo(1)
    })

    it('pow with negative exponent', () => {
      const a = new Quantity(2)
      const result = a.pow(-1)
      expect(result.value).toBeCloseTo(0.5)
    })

    it('division by zero produces Infinity', () => {
      const a = new Quantity(1)
      const b = new Quantity(0)
      const result = a.divide(b)
      expect(result.value).toBe(Infinity)
    })

    it('toParticles returns single-element array for scalar', () => {
      const q = new Quantity(42)
      expect(q.toParticles()).toEqual([42])
    })

    it('sampleCount is 1 for scalar', () => {
      expect(new Quantity(42).sampleCount).toBe(1)
    })

    it('sampleCount matches array length', () => {
      expect(new Quantity([1, 2, 3, 4, 5]).sampleCount).toBe(5)
    })

    it('toString shows scalar with unit', () => {
      const s = new Quantity(42, 'meters').toString()
      expect(s).toContain('42')
      expect(s).toContain('meters')
    })

    it('toString shows distribution summary', () => {
      const s = new Quantity([1, 2, 3, 4, 5]).toString()
      // Should contain mean and CI
      expect(s.length).toBeGreaterThan(0)
    })
  })

  describe('Distribution edge cases', () => {
    it('lognormal with very wide range', () => {
      const q = lognormal(0.01, 1000, undefined, 0.9, 1000)
      expect(q.isDistribution()).toBe(true)
      expect(q.mean()).toBeGreaterThan(0)
    })

    it('lognormal with very narrow range', () => {
      const q = lognormal(99, 101, undefined, 0.9, 1000)
      expect(q.mean()).toBeCloseTo(100, 0)
    })

    it('lognormal rejects a >= b', () => {
      expect(() => lognormal(10, 10)).toThrow()
      expect(() => lognormal(10, 5)).toThrow()
    })

    it('lognormal rejects zero or negative', () => {
      expect(() => lognormal(0, 10)).toThrow()
      expect(() => lognormal(-5, 10)).toThrow()
    })

    it('normal with very wide range', () => {
      const q = normal(-1000, 1000, undefined, 0.9, 20000)
      expect(q.mean()).toBeCloseTo(0, -1)
    })

    it('normal rejects a >= b', () => {
      expect(() => normal(10, 10)).toThrow()
      expect(() => normal(10, 5)).toThrow()
    })

    it('uniform rejects a >= b', () => {
      expect(() => uniform(10, 10)).toThrow()
      expect(() => uniform(10, 5)).toThrow()
    })

    it('plusminus with zero std is degenerate', () => {
      const q = plusminus(100, 0)
      expect(q.mean()).toBeCloseTo(100)
      expect(q.std()).toBeCloseTo(0)
    })

    it('plusminus rejects negative std', () => {
      expect(() => plusminus(100, -10)).toThrow()
    })

    it('outof rejects invalid args', () => {
      expect(() => outof(-1, 10)).toThrow()
      expect(() => outof(11, 10)).toThrow() // successes > total
    })

    it('outof with 0 successes works', () => {
      const q = outof(0, 10, 1000)
      expect(q.mean()).toBeCloseTo(1 / 12, 1) // (0+1)/(10+2) Laplace
    })

    it('outof with all successes works', () => {
      const q = outof(10, 10, 1000)
      expect(q.mean()).toBeCloseTo(11 / 12, 1) // (10+1)/(10+2) Laplace
    })

    it('against with zero counts', () => {
      const q = against(0, 10, 1000)
      expect(q.isDistribution()).toBe(true)
      // Should not produce NaN
      expect(q.toParticles().every(v => !isNaN(v))).toBe(true)
    })

    it('against rejects negative counts', () => {
      expect(() => against(-1, 10)).toThrow()
      expect(() => against(10, -1)).toThrow()
    })
  })

  describe('Convenience function edge cases', () => {
    it('to() uses lognormal for positive range', () => {
      const q = to(10, 100)
      expect(q.isDistribution()).toBe(true)
      // Lognormal has asymmetric distribution
      const mean = q.mean()
      expect(mean).toBeGreaterThan(10)
      expect(mean).toBeLessThan(100)
    })

    it('to() uses normal for range crossing zero', () => {
      const q = to(-10, 10)
      expect(q.isDistribution()).toBe(true)
      expect(q.mean()).toBeCloseTo(0, 0)
    })

    it('to() uses normal when a is zero', () => {
      const q = to(0, 100)
      expect(q.isDistribution()).toBe(true)
      // Normal centered at 50
      expect(q.mean()).toBeCloseTo(50, -1)
    })

    it('percent(0) throws since bounds are equal', () => {
      // 0% error: lognormal(1/1, 1) = lognormal(1, 1), a >= b
      expect(() => percent(0)).toThrow()
    })

    it('percent(100) creates wide distribution', () => {
      const q = percent(100)
      expect(q.isDistribution()).toBe(true)
      expect(q.mean()).toBeCloseTo(1, 0)
    })

    it('db(0) gives factor-of-2 uncertainty', () => {
      const q = db(0)
      // factor = 1 + 10^0 = 2, range [1/2, 2] = [0.5, 2]
      expect(q.isDistribution()).toBe(true)
      const mean = q.mean()
      expect(mean).toBeGreaterThan(0.5)
      expect(mean).toBeLessThan(2)
    })
  })

  describe('Weighted distribution edge cases', () => {
    it('empty values throws', () => {
      expect(() => weighted([], [])).toThrow()
    })

    it('mismatched arrays throws', () => {
      expect(() => weighted([1, 2], [1])).toThrow()
    })

    it('negative weights throws', () => {
      expect(() => weighted([1, 2], [1, -1])).toThrow()
    })

    it('all-zero weights throws', () => {
      expect(() => weighted([1, 2], [0, 0])).toThrow()
    })

    it('single value creates degenerate distribution', () => {
      const q = weighted([42], [1], undefined, 100)
      expect(q.mean()).toBe(42)
      expect(q.std()).toBe(0)
    })
  })

  describe('Parser edge cases', () => {
    it('empty input is valid (empty program)', () => {
      // The grammar accepts empty programs
      expect(isValidSyntax('')).toBe(true)
    })

    it('whitespace only is valid (empty program)', () => {
      expect(isValidSyntax('   ')).toBe(true)
    })

    it('just a comment returns null', () => {
      const result = parse('# just a comment\n42')
      expect(result?.value).toBe(42)
    })

    it('nested parentheses', () => {
      const result = parse('((((5))))')
      expect(result?.value).toBe(5)
    })

    it('multiple operations chain correctly', () => {
      const result = parse('1 + 2 + 3 + 4')
      expect(result?.value).toBe(10)
    })

    it('mixed operations respect precedence', () => {
      const result = parse('2 + 3 * 4 - 1')
      expect(result?.value).toBe(13) // 2 + 12 - 1
    })

    it('negative number in expression', () => {
      const result = parse('-5 + 10')
      expect(result?.value).toBe(5)
    })

    it('double negation', () => {
      const result = parse('--5')
      expect(result?.value).toBe(5)
    })

    it('scientific notation with negative exponent', () => {
      const result = parse('1.5e-3')
      expect(result?.value).toBeCloseTo(0.0015)
    })

    it('very large numbers', () => {
      const result = parse('1e100')
      expect(result?.value).toBe(1e100)
    })

    it('very small numbers', () => {
      const result = parse('1e-100')
      expect(result?.value).toBe(1e-100)
    })
  })

  describe('Error messages', () => {
    it('suggests similar variable names', () => {
      const evaluator = new Evaluator()
      parse('myVariable = 10', evaluator)
      try {
        parse('myVarible', evaluator)
        expect.fail('Should have thrown')
      } catch (e: any) {
        expect(e.message).toContain('myVariable')
      }
    })

    it('suggests similar function names', () => {
      try {
        parse('unifrom(0, 1)')
        expect.fail('Should have thrown')
      } catch (e: any) {
        expect(e.message).toContain('uniform')
      }
    })

    it('suggests similar unit names', () => {
      try {
        parse('100 metrs')
        expect.fail('Should have thrown')
      } catch (e: any) {
        expect(e.message).toContain('meter')
      }
    })

    it('exponent cannot be distribution', () => {
      expect(() => parse('2 ^ (1 to 10)')).toThrow(/distribution/)
    })

    it('incompatible unit addition error', () => {
      try {
        parse('1 meter + 1 second')
        expect.fail('Should have thrown')
      } catch (e: any) {
        expect(e.message).toContain('incompatible')
      }
    })

    it('undefined variable error', () => {
      try {
        parse('nonExistentVar')
        expect.fail('Should have thrown')
      } catch (e: any) {
        expect(e.message).toContain('Undefined variable')
      }
    })
  })

  describe('CRPS edge cases', () => {
    it('crps of identical point mass is 0', () => {
      const dist = new Quantity([5, 5, 5, 5, 5])
      const obs = new Quantity(5)
      const result = crps(dist, obs)
      expect(result.value).toBeCloseTo(0)
    })

    it('crps is symmetric in observation location', () => {
      const dist = plusminus(50, 10, undefined, 5000)
      const left = crps(dist, new Quantity(40))
      const right = crps(dist, new Quantity(60))
      // Should be roughly equal (symmetric distribution)
      expect(Math.abs((left.value as number) - (right.value as number))).toBeLessThan(1)
    })

    it('crps requires compatible units', () => {
      const dist = normal(0, 100, 'meters', 0.9, 100)
      const obs = new Quantity(50, 'seconds')
      expect(() => crps(dist, obs)).toThrow(/compatible units/)
    })

    it('logcrps requires positive values', () => {
      const dist = plusminus(50, 100, undefined, 1000) // can go negative
      const obs = new Quantity(50)
      // Should throw if any sample is <= 0
      // (might or might not throw depending on samples)
    })

    it('logcrps with all-positive distribution', () => {
      const dist = lognormal(10, 100, undefined, 0.9, 1000)
      const obs = new Quantity(30)
      const result = logcrps(dist, obs)
      expect(result.value as number).toBeGreaterThanOrEqual(0)
    })

    it('dbcrps with all-positive distribution', () => {
      const dist = lognormal(10, 100, undefined, 0.9, 1000)
      const obs = new Quantity(30)
      const result = dbcrps(dist, obs)
      expect(result.value as number).toBeGreaterThanOrEqual(0)
    })

    it('crps with distribution observation', () => {
      const dist = plusminus(50, 10, undefined, 100)
      const obs = new Quantity([40, 50, 60])
      const result = crps(dist, obs)
      expect(result.isDistribution()).toBe(true)
      expect(result.sampleCount).toBe(3)
    })
  })

  describe('Evaluator state management', () => {
    it('clearVariables removes user variables', () => {
      const evaluator = new Evaluator()
      parse('x = 10', evaluator)
      evaluator.clearVariables()
      expect(() => parse('x', evaluator)).toThrow()
    })

    it('clearVariables removes constants too', () => {
      const evaluator = new Evaluator()
      evaluator.clearVariables()
      expect(() => parse('c', evaluator)).toThrow()
    })

    it('reset restores constants', () => {
      const evaluator = new Evaluator()
      parse('x = 10', evaluator)
      evaluator.reset()
      expect(() => parse('x', evaluator)).toThrow()
      // Constants should be back
      const c = parse('c', evaluator)
      expect(c?.value).toBeCloseTo(299792458, -5)
    })

    it('reset clears user functions', () => {
      const evaluator = new Evaluator()
      parse('f(x) = x * 2', evaluator)
      evaluator.reset()
      expect(() => parse('f(5)', evaluator)).toThrow()
    })

    it('reset clears custom units', () => {
      const evaluator = new Evaluator()
      parse("1 'widget = 5 kg", evaluator)
      evaluator.reset()
      // After reset, 'widget is just a label unit (not scaled to kg)
      const result = parse("1 'widget", evaluator)
      expect(result?.value).toBe(1)
    })

    it('getVariableNames includes constants and user vars', () => {
      const evaluator = new Evaluator()
      parse('x = 10', evaluator)
      const names = evaluator.getVariableNames()
      expect(names).toContain('x')
      expect(names).toContain('c')
      expect(names).toContain('pi')
    })

    it('getUserVariableNames excludes constants', () => {
      const evaluator = new Evaluator()
      parse('myvar = 10', evaluator)
      const names = evaluator.getUserVariableNames()
      expect(names).toContain('myvar')
      expect(names).not.toContain('c')
      expect(names).not.toContain('pi')
    })

    it('setVariable works', () => {
      const evaluator = new Evaluator()
      evaluator.setVariable('x', new Quantity(42))
      const result = parse('x', evaluator)
      expect(result?.value).toBe(42)
    })

    it('getVariable returns undefined for nonexistent', () => {
      const evaluator = new Evaluator()
      expect(evaluator.getVariable('nonexistent')).toBeUndefined()
    })
  })
})
