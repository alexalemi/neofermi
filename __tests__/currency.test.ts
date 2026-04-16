import { describe, it, expect } from 'vitest'
import { parse } from '../src/parser/index.js'
import { LONG_SCALE_WORDS } from '../src/core/scaleWords.js'

describe('Currency conversion', () => {
  it('bare USD quantity', () => {
    const result = parse('100 USD')
    expect(result?.value).toBeCloseTo(100)
    expect(result?.unit.toString()).toBe('USD')
  })

  it('USD to EUR via `as`', () => {
    const result = parse('100 USD as EUR')
    expect(result?.value).toBeCloseTo(100 / 1.05, 2)
    expect(result?.unit.toString()).toBe('EUR')
  })

  it('EUR to USD via `as`', () => {
    const result = parse('100 EUR as USD')
    expect(result?.value).toBeCloseTo(105)
    expect(result?.unit.toString()).toBe('USD')
  })

  it('adding different currencies aligns to left unit', () => {
    const result = parse('5 EUR + 10 USD')
    expect(result?.value).toBeCloseTo(5 + 10 / 1.05, 2)
    expect(result?.unit.toString()).toBe('EUR')
  })

  it('JPY rate is plausible (1 USD ≈ 155 JPY)', () => {
    const result = parse('1 USD as JPY')
    expect(result?.value).toBeGreaterThan(100)
    expect(result?.value).toBeLessThan(200)
  })

  it('KRW rate is plausible (1 USD ≈ 1400 KRW)', () => {
    const result = parse('1 USD as KRW')
    expect(result?.value).toBeGreaterThan(1000)
    expect(result?.value).toBeLessThan(2000)
  })
})

describe('Scale words', () => {
  it('"1 billion USD" scales value not unit', () => {
    const result = parse('1 billion USD')
    expect(result?.value).toBeCloseTo(1e9)
    expect(result?.unit.toString()).toBe('USD')
  })

  it('"500 thousand EUR" scales value', () => {
    const result = parse('500 thousand EUR')
    expect(result?.value).toBeCloseTo(5e5)
    expect(result?.unit.toString()).toBe('EUR')
  })

  it('"3 million years" scales with non-currency unit', () => {
    const result = parse('3 million years')
    expect(result?.value).toBeCloseTo(3e6)
    expect(result?.unit.toString()).toBe('years')
  })

  it('bare scale word stays dimensionless (back-compat)', () => {
    const result = parse('5 million')
    expect(result?.value).toBeCloseTo(5e6)
    expect(result?.unit.toString()).toBe('')
  })

  it('long-form sextillion/septillion work via new grammar slot', () => {
    expect(parse('1 sextillion')?.value).toBeCloseTo(1e21)
    expect(parse('1 septillion')?.value).toBeCloseTo(1e24)
  })

  it('short-form K/M/B/T work via back-compat identifier path', () => {
    // Short forms require whitespace: no-space `5K` parses as two statements.
    expect(parse('5 K')?.value).toBeCloseTo(5e3)
    expect(parse('5 M')?.value).toBeCloseTo(5e6)
    expect(parse('5 B')?.value).toBeCloseTo(5e9)
    expect(parse('5 T')?.value).toBeCloseTo(5e12)
  })

  it('grammar ScaleWord rule covers every LONG_SCALE_WORDS key', () => {
    for (const word of Object.keys(LONG_SCALE_WORDS)) {
      const expected = LONG_SCALE_WORDS[word as keyof typeof LONG_SCALE_WORDS]
      const result = parse(`1 ${word}`)
      expect(result?.value, `scale word: ${word}`).toBeCloseTo(expected)
    }
  })
})

describe('Range/distribution with scale word on right bound', () => {
  it('"100 to 200 million" scales both bounds', () => {
    const result = parse('100 to 200 million')
    const particles = result?.toParticles() ?? []
    expect(Math.min(...particles)).toBeGreaterThanOrEqual(1e8 / 10)
    expect(Math.max(...particles)).toBeLessThanOrEqual(2e8 * 10)
    expect(result?.mean()).toBeGreaterThan(1e8)
    expect(result?.mean()).toBeLessThan(2e8)
  })

  it('"1 to 2 million USD" scales bare left to the right multiplier', () => {
    const result = parse('1 to 2 million USD')
    expect(result?.unit.toString()).toBe('USD')
    const mean = result?.mean() ?? 0
    // Mean of lognormal over [1e6, 2e6] should be roughly 1.4–1.5e6
    expect(mean).toBeGreaterThan(1e6)
    expect(mean).toBeLessThan(2e6)
  })

  it('"1 .. 2 million USD" uniform scales both bounds', () => {
    const result = parse('1 .. 2 million USD')
    expect(result?.unit.toString()).toBe('USD')
    const mean = result?.mean() ?? 0
    // Uniform over [1e6, 2e6] has mean 1.5e6
    expect(mean).toBeGreaterThan(1.3e6)
    expect(mean).toBeLessThan(1.7e6)
  })

  it('"1 +/- 2 million USD" normal scales mean to sigma multiplier', () => {
    const result = parse('1 +/- 2 million USD')
    expect(result?.unit.toString()).toBe('USD')
    // Mean should be around 1 million (scaled up from `1`)
    const mean = result?.mean() ?? 0
    expect(mean).toBeGreaterThan(0.5e6)
    expect(mean).toBeLessThan(1.5e6)
  })

  it('"1 thousand to 1 million" keeps both explicit multipliers', () => {
    // Verifies we don't regress: both bounds already have their own scale
    // word, so the right-bound rebalance branch must NOT fire and double-apply.
    // The result is lognormal spanning 3 OOM — check via percentiles rather
    // than the arithmetic mean (lognormal tails make mean sensitive to seed).
    const particles = parse('1 thousand to 1 million')?.toParticles() ?? []
    const sorted = [...particles].sort((a, b) => a - b)
    const p50 = sorted[Math.floor(sorted.length * 0.5)]
    // Median should be geomean ≈ 31,600; generous bounds for MC noise.
    expect(p50).toBeGreaterThan(1e4)
    expect(p50).toBeLessThan(1e5)
  })
})
