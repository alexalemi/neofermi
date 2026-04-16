import { describe, it, expect } from 'vitest'
import { parse, Evaluator } from '../src/parser/index.js'
import { Quantity } from '../src/core/Quantity.js'

describe('Unit system', () => {
  describe('Basic unit conversions', () => {
    it('meters to kilometers', () => {
      const result = parse('1000 meters as km')
      expect(result?.value).toBeCloseTo(1)
      expect(result?.unit.toString()).toBe('km')
    })

    it('kilometers to meters', () => {
      const result = parse('1 km as meters')
      expect(result?.value).toBeCloseTo(1000)
    })

    it('kg to grams', () => {
      const result = parse('1 kg as g')
      expect(result?.value).toBeCloseTo(1000)
    })

    it('hours to seconds', () => {
      const result = parse('1 hour as seconds')
      expect(result?.value).toBeCloseTo(3600)
    })

    it('miles to kilometers', () => {
      const result = parse('1 mile as km')
      expect(result?.value).toBeCloseTo(1.609, 2)
    })

    it('Celsius to Fahrenheit not supported (offset)', () => {
      // NeoFermi uses multiplicative conversion, not offset-based
      // so temperature conversions like C -> F won't work correctly
      // This is expected behavior for a physics calculator
    })
  })

  describe('Compound units', () => {
    it('speed: meters per second', () => {
      const evaluator = new Evaluator()
      parse('distance = 100 meters', evaluator)
      parse('time = 10 seconds', evaluator)
      const result = parse('distance / time', evaluator)
      expect(result?.value).toBeCloseTo(10)
    })

    it('area: meters squared', () => {
      const result = parse('10 meters * 5 meters')
      expect(result?.value).toBeCloseTo(50)
    })

    it('unit cancellation', () => {
      const evaluator = new Evaluator()
      parse('speed = 10 meters / 1 seconds', evaluator)
      parse('time = 5 seconds', evaluator)
      const result = parse('speed * time', evaluator)
      // meters/second * seconds = meters
      expect(result?.value).toBeCloseTo(50)
    })

    it('reciprocal unit with /', () => {
      const result = parse('100 /second')
      expect(result?.value).toBeCloseTo(100)
    })

    it('reciprocal unit with per', () => {
      const result = parse('100 per second')
      expect(result?.value).toBeCloseTo(100)
    })
  })

  describe('Unit arithmetic compatibility', () => {
    it('adding same units works', () => {
      const result = parse('5 meters + 3 meters')
      expect(result?.value).toBeCloseTo(8)
      expect(result?.unit.toString()).toBe('meters')
    })

    it('adding incompatible units throws', () => {
      expect(() => parse('5 meters + 3 seconds')).toThrow()
    })

    it('subtracting same units works', () => {
      const result = parse('10 meters - 3 meters')
      expect(result?.value).toBeCloseTo(7)
    })

    it('subtracting incompatible units throws', () => {
      expect(() => parse('5 meters - 3 seconds')).toThrow()
    })

    it('multiplying different units works', () => {
      const result = parse('5 meters * 3 seconds')
      expect(result?.value).toBeCloseTo(15)
    })

    it('dividing different units works', () => {
      const result = parse('100 meters / 10 seconds')
      expect(result?.value).toBeCloseTo(10)
    })
  })

  describe('Custom unit definitions', () => {
    it('defines and uses custom unit', () => {
      const evaluator = new Evaluator()
      parse("1 'widget = 5 kg", evaluator)
      const result = parse("10 'widget", evaluator)
      expect(result?.value).toBeCloseTo(50)
      expect(result?.unit.toString()).toBe('kg')
    })

    it('custom units in expressions', () => {
      const evaluator = new Evaluator()
      parse("1 'box = 2 meters", evaluator)
      const result = parse("3 'box + 1 meters", evaluator)
      expect(result?.value).toBeCloseTo(7)
    })

    it('custom unit persists', () => {
      const evaluator = new Evaluator()
      parse("1 'foo = 100", evaluator)
      parse("x = 3 'foo", evaluator)
      parse("y = 2 'foo", evaluator)
      const result = parse("x + y", evaluator)
      expect(result?.mean()).toBeCloseTo(500)
    })
  })

  describe('Label units (undefined custom)', () => {
    it('label unit without definition', () => {
      const result = parse("100 'points")
      expect(result?.value).toBe(100)
      expect(result?.unit.toString()).toBe('points')
    })

    it('same label units can be added', () => {
      const result = parse("100 'points + 50 'points")
      expect(result?.value).toBe(150)
    })

    it('label units can be multiplied by scalar', () => {
      const result = parse("100 'points * 3")
      expect(result?.value).toBe(300)
    })

    it('different label units cannot be added', () => {
      expect(() => parse("100 'apples + 50 'oranges")).toThrow(/incompatible/)
    })

    it('label units cannot mix with standard units', () => {
      expect(() => parse("100 'points + 50 kg")).toThrow(/incompatible/)
    })
  })

  describe('Unit conversion with distributions', () => {
    it('converts range distribution units', () => {
      const result = parse('1 to 10 meters as feet')
      expect(result?.isDistribution()).toBe(true)
      expect(result?.unit.toString()).toBe('feet')
      const mean = result?.mean() ?? 0
      expect(mean).toBeGreaterThan(3)
      expect(mean).toBeLessThan(33)
    })

    it('converts normal distribution units', () => {
      const result = parse('100 +/- 10 meters as km')
      expect(result?.isDistribution()).toBe(true)
      expect(result?.unit.toString()).toBe('km')
    })

    it('conversion chain works', () => {
      const result = parse('1000 meters as feet as inches')
      expect(result?.unit.toString()).toBe('inches')
      expect(result?.value).toBeCloseTo(39370, -2)
    })
  })

  describe('Unit powers', () => {
    it('squared unit via exponent', () => {
      const result = parse('100 m^2')
      expect(result?.value).toBeCloseTo(100)
    })

    it('cubed unit', () => {
      const result = parse('1000 m^3')
      expect(result?.value).toBeCloseTo(1000)
    })
  })

  describe('Quantity unit conversion method', () => {
    it('converts between compatible units', () => {
      const a = new Quantity(1000, 'meters')
      const b = a.to('km')
      expect(b.value).toBeCloseTo(1)
    })

    it('throws on incompatible conversion', () => {
      const a = new Quantity(5, 'meters')
      expect(() => a.to('seconds')).toThrow(/incompatible/)
    })

    it('converts distribution', () => {
      const a = new Quantity([1000, 2000, 3000], 'meters')
      const b = a.to('km')
      const values = b.value as number[]
      expect(values[0]).toBeCloseTo(1)
      expect(values[1]).toBeCloseTo(2)
      expect(values[2]).toBeCloseTo(3)
    })
  })
})
