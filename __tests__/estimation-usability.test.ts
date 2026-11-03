/**
 * Regressions from running real Fermi problems end to end (2026-11):
 * notation that silently produced wrong answers, unit spellings that failed,
 * mixtures, and sensitivity analysis.
 */
import { describe, it, expect } from 'vitest'
import { parse, Evaluator } from '../src/parser/index.js'
import { runCell } from '../src/core/runCell.js'
import { formatQuantityConcise } from '../src/utils/format.js'

describe('compound and product units', () => {
  it('aliases resolve inside tight compounds: kcal/day', () => {
    expect(parse('2000 kcal/day as W')?.value).toBeCloseTo(96.85, 1)
  })

  it('per after a unit forms a compound', () => {
    expect(parse('2000 kcal per day as W')?.value).toBeCloseTo(96.85, 1)
    expect(parse('8 billion * 2000 kcal per day as TW')?.value).toBeCloseTo(0.775, 2)
  })

  it('product units as conversion targets', () => {
    expect(parse('1 GW * 1 day as GW hour')?.value).toBeCloseTo(24)
    expect(parse('10 N as kg m / s^2')?.value).toBeCloseTo(10)
    expect(parse('1 J/kg as m^2 per s^2')?.value).toBeCloseTo(1)
  })

  it('FLOP is a prefixable unit that cancels to time', () => {
    expect(parse('2e24 FLOP / (400 TFLOP/s) as day')?.value).toBeCloseTo(57870, -1)
  })
})

describe('time words are units, not constants', () => {
  it('100 / day keeps its unit', () => {
    expect(parse('100 / day')?.unit.toString()).toBe('day^-1')
  })

  it('/ year is a fixed year, not a leap-year distribution', () => {
    const q = parse('100 / year')!
    expect(q.isDistribution()).toBe(false)
    expect(q.unit.toString()).toBe('year^-1')
  })

  it('calendar_year keeps the leap-year distribution', () => {
    expect(parse('calendar_year')?.isDistribution()).toBe(true)
  })
})

describe('dimension names', () => {
  it('money rates are not tagged {frequency}', () => {
    expect(formatQuantityConcise(parse('5 USD / day')!)).toBe('5.00 USD / day')
  })

  it('us_gdp carries USD/year', () => {
    expect(parse('us_gdp as trillion USD / year')?.mean()).toBeCloseTo(28.8, 0)
  })
})

describe('mixtures via weighted sets', () => {
  it('{0: 0.9, 1 to 10: 0.1} is 90% zero', () => {
    const q = parse('{0: 0.9, 1 to 10: 0.1}')!
    const zeros = q.toParticles().filter((x) => x === 0).length / q.toParticles().length
    expect(zeros).toBeCloseTo(0.9, 1)
  })

  it('a bare 0 adopts the other entries unit; percent weights work', () => {
    const q = parse('{0: 90%, 1 to 10 USD: 10%}')!
    expect(q.unit.toString()).toBe('USD')
  })

  it('entries convert to a common unit', () => {
    const q = parse('{1 m: 1, 50 cm: 1}')!
    expect(new Set(q.toParticles())).toEqual(new Set([1, 0.5]))
  })

  it('rejects incompatible entries', () => {
    expect(() => parse('{1 m: 1, 2 kg: 1}')).toThrow(/incompatible units/)
  })

  it('stays index-aligned with its inputs', () => {
    const ev = new Evaluator()
    parse('x = 1 to 10', ev)
    const q = parse('{x: 1, x: 1} - x', ev)!
    expect(q.toParticles().every((v) => v === 0)).toBe(true)
  })

  it('display flags mass hidden by a collapsed interval', () => {
    const text = formatQuantityConcise(parse('{0: 0.9, 1 to 10: 0.1}')!)
    expect(text).toMatch(/^0 \[0, 0\] \(10% ≠ 0, mean /)
  })
})

describe('sensitivity()', () => {
  const ev = new Evaluator()
  for (const line of [
    'big = 1 to 100',
    'small = 1 to 2',
    'mid = big * small',
    'out = mid / (1 to 1.1)',
  ]) parse(line, ev)

  it('returns its argument and reports leaf inputs, largest first', () => {
    const r = runCell('sensitivity(out)', ev)
    expect(r.error).toBeNull()
    expect(r.quantity?.isDistribution()).toBe(true)
    const lines = r.report!.split('\n')
    expect(lines[0]).toBe('Sensitivity of out (share of variance):')
    expect(lines[1]).toMatch(/^\s+big\s+\+\s+9\d%/)
    expect(lines[2]).toMatch(/^\s+small\s+\+/)
    // `mid` is computed from inputs, so it is not itself an input
    expect(r.report).not.toMatch(/\bmid\b/)
  })

  it('errors on a constant', () => {
    parse('c = 5', ev)
    expect(runCell('sensitivity(c)', ev).error).toMatch(/uncertain/)
  })

  it('reports are cleared after being read', () => {
    runCell('sensitivity(out)', ev)
    expect(runCell('out', ev).report).toBeNull()
  })
})
