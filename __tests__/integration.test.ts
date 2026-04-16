import { describe, it, expect } from 'vitest'
import { parse, Evaluator } from '../src/parser/index.js'

describe('Integration tests', () => {
  describe('Classic Fermi estimation problems', () => {
    it('piano tuners in Chicago', () => {
      const evaluator = new Evaluator()
      parse('population = 2 to 3 million', evaluator)
      parse('people_per_piano = 10 to 30', evaluator)
      parse('pianos = population / people_per_piano', evaluator)
      parse('tunings_per_year = 1 to 2', evaluator)
      parse('tunings_per_day = 3 to 5', evaluator)
      parse('working_days = 200 to 250', evaluator)
      const result = parse('pianos * tunings_per_year / (tunings_per_day * working_days)', evaluator)

      expect(result?.isDistribution()).toBe(true)
      const mean = result?.mean() ?? 0
      // Classic answer: ~100-300 piano tuners
      expect(mean).toBeGreaterThan(10)
      expect(mean).toBeLessThan(1000)
    })

    it('hotdogs at a party', () => {
      const evaluator = new Evaluator()
      parse('guests = 50 to 100', evaluator)
      parse('hotdogs_per_guest = 1 to 3', evaluator)
      parse('buns_per_pack = 8', evaluator)
      const result = parse('guests * hotdogs_per_guest / buns_per_pack', evaluator)

      expect(result?.isDistribution()).toBe(true)
      const mean = result?.mean() ?? 0
      expect(mean).toBeGreaterThan(5)
      expect(mean).toBeLessThan(50)
    })

    it('data center energy', () => {
      const evaluator = new Evaluator()
      // Use explicit multiplier on each bound to avoid range+multiplier interaction
      parse('servers = 100000 to 1000000', evaluator)
      parse('watts_per_server = 300 to 500', evaluator)
      parse('pue = 1 to 2', evaluator)  // Power usage effectiveness
      const result = parse('servers * watts_per_server * pue', evaluator)

      expect(result?.isDistribution()).toBe(true)
      const mean = result?.mean() ?? 0
      expect(mean).toBeGreaterThan(1e7)
    })
  })

  describe('Physics calculations', () => {
    it('kinetic energy', () => {
      const evaluator = new Evaluator()
      parse('mass = 1000 kg', evaluator)
      parse('velocity = 30 meters / 1 seconds', evaluator)
      const result = parse('0.5 * mass * velocity ^ 2', evaluator)

      // KE = 0.5 * 1000 * 900 = 450000 J
      expect(result?.value).toBeCloseTo(450000)
    })

    it('gravitational force', () => {
      const evaluator = new Evaluator()
      // F = GMm/r^2
      parse('mass1 = M_earth', evaluator)
      parse('mass2 = 1 kg', evaluator)
      parse('r = R_earth', evaluator)
      const result = parse('G * mass1 * mass2 / r ^ 2', evaluator)

      // Should be approximately 9.8 m/s^2 * 1 kg = 9.8 N
      expect(result?.mean()).toBeCloseTo(9.8, 0)
    })

    it('speed of light value', () => {
      const evaluator = new Evaluator()
      // c is ~299792458 m/s
      const result = parse('c', evaluator)
      expect(result?.value).toBeCloseTo(299792458, -5)
    })

    it('E = mc^2', () => {
      const evaluator = new Evaluator()
      parse('mass = 1 kg', evaluator)
      const result = parse('mass * c ^ 2', evaluator)
      // Should be ~9e16 J
      expect(result?.mean()).toBeCloseTo(8.988e16, -14)
    })
  })

  describe('Unit conversion chains', () => {
    it('distance from speed and time', () => {
      const evaluator = new Evaluator()
      parse('speed = 60 mile / 1 hour', evaluator)
      parse('time = 2 hour', evaluator)
      const result = parse('speed * time as mile', evaluator)
      // 60 mph * 2 hr = 120 miles
      expect(result?.value).toBeCloseTo(120, 0)
    })

    it('light-year is a constant', () => {
      // ly is a physical constant, not a unit
      const evaluator = new Evaluator()
      const result = parse('ly', evaluator)
      // ly = 9.461e15 meters
      expect(result?.value).toBeCloseTo(9.461e15, -13)
    })
  })

  describe('Distribution arithmetic propagation', () => {
    it('adding two distributions increases spread', () => {
      const evaluator = new Evaluator()
      parse('a = 50 +/- 10', evaluator)
      parse('b = 50 +/- 10', evaluator)
      const sum = parse('a + b', evaluator)
      const single = parse('a', evaluator)

      // Sum should have sqrt(2) times the std
      const sumStd = sum?.std() ?? 0
      const singleStd = single?.std() ?? 0
      expect(sumStd / singleStd).toBeCloseTo(Math.sqrt(2), 0)
    })

    it('multiplying independent distributions', () => {
      const evaluator = new Evaluator()
      parse('a = 10 to 100', evaluator)
      parse('b = 1 to 10', evaluator)
      const product = parse('a * b', evaluator)

      expect(product?.isDistribution()).toBe(true)
      const mean = product?.mean() ?? 0
      expect(mean).toBeGreaterThan(10)
      expect(mean).toBeLessThan(1000)
    })

    it('dividing distributions', () => {
      const evaluator = new Evaluator()
      parse('numerator = 100 to 200', evaluator)
      parse('denominator = 5 to 10', evaluator)
      const ratio = parse('numerator / denominator', evaluator)

      expect(ratio?.isDistribution()).toBe(true)
      const mean = ratio?.mean() ?? 0
      expect(mean).toBeGreaterThan(10)
      expect(mean).toBeLessThan(40)
    })

    it('scalar * distribution preserves distribution', () => {
      const evaluator = new Evaluator()
      parse('x = 1 to 10', evaluator)
      const result = parse('2 * x', evaluator)
      expect(result?.isDistribution()).toBe(true)
    })

    it('distribution operations preserve sample alignment', () => {
      // When two distributions are combined, samples should be aligned
      // (i.e., sample i of result = fn(sample i of A, sample i of B))
      const evaluator = new Evaluator()
      parse('x = 1 to 10', evaluator)
      const twice = parse('x + x', evaluator)
      const double = parse('2 * x', evaluator)

      // x + x should equal 2*x exactly (same samples)
      const twiceP = twice?.toParticles() ?? []
      const doubleP = double?.toParticles() ?? []
      expect(twiceP.length).toBe(doubleP.length)
      for (let i = 0; i < twiceP.length; i++) {
        expect(twiceP[i]).toBeCloseTo(doubleP[i])
      }
    })
  })

  describe('Function composition', () => {
    it('math function on distribution', () => {
      const evaluator = new Evaluator()
      parse('x = 1 to 100', evaluator)
      const result = parse('sqrt(x)', evaluator)
      expect(result?.isDistribution()).toBe(true)
      const mean = result?.mean() ?? 0
      expect(mean).toBeGreaterThan(1)
      expect(mean).toBeLessThan(10)
    })

    it('floor of distribution', () => {
      const evaluator = new Evaluator()
      parse('x = 0 .. 10', evaluator)
      const result = parse('floor(x)', evaluator)
      expect(result?.isDistribution()).toBe(true)
      // All values should be integers
      const particles = result?.toParticles() ?? []
      particles.forEach(v => expect(Number.isInteger(v)).toBe(true))
    })

    it('abs of normal distribution', () => {
      const evaluator = new Evaluator()
      parse('x = -10 to 10', evaluator)
      const result = parse('abs(x)', evaluator)
      expect(result?.isDistribution()).toBe(true)
      // All values should be >= 0
      const particles = result?.toParticles() ?? []
      particles.forEach(v => expect(v).toBeGreaterThanOrEqual(0))
    })

    it('chained function calls', () => {
      const result = parse('floor(sqrt(abs(-16)))')
      expect(result?.value).toBe(4)
    })
  })

  describe('Built-in function calls via parser', () => {
    it('min function', () => {
      const result = parse('min(3, 7)')
      expect(result?.value).toBe(3)
    })

    it('max function', () => {
      const result = parse('max(3, 7)')
      expect(result?.value).toBe(7)
    })

    it('clamp function', () => {
      const result = parse('clamp(15, 0, 10)')
      expect(result?.value).toBe(10)
    })

    it('sqrt function', () => {
      const result = parse('sqrt(9)')
      expect(result?.value).toBeCloseTo(3)
    })

    it('log function', () => {
      const result = parse('log(1)')
      expect(result?.value).toBeCloseTo(0)
    })

    it('sin function', () => {
      const result = parse('sin(0)')
      expect(result?.value).toBeCloseTo(0)
    })

    it('abs function', () => {
      const result = parse('abs(-5)')
      expect(result?.value).toBe(5)
    })

    it('mean of distribution', () => {
      const evaluator = new Evaluator()
      parse('x = 1 to 10', evaluator)
      const result = parse('mean(x)', evaluator)
      expect(result?.isScalar()).toBe(true)
      expect(result?.value as number).toBeGreaterThan(1)
    })

    it('std of distribution', () => {
      const evaluator = new Evaluator()
      parse('x = 1 to 10', evaluator)
      const result = parse('std(x)', evaluator)
      expect(result?.isScalar()).toBe(true)
      expect(result?.value as number).toBeGreaterThan(0)
    })

    it('median of distribution', () => {
      const evaluator = new Evaluator()
      parse('x = 1 to 100', evaluator)
      const result = parse('median(x)', evaluator)
      expect(result?.isScalar()).toBe(true)
    })
  })

  describe('Complex real-world scenarios', () => {
    it('cost estimation with uncertainty', () => {
      const evaluator = new Evaluator()
      parse('hours = 10 to 30', evaluator)
      parse('rate = 100 to 200', evaluator) // dollars per hour
      const result = parse('hours * rate', evaluator)

      expect(result?.isDistribution()).toBe(true)
      const p5 = result?.percentile(0.05) ?? 0
      const p95 = result?.percentile(0.95) ?? 0
      expect(p5).toBeGreaterThan(500)  // low end
      expect(p95).toBeLessThan(10000)  // high end
    })

    it('population estimate with proportions', () => {
      const evaluator = new Evaluator()
      parse('total = 300 million', evaluator)
      parse('proportion = 7 of 100', evaluator)
      const result = parse('total * proportion', evaluator)

      expect(result?.isDistribution()).toBe(true)
      const mean = result?.mean() ?? 0
      expect(mean).toBeGreaterThan(1e7)
      expect(mean).toBeLessThan(5e7)
    })

    it('multi-step calculation with units', () => {
      const evaluator = new Evaluator()
      parse('length = 10 to 20 meters', evaluator)
      parse('width = 5 to 10 meters', evaluator)
      parse('height = 3 meters', evaluator)
      const result = parse('length * width * height', evaluator)

      expect(result?.isDistribution()).toBe(true)
      const mean = result?.mean() ?? 0
      expect(mean).toBeGreaterThan(100)
      expect(mean).toBeLessThan(1000)
    })
  })
})
