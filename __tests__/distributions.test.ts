import { describe, it, expect } from 'vitest'
import { lognormal, normal, uniform, plusminus, outof, gamma, to, poisson, exponential, exponentialMean, binomial } from '../src/index.js'
import { crps } from '../src/functions/math.js'
import { Quantity } from '../src/core/Quantity.js'

describe('Distributions', () => {
  const TOLERANCE = 0.1 // 10% tolerance for statistical tests

  describe('lognormal', () => {
    it('creates distribution with correct sample count', () => {
      const q = lognormal(10, 100, undefined, 0.9, 1000)
      expect(q.sampleCount).toBe(1000)
    })

    it('has mean in expected range', () => {
      // Geometric mean of 10 and 100 is sqrt(1000) ≈ 31.6
      // But lognormal mean is actually higher than geometric mean
      const q = lognormal(10, 100, undefined, 0.9, 20000)
      const mean = q.mean()
      expect(mean).toBeGreaterThan(20) // Above geometric mean
      expect(mean).toBeLessThan(60) // Below upper bound
    })

    it('has 5th and 95th percentiles near bounds', () => {
      const q = lognormal(10, 100, undefined, 0.9, 20000)
      const p5 = q.percentile(0.05)
      const p95 = q.percentile(0.95)

      // Should be roughly near the bounds (within 20%)
      expect(p5).toBeGreaterThan(10 * 0.8)
      expect(p5).toBeLessThan(10 * 1.2)
      expect(p95).toBeGreaterThan(100 * 0.8)
      expect(p95).toBeLessThan(100 * 1.2)
    })

    it('throws on non-positive bounds', () => {
      expect(() => lognormal(-1, 10)).toThrow()
      expect(() => lognormal(0, 10)).toThrow()
    })

    it('respects units', () => {
      const q = lognormal(10, 100, 'meters', 0.9, 100)
      expect(q.unit.toString()).toBe('meters')
    })
  })

  describe('normal', () => {
    it('has mean near center of range', () => {
      const q = normal(0, 100, undefined, 0.9, 20000)
      const mean = q.mean()
      expect(mean).toBeGreaterThan(48)
      expect(mean).toBeLessThan(52)
    })

    it('has 5th and 95th percentiles near bounds', () => {
      const q = normal(0, 100, undefined, 0.9, 20000)
      const p5 = q.percentile(0.05)
      const p95 = q.percentile(0.95)

      // Should be within 10% of the bounds
      expect(p5).toBeGreaterThan(-5)
      expect(p5).toBeLessThan(5)
      expect(p95).toBeGreaterThan(95)
      expect(p95).toBeLessThan(105)
    })

    it('handles negative values', () => {
      const q = normal(-50, 50, undefined, 0.9, 1000)
      const mean = q.mean()
      // With 1000 samples, expect within a couple units of zero
      expect(mean).toBeGreaterThan(-3)
      expect(mean).toBeLessThan(3)
    })
  })

  describe('plusminus', () => {
    it('has correct mean and std', () => {
      const q = plusminus(100, 10, undefined, 20000)
      expect(q.mean()).toBeCloseTo(100, 0) // Within 0.5
      expect(q.std()).toBeCloseTo(10, 0) // Within 0.5
    })
  })

  describe('uniform', () => {
    it('has mean near center', () => {
      const q = uniform(0, 100, undefined, 20000)
      const mean = q.mean()
      expect(mean).toBeCloseTo(50, 0) // Within 0.5
    })

    it('has roughly flat distribution', () => {
      const q = uniform(0, 100, undefined, 20000)
      const p25 = q.percentile(0.25)
      const p50 = q.percentile(0.50)
      const p75 = q.percentile(0.75)

      // Should be close to 25, 50, 75 within a couple units
      expect(p25).toBeGreaterThan(23)
      expect(p25).toBeLessThan(27)
      expect(p50).toBeGreaterThan(48)
      expect(p50).toBeLessThan(52)
      expect(p75).toBeGreaterThan(73)
      expect(p75).toBeLessThan(77)
    })
  })

  describe('outof', () => {
    it('has mean near observed proportion', () => {
      const q = outof(7, 10, 20000)
      const mean = q.mean()
      // With Laplace smoothing: (7+1)/(10+2) = 8/12 ≈ 0.667
      expect(mean).toBeCloseTo(0.667, 1)
    })

    it('values are between 0 and 1', () => {
      const q = outof(5, 10, 1000)
      const values = q.toParticles()
      expect(Math.min(...values)).toBeGreaterThanOrEqual(0)
      expect(Math.max(...values)).toBeLessThanOrEqual(1)
    })

    it('tighter distribution with more data', () => {
      const q1 = outof(7, 10, 20000)
      const q2 = outof(70, 100, 20000)

      // Both have mean near 0.7, but q2 should have smaller std
      expect(q1.mean()).toBeCloseTo(q2.mean(), 1)
      expect(q2.std()).toBeLessThan(q1.std())
    })
  })

  describe('gamma', () => {
    it('creates positive values only', () => {
      const q = gamma(5, 1, undefined, 1000)
      const values = q.toParticles()
      expect(Math.min(...values)).toBeGreaterThan(0)
    })

    it('mean approximates shape*scale', () => {
      const shape = 10
      const scale = 2
      const q = gamma(shape, scale, undefined, 20000)
      const expectedMean = shape * scale
      expect(q.mean()).toBeCloseTo(expectedMean, -0.5) // Within order of magnitude
    })
  })

  describe('poisson', () => {
    it('creates non-negative integer values', () => {
      const q = poisson(5, undefined, 1000)
      const values = q.toParticles()
      expect(Math.min(...values)).toBeGreaterThanOrEqual(0)
      values.forEach(v => expect(Number.isInteger(v)).toBe(true))
    })

    it('mean approximates lambda', () => {
      const lambda = 10
      const q = poisson(lambda, undefined, 20000)
      expect(q.mean()).toBeCloseTo(lambda, 0)
    })

    it('variance approximates lambda', () => {
      const lambda = 15
      const q = poisson(lambda, undefined, 20000)
      const variance = q.std() ** 2
      expect(variance).toBeCloseTo(lambda, 0)
    })

    it('throws on non-positive lambda', () => {
      expect(() => poisson(0)).toThrow()
      expect(() => poisson(-5)).toThrow()
    })

    it('respects units', () => {
      const q = poisson(5, 'kg', 100)
      expect(q.unit.toString()).toBe('kg')
    })
  })

  describe('exponential', () => {
    it('creates positive values only', () => {
      const q = exponential(0.5, undefined, 1000)
      const values = q.toParticles()
      expect(Math.min(...values)).toBeGreaterThan(0)
    })

    it('mean approximates 1/rate', () => {
      const rate = 0.2
      const q = exponential(rate, undefined, 20000)
      expect(q.mean()).toBeCloseTo(1 / rate, 0)
    })

    it('throws on non-positive rate', () => {
      expect(() => exponential(0)).toThrow()
      expect(() => exponential(-1)).toThrow()
    })

    it('respects units', () => {
      const q = exponential(0.1, 'seconds', 100)
      expect(q.unit.toString()).toBe('seconds')
    })
  })

  describe('exponentialMean', () => {
    it('mean approximates specified mean', () => {
      const meanVal = 10
      const q = exponentialMean(meanVal, undefined, 20000)
      expect(q.mean()).toBeCloseTo(meanVal, 0)
    })

    it('throws on non-positive mean', () => {
      expect(() => exponentialMean(0)).toThrow()
      expect(() => exponentialMean(-5)).toThrow()
    })
  })

  describe('binomial', () => {
    it('creates values between 0 and n', () => {
      const n = 20
      const q = binomial(n, 0.5, undefined, 1000)
      const values = q.toParticles()
      expect(Math.min(...values)).toBeGreaterThanOrEqual(0)
      expect(Math.max(...values)).toBeLessThanOrEqual(n)
      values.forEach(v => expect(Number.isInteger(v)).toBe(true))
    })

    it('mean approximates n*p', () => {
      const n = 100
      const p = 0.3
      const q = binomial(n, p, undefined, 20000)
      expect(q.mean()).toBeCloseTo(n * p, 0)
    })

    it('variance approximates n*p*(1-p)', () => {
      const n = 100
      const p = 0.4
      const q = binomial(n, p, undefined, 20000)
      const variance = q.std() ** 2
      const expected = n * p * (1 - p)
      expect(variance).toBeGreaterThan(expected * 0.9)
      expect(variance).toBeLessThan(expected * 1.1)
    })

    it('throws on invalid n', () => {
      expect(() => binomial(0, 0.5)).toThrow()
      expect(() => binomial(-10, 0.5)).toThrow()
      expect(() => binomial(10.5, 0.5)).toThrow()
    })

    it('throws on invalid p', () => {
      expect(() => binomial(10, -0.1)).toThrow()
      expect(() => binomial(10, 1.1)).toThrow()
    })

    it('respects units', () => {
      const q = binomial(10, 0.5, 'kg', 100)
      expect(q.unit.toString()).toBe('kg')
    })
  })

  describe('to (convenience)', () => {
    it('uses lognormal for positive bounds', () => {
      const q = to(10, 100, undefined, 0.9, 1000)
      // Should behave like lognormal
      const mean = q.mean()
      expect(mean).toBeGreaterThan(10)
      expect(mean).toBeLessThan(100)
    })

    it('uses normal for ranges including negative', () => {
      const q = to(-10, 10, undefined, 0.9, 1000)
      const mean = q.mean()
      // Should behave like normal - mean near 0
      expect(mean).toBeGreaterThan(-2)
      expect(mean).toBeLessThan(2)
    })
  })

  describe('crps', () => {
    it('returns 0 for point mass at observation', () => {
      // A distribution that's a point mass at 5 should have CRPS=0 when observation is 5
      const dist = new Quantity([5, 5, 5, 5, 5])
      const obs = new Quantity(5)
      const score = crps(dist, obs)
      expect(score.value).toBeCloseTo(0, 10)
    })

    it('increases as observation moves away from distribution', () => {
      const dist = normal(0, 10, undefined, 0.9, 5000)
      const obs1 = new Quantity(5) // Near mean
      const obs2 = new Quantity(20) // Far from mean
      const obs3 = new Quantity(50) // Very far from mean

      const score1 = crps(dist, obs1)
      const score2 = crps(dist, obs2)
      const score3 = crps(dist, obs3)

      expect((score1.value as number)).toBeLessThan((score2.value as number))
      expect((score2.value as number)).toBeLessThan((score3.value as number))
    })

    it('narrower distribution has lower CRPS when observation matches mean', () => {
      // When observation matches the mean, tighter distributions score better
      const narrow = plusminus(50, 5, undefined, 5000)
      const wide = plusminus(50, 20, undefined, 5000)
      const obs = new Quantity(50) // At the mean

      const narrowScore = crps(narrow, obs)
      const wideScore = crps(wide, obs)

      expect((narrowScore.value as number)).toBeLessThan((wideScore.value as number))
    })

    it('wider distribution scores better when observation is in tail', () => {
      // When observation is far from mean, wider distribution may score better
      const narrow = plusminus(50, 5, undefined, 5000)
      const wide = plusminus(50, 30, undefined, 5000)
      const obs = new Quantity(80) // In tail for narrow, reasonable for wide

      const narrowScore = crps(narrow, obs)
      const wideScore = crps(wide, obs)

      expect((wideScore.value as number)).toBeLessThan((narrowScore.value as number))
    })

    it('is always non-negative', () => {
      const dist = normal(-10, 10, undefined, 0.9, 5000)
      const observations = [-100, -10, 0, 10, 100]

      for (const y of observations) {
        const score = crps(dist, new Quantity(y))
        expect((score.value as number)).toBeGreaterThanOrEqual(0)
      }
    })

    it('preserves units', () => {
      const dist = normal(0, 100, 'meters', 0.9, 1000)
      const obs = new Quantity(50, 'meters')
      const score = crps(dist, obs)
      expect(score.unit.toString()).toBe('meters')
    })

    it('throws on incompatible units', () => {
      const dist = normal(0, 100, 'meters', 0.9, 100)
      const obs = new Quantity(50, 'seconds')
      expect(() => crps(dist, obs)).toThrow(/compatible units/)
    })

    it('handles distribution observations element-wise', () => {
      const dist = plusminus(50, 10, undefined, 1000)
      const obsDistribution = new Quantity([45, 50, 55]) // Three observation values

      const scores = crps(dist, obsDistribution)

      // Should return a distribution of scores
      expect(scores.isDistribution()).toBe(true)
      expect(scores.sampleCount).toBe(3)

      // Middle observation (50) should have lowest score
      const particles = scores.toParticles()
      expect(particles[1]).toBeLessThan(particles[0]) // 50 < 45's score
      expect(particles[1]).toBeLessThan(particles[2]) // 50 < 55's score
    })

    it('matches naive O(n²) computation', () => {
      // Verify the efficient algorithm matches the naive one
      const samples = [1, 3, 5, 7, 9]
      const dist = new Quantity(samples)
      const obs = new Quantity(4)

      // Naive computation:
      // E|X - y| = (|1-4| + |3-4| + |5-4| + |7-4| + |9-4|) / 5 = (3+1+1+3+5)/5 = 13/5 = 2.6
      // E|X - X'| = sum of all |xi - xj| / 25
      // Pairs: |1-1|=0, |1-3|=2, |1-5|=4, |1-7|=6, |1-9|=8
      //        |3-1|=2, |3-3|=0, |3-5|=2, |3-7|=4, |3-9|=6
      //        |5-1|=4, |5-3|=2, |5-5|=0, |5-7|=2, |5-9|=4
      //        |7-1|=6, |7-3|=4, |7-5|=2, |7-7|=0, |7-9|=2
      //        |9-1|=8, |9-3|=6, |9-5|=4, |9-7|=2, |9-9|=0
      // Sum = 2*(2+4+6+8+2+4+6+2+4+2) = 2*40 = 80
      // E|X-X'| = 80/25 = 3.2
      // CRPS = 2.6 - 0.5 * 3.2 = 2.6 - 1.6 = 1.0

      const score = crps(dist, obs)
      expect((score.value as number)).toBeCloseTo(1.0, 10)
    })
  })
})
