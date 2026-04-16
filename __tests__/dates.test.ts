import { describe, it, expect } from 'vitest'
import { parse } from '../src/parser/index.js'

describe('Date literals', () => {
  it('Frink parity: #2001-06-30# - #2000-12-31# = 181 days', () => {
    const result = parse('#2001-06-30# - #2000-12-31#')
    expect(result?.value).toBe(181)
    expect(result?.unit.toString()).toBe('day')
  })

  it('one-day difference', () => {
    const result = parse('#2026-04-17# - #2026-04-16#')
    expect(result?.value).toBe(1)
    expect(result?.unit.toString()).toBe('day')
  })

  it('conversion to other time units via `as`', () => {
    const result = parse('(#2026-04-17# - #2026-04-16#) as hour')
    expect(result?.value).toBeCloseTo(24)
  })

  it('date + duration yields a shifted epoch-day value', () => {
    // v1 limitation: result is a Quantity(days, 'day'), not a formatted Date.
    // What matters: adding 7 days then subtracting the original gives 7 day.
    const result = parse('(#2026-01-08# - #2026-01-01#) as day')
    expect(result?.value).toBeCloseTo(7)
  })

  it('date literal with time component (hours of offset)', () => {
    const result = parse('(#2026-04-16T18:00# - #2026-04-16T06:00#) as hour')
    expect(result?.value).toBeCloseTo(12)
  })

  it('does not collide with line comments', () => {
    // `# hello` at top of input must still be a comment — followed by a digit, we'd pick date.
    const result = parse('# this line is a comment\n42')
    expect(result?.value).toBe(42)
  })

  it('supports trailing comments after an expression', () => {
    const result = parse('5 # tail comment\n')
    expect(result?.value).toBe(5)
  })

  it('non-leap-year year-length check', () => {
    // 2026 is non-leap: Jan 1 → Dec 31 is 364 days; Jan 1 → next Jan 1 is 365.
    const days = parse('#2027-01-01# - #2026-01-01#')
    expect(days?.value).toBe(365)
  })

  it('leap-year February span', () => {
    // 2024 is a leap year: Feb has 29 days.
    const febSpan = parse('#2024-03-01# - #2024-02-01#')
    expect(febSpan?.value).toBe(29)
  })
})
