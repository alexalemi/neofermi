/**
 * Inflation-adjusted USD: `dollars_YYYY` pseudo-units.
 *
 * Each `dollars_YYYY` is registered as a scalar multiple of USD equal to
 * CPI_ANCHOR / CPI[YYYY] (see `src/core/inflationUnits.ts`). Tests here
 * verify the dimensional plumbing and sanity-check famous benchmarks
 * against widely-agreed historical purchasing-power facts.
 *
 * Assertions use generous tolerances so future CPI refreshes don't
 * break them — CPI changes year-over-year, and the point is that the
 * *order of magnitude* is right, not the 4th sig fig.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../src/parser/index.js'

describe('Inflation-adjusted dollar units', () => {
  it('`dollars_YYYY` parses; canonical display omits the underscore (mathjs limitation)', () => {
    // mathjs forbids `_` in unit names, so the canonical form is `dollars1960`.
    // `dollars_1960` is accepted on input as an alias for Frink-style parity.
    const withUnderscore = parse('100 dollars_1960')
    expect(withUnderscore?.value).toBeCloseTo(100)
    expect(withUnderscore?.unit.toString()).toBe('dollars1960')
    const withoutUnderscore = parse('100 dollars1960')
    expect(withoutUnderscore?.value).toBeCloseTo(100)
    expect(withoutUnderscore?.unit.toString()).toBe('dollars1960')
  })

  it('`100 dollars_1960 as USD` is in the ~10x ballpark', () => {
    // $1 in 1960 → ~$10–11 today. Anchor drifts with each CPI refresh,
    // so check "between 5 and 20" rather than a specific value.
    const r = parse('100 dollars_1960 as USD')
    expect(r?.unit.toString()).toBe('USD')
    expect(r?.value).toBeGreaterThan(500)
    expect(r?.value).toBeLessThan(2000)
  })

  it('recent-year dollar is near parity with present USD', () => {
    // dollars_2024 should be within ~20% of 1 USD.
    const r = parse('1 dollars_2024 as USD') as { value: number }
    expect(r.value).toBeGreaterThan(0.95)
    expect(r.value).toBeLessThan(1.2)
  })

  it('USD → dollars_YYYY round-trips to the original value', () => {
    // Decouple from rate — equivalent to "100 -> converted -> back is 100".
    const there = parse('100 USD as dollars_1970')
    expect(there?.unit.toString()).toBe('dollars1970')
    const back = parse(`${there?.value} dollars1970 as USD`)
    expect(back?.value).toBeCloseTo(100, 3)
  })

  it('different-year dollars can be added (both reduce to money dimension)', () => {
    const r = parse('1 dollars_1960 + 1 dollars_2020 as USD')
    expect(r?.unit.toString()).toBe('USD')
    // 1960 is ~$10, 2020 is ~$1.25 → sum ~ $11–12
    expect(r?.value).toBeGreaterThan(8)
    expect(r?.value).toBeLessThan(15)
  })

  it('dollars can convert to other currencies (same money dimension)', () => {
    const r = parse('100 dollars_1980 as EUR')
    expect(r?.unit.toString()).toBe('EUR')
    expect(r?.value).toBeGreaterThan(100)
  })

  it('boundary years 1913 and present-year are registered', () => {
    expect(parse('1 dollars_1913 as USD')?.value).toBeGreaterThan(20)
    expect(parse('1 dollars_2026 as USD')?.value).toBeCloseTo(1, 0)
  })

  it('older-year dollars > newer-year dollars (monotonic inflation, usually)', () => {
    // Broad monotonicity — modulo the Great Depression, each decade
    // is worth strictly less than the one before in present terms.
    const y1960 = parse('1 dollars_1960 as USD')?.value as number
    const y1980 = parse('1 dollars_1980 as USD')?.value as number
    const y2000 = parse('1 dollars_2000 as USD')?.value as number
    const y2020 = parse('1 dollars_2020 as USD')?.value as number
    expect(y1960).toBeGreaterThan(y1980)
    expect(y1980).toBeGreaterThan(y2000)
    expect(y2000).toBeGreaterThan(y2020)
  })

  it('works inside distributions (`1 to 10 thousand dollars_1960`)', () => {
    const r = parse('1 to 10 thousand dollars_1960 as USD')
    expect(r?.unit.toString()).toBe('USD')
    expect(r?.isDistribution()).toBe(true)
    const mean = r?.mean() ?? 0
    // $1k–$10k in 1960 dollars → roughly $10k–$100k today.
    expect(mean).toBeGreaterThan(1e4)
    expect(mean).toBeLessThan(1e6)
  })
})
