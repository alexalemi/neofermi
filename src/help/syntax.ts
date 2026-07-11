/**
 * Shared DSL syntax reference
 *
 * Single source of truth for the language cheat-sheet shown by the notebook
 * help modal (index.html), the editor help modal (src/editor), and the CLI
 * REPL `help` command. Surface-specific help (keyboard shortcuts, LaTeX,
 * inline ${...}) stays in each surface; only DSL syntax lives here.
 */

export interface HelpEntry {
  code: string
  note: string
}

export interface HelpSection {
  title: string
  entries: HelpEntry[]
}

export const SYNTAX_HELP: HelpSection[] = [
  {
    title: 'Distributions',
    entries: [
      { code: '1 to 10 m', note: 'Lognormal (68% CI)' },
      { code: '1 .. 10 m', note: 'Uniform distribution' },
      { code: '100 +/- 5 kg', note: 'Normal (mean ± sigma)' },
      { code: '3 of 10', note: 'Beta (3 successes, 10 trials)' },
      { code: '3 against 7', note: 'Beta (3 successes, 7 failures)' },
      { code: '100 * 10%', note: 'Twiddle by ±10%' },
      { code: '{365: 303, 366: 97}', note: 'Weighted set' },
      { code: "'3.14 m", note: 'Sig-fig number (uncertainty from digits)' },
      { code: 'uniform / normal / lognormal / poisson / gamma / exponential / binomial(...)', note: 'Constructor functions' },
    ],
  },
  {
    title: 'Scale-word ranges',
    entries: [
      { code: '1 to 2 million', note: '1e6 to 2e6' },
      { code: '1 .. 2 billion USD', note: 'Uniform 1e9 to 2e9 USD' },
      { code: '1 +/- 2 million', note: 'Normal mean 1e6, sigma 2e6' },
    ],
  },
  {
    title: 'Unit conversion',
    entries: [
      { code: '100 meters as feet', note: 'Convert to specific unit' },
      { code: 'x -> km', note: 'Alternative syntax' },
      { code: '98.6 degF as degC', note: 'Affine temperature' },
      { code: '1 feet / 1 mm as feet/mm', note: 'Keep ratio in compound form' },
      { code: '100 miles as SI', note: 'Convert to SI base units' },
    ],
  },
  {
    title: 'Dates & durations',
    entries: [
      { code: '#2026-04-16#', note: 'Date literal' },
      { code: '#2026-04-16T12:30#', note: 'With time' },
      { code: '#2027-01-01# - #2026-01-01#', note: 'Duration (365 day)' },
    ],
  },
  {
    title: 'Units & constants',
    entries: [
      { code: 'm, kg, s, A, K', note: 'SI base units' },
      { code: 'calorie, kcal, Cal', note: 'Energy (Cal = kcal)' },
      { code: 'parsec, ly, barn', note: 'Astronomy / nuclear' },
      { code: 'knot, mph, atm, hp', note: 'Misc' },
      { code: 'USD, EUR, GBP, JPY', note: 'Currencies (12 supported)' },
      { code: 'dollars_1960', note: 'Inflation-adjusted (1913-present)' },
      { code: 'c, h, hbar, G, k', note: 'Physics constants' },
      { code: 'M_earth, R_earth', note: 'Earth' },
      { code: 'world_population', note: 'Demographics' },
      { code: "1 `widget = 5 kg", note: 'Define a custom unit' },
      { code: '5 /day', note: 'Reciprocal unit (also: 5 per day)' },
    ],
  },
  {
    title: 'Variables & functions',
    entries: [
      { code: 'x = 10 to 100', note: 'Assign variable' },
      { code: 'f(a, b) = a + b * 2', note: 'Define function' },
      { code: 'let x = 5 in x * 2', note: 'Local binding' },
      { code: 'if a > b then a else b', note: 'Conditional' },
    ],
  },
]
