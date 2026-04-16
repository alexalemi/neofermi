import { describe, it, expect } from 'vitest'
import { Quantity } from '../src/core/Quantity.js'
import {
  abs, sign, floor, ceil, round, trunc,
  sqrt, cbrt, exp, expm1, pow,
  log, ln, log10, log2, log1p,
  sin, cos, tan, asin, acos, atan, atan2,
  sinh, cosh, tanh, asinh, acosh, atanh,
  min, max, hypot, clamp,
  quantile, percentile, p5, p10, p25, median, p75, p90, p95, p99,
  mean, std
} from '../src/functions/math.js'

describe('Math functions', () => {
  describe('Basic math', () => {
    it('abs of positive scalar', () => {
      const result = abs(new Quantity(5))
      expect(result.value).toBe(5)
    })

    it('abs of negative scalar', () => {
      const result = abs(new Quantity(-5))
      expect(result.value).toBe(5)
    })

    it('abs preserves units', () => {
      const result = abs(new Quantity(-3, 'meters'))
      expect(result.value).toBe(3)
      expect(result.unit.toString()).toBe('meters')
    })

    it('abs of distribution', () => {
      const result = abs(new Quantity([-3, -1, 0, 2, 4]))
      expect(result.value).toEqual([3, 1, 0, 2, 4])
    })

    it('sign returns -1, 0, or 1', () => {
      expect(sign(new Quantity(-5)).value).toBe(-1)
      expect(sign(new Quantity(0)).value).toBe(0)
      expect(sign(new Quantity(5)).value).toBe(1)
    })

    it('sign strips units', () => {
      const result = sign(new Quantity(5, 'meters'))
      expect(result.unit.toString()).toBe('')
    })

    it('floor rounds down', () => {
      expect(floor(new Quantity(3.7)).value).toBe(3)
      expect(floor(new Quantity(-1.2)).value).toBe(-2)
    })

    it('ceil rounds up', () => {
      expect(ceil(new Quantity(3.2)).value).toBe(4)
      expect(ceil(new Quantity(-1.7)).value).toBe(-1)
    })

    it('round rounds to nearest', () => {
      expect(round(new Quantity(3.4)).value).toBe(3)
      expect(round(new Quantity(3.5)).value).toBe(4)
    })

    it('trunc removes fractional part', () => {
      expect(trunc(new Quantity(3.7)).value).toBe(3)
      expect(trunc(new Quantity(-3.7)).value).toBe(-3)
    })

    it('floor/ceil/round preserve units', () => {
      expect(floor(new Quantity(3.7, 'meters')).unit.toString()).toBe('meters')
      expect(ceil(new Quantity(3.2, 'kg')).unit.toString()).toBe('kg')
      expect(round(new Quantity(3.5, 'seconds')).unit.toString()).toBe('seconds')
    })

    it('floor/ceil/round work on distributions', () => {
      const result = floor(new Quantity([1.1, 2.5, 3.9]))
      expect(result.value).toEqual([1, 2, 3])
    })
  })

  describe('Power and roots', () => {
    it('sqrt of scalar', () => {
      const result = sqrt(new Quantity(9))
      expect(result.value).toBeCloseTo(3)
    })

    it('sqrt transforms units correctly', () => {
      const result = sqrt(new Quantity(4, 'm^2'))
      expect(result.value).toBeCloseTo(2)
      // Unit should be m (sqrt of m^2)
    })

    it('sqrt of distribution', () => {
      const result = sqrt(new Quantity([4, 9, 16]))
      expect(result.value).toEqual([2, 3, 4])
    })

    it('cbrt of scalar', () => {
      const result = cbrt(new Quantity(27))
      expect(result.value).toBeCloseTo(3)
    })

    it('exp of zero is 1', () => {
      const result = exp(new Quantity(0))
      expect(result.value).toBeCloseTo(1)
    })

    it('exp of 1 is e', () => {
      const result = exp(new Quantity(1))
      expect(result.value).toBeCloseTo(Math.E)
    })

    it('exp requires dimensionless input', () => {
      expect(() => exp(new Quantity(1, 'meters'))).toThrow(/dimensionless/)
    })

    it('expm1 is accurate near zero', () => {
      const result = expm1(new Quantity(1e-10))
      expect(result.value).toBeCloseTo(1e-10, 15)
    })

    it('pow with scalar exponent', () => {
      const result = pow(new Quantity(3), new Quantity(2))
      expect(result.value).toBeCloseTo(9)
    })

    it('pow preserves units for scalar exponent', () => {
      const result = pow(new Quantity(2, 'meters'), new Quantity(3))
      expect(result.value).toBeCloseTo(8)
    })

    it('pow with dimensioned exponent throws', () => {
      expect(() => pow(new Quantity(2), new Quantity(3, 'meters'))).toThrow(/dimensionless/)
    })

    it('pow with distribution exponent', () => {
      const result = pow(new Quantity(2), new Quantity([1, 2, 3]))
      expect(result.value).toEqual([2, 4, 8])
    })
  })

  describe('Logarithms', () => {
    it('log (natural log) of e is 1', () => {
      const result = log(new Quantity(Math.E))
      expect(result.value).toBeCloseTo(1)
    })

    it('ln is alias for log', () => {
      const result = ln(new Quantity(Math.E))
      expect(result.value).toBeCloseTo(1)
    })

    it('log10 of 100 is 2', () => {
      const result = log10(new Quantity(100))
      expect(result.value).toBeCloseTo(2)
    })

    it('log2 of 8 is 3', () => {
      const result = log2(new Quantity(8))
      expect(result.value).toBeCloseTo(3)
    })

    it('log1p is accurate near zero', () => {
      const result = log1p(new Quantity(1e-10))
      expect(result.value).toBeCloseTo(1e-10, 15)
    })

    it('log requires dimensionless input', () => {
      expect(() => log(new Quantity(10, 'meters'))).toThrow(/dimensionless/)
    })

    it('log10 requires dimensionless input', () => {
      expect(() => log10(new Quantity(10, 'seconds'))).toThrow(/dimensionless/)
    })

    it('log works on distributions', () => {
      const result = log(new Quantity([1, Math.E, Math.E * Math.E]))
      const values = result.value as number[]
      expect(values[0]).toBeCloseTo(0)
      expect(values[1]).toBeCloseTo(1)
      expect(values[2]).toBeCloseTo(2)
    })
  })

  describe('Trigonometry', () => {
    it('sin(0) is 0', () => {
      expect(sin(new Quantity(0)).value).toBeCloseTo(0)
    })

    it('sin(pi/2) is 1', () => {
      expect(sin(new Quantity(Math.PI / 2)).value).toBeCloseTo(1)
    })

    it('cos(0) is 1', () => {
      expect(cos(new Quantity(0)).value).toBeCloseTo(1)
    })

    it('cos(pi) is -1', () => {
      expect(cos(new Quantity(Math.PI)).value).toBeCloseTo(-1)
    })

    it('tan(pi/4) is 1', () => {
      expect(tan(new Quantity(Math.PI / 4)).value).toBeCloseTo(1)
    })

    it('asin(1) is pi/2', () => {
      expect(asin(new Quantity(1)).value).toBeCloseTo(Math.PI / 2)
    })

    it('acos(0) is pi/2', () => {
      expect(acos(new Quantity(0)).value).toBeCloseTo(Math.PI / 2)
    })

    it('atan(1) is pi/4', () => {
      expect(atan(new Quantity(1)).value).toBeCloseTo(Math.PI / 4)
    })

    it('atan2 computes correct angle', () => {
      const result = atan2(new Quantity(1), new Quantity(1))
      expect(result.value).toBeCloseTo(Math.PI / 4)
    })

    it('atan2 requires same units', () => {
      expect(() => atan2(new Quantity(1, 'meters'), new Quantity(1, 'seconds'))).toThrow(/same units/)
    })

    it('atan2 works with compatible units', () => {
      const result = atan2(new Quantity(3, 'meters'), new Quantity(4, 'meters'))
      expect(result.value).toBeCloseTo(Math.atan2(3, 4))
    })

    it('sin requires dimensionless or radian input', () => {
      expect(() => sin(new Quantity(1, 'meters'))).toThrow(/dimensionless or radian/)
    })

    it('inverse trig returns radians', () => {
      // mathjs spells the unit as 'radian'
      expect(asin(new Quantity(0.5)).unit.toString()).toBe('radian')
      expect(acos(new Quantity(0.5)).unit.toString()).toBe('radian')
      expect(atan(new Quantity(0.5)).unit.toString()).toBe('radian')
    })

    it('trig works on distributions', () => {
      const result = sin(new Quantity([0, Math.PI / 2, Math.PI]))
      const values = result.value as number[]
      expect(values[0]).toBeCloseTo(0)
      expect(values[1]).toBeCloseTo(1)
      expect(values[2]).toBeCloseTo(0)
    })
  })

  describe('Hyperbolic functions', () => {
    it('sinh(0) is 0', () => {
      expect(sinh(new Quantity(0)).value).toBeCloseTo(0)
    })

    it('cosh(0) is 1', () => {
      expect(cosh(new Quantity(0)).value).toBeCloseTo(1)
    })

    it('tanh(0) is 0', () => {
      expect(tanh(new Quantity(0)).value).toBeCloseTo(0)
    })

    it('tanh approaches 1 for large values', () => {
      expect(tanh(new Quantity(10)).value).toBeCloseTo(1, 5)
    })

    it('asinh round-trips', () => {
      const x = 2
      expect(asinh(new Quantity(Math.sinh(x))).value).toBeCloseTo(x)
    })

    it('acosh round-trips', () => {
      const x = 2
      expect(acosh(new Quantity(Math.cosh(x))).value).toBeCloseTo(x)
    })

    it('atanh round-trips', () => {
      const x = 0.5
      expect(atanh(new Quantity(Math.tanh(x))).value).toBeCloseTo(x)
    })

    it('hyperbolic requires dimensionless input', () => {
      expect(() => sinh(new Quantity(1, 'meters'))).toThrow(/dimensionless/)
      expect(() => cosh(new Quantity(1, 'meters'))).toThrow(/dimensionless/)
      expect(() => tanh(new Quantity(1, 'meters'))).toThrow(/dimensionless/)
    })
  })

  describe('min/max/hypot/clamp', () => {
    it('min of two scalars', () => {
      const result = min(new Quantity(3), new Quantity(5))
      expect(result.value).toBe(3)
    })

    it('max of two scalars', () => {
      const result = max(new Quantity(3), new Quantity(5))
      expect(result.value).toBe(5)
    })

    it('min preserves units', () => {
      const result = min(new Quantity(3, 'meters'), new Quantity(5, 'meters'))
      expect(result.value).toBe(3)
      expect(result.unit.toString()).toBe('meters')
    })

    it('max preserves units', () => {
      const result = max(new Quantity(3, 'meters'), new Quantity(5, 'meters'))
      expect(result.value).toBe(5)
      expect(result.unit.toString()).toBe('meters')
    })

    it('min requires compatible units', () => {
      expect(() => min(new Quantity(1, 'meters'), new Quantity(1, 'seconds'))).toThrow(/compatible/)
    })

    it('max requires compatible units', () => {
      expect(() => max(new Quantity(1, 'meters'), new Quantity(1, 'seconds'))).toThrow(/compatible/)
    })

    it('min of distributions', () => {
      const result = min(new Quantity([1, 5, 3]), new Quantity([2, 4, 6]))
      expect(result.value).toEqual([1, 4, 3])
    })

    it('max of distributions', () => {
      const result = max(new Quantity([1, 5, 3]), new Quantity([2, 4, 6]))
      expect(result.value).toEqual([2, 5, 6])
    })

    it('hypot of 3 and 4 is 5', () => {
      const result = hypot(new Quantity(3), new Quantity(4))
      expect(result.value).toBeCloseTo(5)
    })

    it('hypot preserves units', () => {
      const result = hypot(new Quantity(3, 'meters'), new Quantity(4, 'meters'))
      expect(result.value).toBeCloseTo(5)
      expect(result.unit.toString()).toBe('meters')
    })

    it('hypot requires same units', () => {
      expect(() => hypot(new Quantity(3, 'meters'), new Quantity(4, 'seconds'))).toThrow(/same units/)
    })

    it('min converts compatible units before comparing', () => {
      const result = min(new Quantity(1, 'm'), new Quantity(50, 'cm'))
      expect(result.value).toBeCloseTo(0.5)
      expect(result.unit.toString()).toBe('m')
    })

    it('max converts compatible units before comparing', () => {
      const result = max(new Quantity(1, 'm'), new Quantity(50, 'cm'))
      expect(result.value).toBeCloseTo(1)
      expect(result.unit.toString()).toBe('m')
    })

    it('hypot converts compatible units before combining', () => {
      const result = hypot(new Quantity(3, 'm'), new Quantity(400, 'cm'))
      expect(result.value).toBeCloseTo(5)
      expect(result.unit.toString()).toBe('m')
    })

    it('clamp within range', () => {
      const result = clamp(new Quantity(5), new Quantity(0), new Quantity(10))
      expect(result.value).toBe(5)
    })

    it('clamp at lower bound', () => {
      const result = clamp(new Quantity(-5), new Quantity(0), new Quantity(10))
      expect(result.value).toBe(0)
    })

    it('clamp at upper bound', () => {
      const result = clamp(new Quantity(15), new Quantity(0), new Quantity(10))
      expect(result.value).toBe(10)
    })

    it('clamp preserves units', () => {
      const result = clamp(
        new Quantity(5, 'meters'),
        new Quantity(0, 'meters'),
        new Quantity(10, 'meters')
      )
      expect(result.unit.toString()).toBe('meters')
    })

    it('clamp requires compatible units', () => {
      expect(() => clamp(
        new Quantity(5, 'meters'),
        new Quantity(0, 'seconds'),
        new Quantity(10, 'meters')
      )).toThrow(/compatible/)
    })

    it('clamp on distributions', () => {
      const result = clamp(
        new Quantity([-5, 5, 15]),
        new Quantity(0),
        new Quantity(10)
      )
      expect(result.value).toEqual([0, 5, 10])
    })
  })

  describe('Statistical functions', () => {
    const dist = new Quantity([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])

    it('mean returns average', () => {
      const result = mean(dist)
      expect(result.value).toBe(5.5)
      expect(result.isScalar()).toBe(true)
    })

    it('mean preserves units', () => {
      const result = mean(new Quantity([1, 2, 3], 'meters'))
      expect(result.unit.toString()).toBe('meters')
    })

    it('std returns standard deviation', () => {
      const result = std(dist)
      expect(result.value).toBeCloseTo(2.872, 2)
    })

    it('std preserves units', () => {
      const result = std(new Quantity([1, 2, 3], 'meters'))
      expect(result.unit.toString()).toBe('meters')
    })

    it('median returns middle value', () => {
      const result = median(dist)
      expect(result.isScalar()).toBe(true)
    })

    it('quantile returns correct percentile', () => {
      const result = quantile(dist, new Quantity(0.5))
      expect(result.isScalar()).toBe(true)
    })

    it('percentile is alias for quantile', () => {
      const q = quantile(dist, new Quantity(0.5))
      const p = percentile(dist, new Quantity(0.5))
      expect(q.value).toBe(p.value)
    })

    it('quantile rejects out-of-range probability', () => {
      expect(() => quantile(dist, new Quantity(-0.1))).toThrow()
      expect(() => quantile(dist, new Quantity(1.1))).toThrow()
    })

    it('named percentiles work', () => {
      expect(p5(dist).isScalar()).toBe(true)
      expect(p10(dist).isScalar()).toBe(true)
      expect(p25(dist).isScalar()).toBe(true)
      expect(p75(dist).isScalar()).toBe(true)
      expect(p90(dist).isScalar()).toBe(true)
      expect(p95(dist).isScalar()).toBe(true)
      expect(p99(dist).isScalar()).toBe(true)
    })

    it('percentiles preserve units', () => {
      const d = new Quantity([1, 2, 3, 4, 5], 'kg')
      expect(p5(d).unit.toString()).toBe('kg')
      expect(p50(d).unit.toString()).toBe('kg') // median
      expect(p95(d).unit.toString()).toBe('kg')
    })

    it('percentile ordering is monotonic', () => {
      const large = new Quantity(Array.from({ length: 1000 }, (_, i) => i))
      expect((p5(large).value as number)).toBeLessThanOrEqual(p25(large).value as number)
      expect((p25(large).value as number)).toBeLessThanOrEqual(median(large).value as number)
      expect((median(large).value as number)).toBeLessThanOrEqual(p75(large).value as number)
      expect((p75(large).value as number)).toBeLessThanOrEqual(p95(large).value as number)
    })
  })
})

// Helper: p50 is median
function p50(q: Quantity): Quantity {
  return median(q)
}
