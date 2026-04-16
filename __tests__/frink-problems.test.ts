/**
 * Frink-style problems — integration tests modeled on the canonical sample
 * problems from the Frink calculator (frinklang.org/frinksamp.html).
 *
 * Each test has a reference answer and a tolerance chosen by the nature of
 * the problem:
 *   - exact/tight for pure unit conversions (±0.01 or better),
 *   - `fermi()` ±10× for order-of-magnitude estimations.
 *
 * These tests double as a cross-check that NeoFermi's unit catalog, constants,
 * and dimensional algebra agree with independent reference values.
 */

import { describe, it, expect } from 'vitest'
import { parse, Evaluator } from '../src/parser/index.js'

function fermi(actual: number | undefined, expected: number, fold = 10) {
  expect(actual, `${actual} not finite`).toBeDefined()
  const a = actual as number
  expect(a).toBeGreaterThan(expected / fold)
  expect(a).toBeLessThan(expected * fold)
}

describe('Frink-style problems — unit conversions', () => {
  it('Julian year in seconds', () => {
    const r = parse('1 year as seconds')
    expect(r?.value).toBe(31557600)
    expect(r?.unit.toString()).toBe('seconds')
  })

  it('counting to a billion at 1 per second takes ~31.7 years', () => {
    const r = parse('1e9 seconds as years')
    expect(r?.value).toBeCloseTo(31.688, 2)
  })

  it('body temperature 98.6°F = 37°C (affine)', () => {
    const r = parse('98.6 degF as degC')
    expect(r?.value).toBeCloseTo(37, 3)
  })

  it('0°C = 273.15 K and 100°C = 373.15 K (affine)', () => {
    expect(parse('0 degC as K')?.value).toBeCloseTo(273.15)
    expect(parse('100 degC as K')?.value).toBeCloseTo(373.15)
  })

  it('60 mph = 26.8224 m/s (exact by definition)', () => {
    const r = parse('60 mph as m/s')
    expect(r?.value).toBeCloseTo(26.8224, 4)
  })

  it('1 light-year ≈ 0.307 parsec (round-trip)', () => {
    expect(parse('1 lightyear as parsec')?.value).toBeCloseTo(0.3066, 4)
    expect(parse('1 parsec as lightyear')?.value).toBeCloseTo(3.26156, 4)
  })

  it('1 atmosphere = 101325 Pa (exact)', () => {
    expect(parse('1 atm as Pa')?.value).toBe(101325)
  })

  it('1 horsepower = 745.7 W (mechanical, IAU)', () => {
    const r = parse('1 hp as watt')
    expect(r?.value).toBeCloseTo(745.7, 1)
  })

  it('1 kWh = 3.6 MJ (exact)', () => {
    expect(parse('1 kWh as joule')?.value).toBe(3.6e6)
  })

  it('1 calorie = 4.184 J (thermochemical, exact)', () => {
    expect(parse('1 calorie as joule')?.value).toBe(4.184)
  })

  it('1 mile = 1.609344 km (exact)', () => {
    expect(parse('1 mile as km')?.value).toBe(1.609344)
  })

  it('1 inch = 2.54 cm (exact)', () => {
    expect(parse('1 inch as cm')?.value).toBe(2.54)
  })

  it('1 kg ≈ 2.2046 lb', () => {
    expect(parse('1 kg as lb')?.value).toBeCloseTo(2.2046, 3)
  })
})

describe('Frink-style problems — physics', () => {
  it("Frink's light-nanosecond ≈ 1 foot", () => {
    // Iconic Frink fact: Grace Hopper's "a nanosecond of light is a foot."
    const r = parse('(299792458 m/s) * (1 ns) as foot')
    expect(r?.value).toBeCloseTo(0.984, 2)
  })

  it("Frink's light-nanosecond ≈ 11.8 inches", () => {
    const r = parse('(299792458 m/s) * (1 ns) as inch')
    expect(r?.value).toBeCloseTo(11.803, 2)
  })

  it("Newton's second law: F = m·a for a 70 kg person under 1 g", () => {
    // Dimensional algebra check: kg·m/s² should simplify consistently.
    const r = parse('70 kg * 9.8 m/s^2')
    expect(r?.value).toBeCloseTo(686)
    expect(r?.unit.equalBase(parse('1 newton')!.unit)).toBe(true)
  })

  it('free-fall velocity from 10 m: v = sqrt(2·g·h)', () => {
    const r = parse('sqrt(2 * 9.8 m/s^2 * 10 m) as m/s')
    expect(r?.value).toBeCloseTo(14, 1)
  })

  it('escape velocity from Earth ≈ 11.2 km/s', () => {
    const ev = new Evaluator()
    parse('G = 6.674e-11 m^3 / kg / s^2', ev)
    parse('M = 5.972e24 kg', ev)
    parse('R = 6.371e6 m', ev)
    const r = parse('sqrt(2 * G * M / R) as km/s', ev)
    expect(r?.value).toBeCloseTo(11.19, 1)
  })

  it('surface gravity from G, M, R ≈ 9.82 m/s²', () => {
    const ev = new Evaluator()
    parse('G = 6.674e-11 m^3 / kg / s^2', ev)
    parse('M = 5.972e24 kg', ev)
    parse('R = 6.371e6 m', ev)
    const r = parse('G * M / R^2 as m/s^2', ev)
    expect(r?.value).toBeCloseTo(9.82, 1)
  })

  it('kinetic energy of a 2000 kg car at 60 mph ≈ 720 kJ', () => {
    const r = parse('0.5 * 2000 kg * (60 mph)^2 as joule')
    expect(r?.value).toBeCloseTo(719441, 0)
  })

  it('1 watt · 1 hour = 3600 joule', () => {
    const r = parse('1 watt * 1 hour as joule')
    expect(r?.value).toBe(3600)
  })

  it('1 N · 1 m = 1 joule (work)', () => {
    const r = parse('1 N * 1 m as joule')
    expect(r?.value).toBe(1)
  })
})

describe('Frink-style problems — Fermi estimates', () => {
  it('heartbeats in a lifetime (~2.5 billion)', () => {
    const ev = new Evaluator()
    parse('bpm = 60 to 80', ev)
    parse('lifetime_minutes = (70 to 85 year) as minute', ev)
    const r = parse('bpm * lifetime_minutes', ev)
    fermi(r?.mean(), 2.5e9)
  })

  it('seconds in a human lifetime (~2.5 billion)', () => {
    const r = parse('(75 year) as second')
    fermi(r?.value as number, 2.5e9, 2)
  })

  it('cars in a traffic jam — length ÷ car length', () => {
    // 10 km jam, cars ~4.5 m each, gap ~1.5 m → ~1667 cars.
    // Convert km→meter first to sidestep the known cross-unit simplify gap.
    const r = parse('(10 km as meter) / (6 meter)')
    fermi(r?.value as number, 1667, 2)
  })

  it('stack of $1 trillion in $100 bills (paper thickness)', () => {
    // 1 trillion / 100 = 1e10 bills; paper ≈ 0.11 mm → ~1100 km stack.
    const r = parse('(1 trillion / 100) * 0.11 mm as km')
    fermi(r?.value as number, 1100, 2)
  })

  it('barrels of oil per second worldwide (~1100/s)', () => {
    // ~100 million barrels/day globally.
    const r = parse('100 million / ((1 day) as second)')
    fermi(r?.value as number, 1100, 2)
  })
})
