import { describe, it, expect } from 'vitest'
import { parseToAST } from '../src/parser/index.js'
import { printAST } from '../src/parser/printer.js'

/** Print, reparse, print again — the echo must be a fixed point. */
function roundTrip(source: string): string {
  const printed = printAST(parseToAST(source))
  expect(printAST(parseToAST(printed))).toBe(printed)
  return printed
}

describe('printAST', () => {
  describe('exact canonical forms', () => {
    const cases: Array<[string, string]> = [
      ['1 to 10 m', '1 to 10 m'],
      ['x = 60 to 120 km/hr', 'x = 60 to 120 km/hr'],
      ['50 +- 10 kg', '50 +/- 10 kg'],
      ['1 thru 10', '1 .. 10'],
      ['3 of 10', '3 of 10'],
      ['4 against 6', '4 against 6'],
      ['1 + 2 * 3', '1 + 2 * 3'],
      ['(1 + 2) * 3', '(1 + 2) * 3'],
      ['2^3^2', '2 ^ 3 ^ 2'],
      ['-2^2', '-2 ^ 2'],
      ['100 m as feet', '100 m as feet'],
      ['f(x, y) = x + y', 'f(x, y) = x + y'],
      ["1 `widget = 5 kg", "1 `widget = 5 kg"],
      ["3 `widget", "3 `widget"],
      ['1 to 2 million', '1 to 2 million'],
      ['5 /day', '5 /day'],
      ['3 m^2', '3 m^2'],
      ['let x = 5 in x * 2', 'let x = 5 in x * 2'],
      ['if 1 > 2 then 3 else 4', 'if 1 > 2 then 3 else 4'],
      ['{365: 303, 366: 97}', '{365: 303, 366: 97}'],
      ['{1, 2, 3} kg', '{1, 2, 3} kg'],
      ['100 * 10%', '100 * 10%'],
      ['3 db', '3 db'],
      ['#2026-04-16#', '#2026-04-16#'],
      ["'3.14 m", "'3.14 m"],
      // Desugared suffix units print back as suffixes
      ['sqrt(4) m', 'sqrt(4) m'],
      ['(1 + 2) kg', '(1 + 2) kg'],
      ['poisson(3) million', 'poisson(3) million'],
    ]

    it.each(cases)('%s → %s', (source, expected) => {
      expect(printAST(parseToAST(source))).toBe(expected)
    })
  })

  describe('round-trip stability', () => {
    const sources = [
      'speed = 60 to 120 km/hr',
      'distance = speed * time',
      '1 / (2 + 3) ^ 2',
      '10 - (3 - 1)',
      '1 feet / 1 mm as feet/mm',
      '98.6 degF as degC',
      'uniform(0, 1) * normal(5, 1)',
      '(1 to 10) * (2 to 20) m',
      '#2027-01-01# - #2026-01-01#',
      'f(g(1), h(2, 3))',
    ]

    it.each(sources)('%s', (source) => {
      roundTrip(source)
    })
  })

  describe('semantic preservation', () => {
    it('parenthesization preserves evaluation order', () => {
      // 10 - (3 - 1) must not print as 10 - 3 - 1
      const printed = printAST(parseToAST('10 - (3 - 1)'))
      expect(printed).toBe('10 - (3 - 1)')
    })

    it('decorates parts when a hook is given', () => {
      const printed = printAST(parseToAST('x = 5 kg'), (part, text) => `<${part}>${text}</${part}>`)
      expect(printed).toBe('<variable>x</variable> = <scalar>5</scalar> <unit>kg</unit>')
    })
  })
})
