import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { parse, Evaluator } from '../src/parser/index.js'
import type { Quantity } from '../src/core/Quantity.js'

const EXAMPLES_DIR = join(__dirname, '..', 'examples')

// Match fenced blocks with empty or `neofermi` language tag — same rule the
// editor uses (see src/editor/markdown-processor.ts:53).
const FENCE_RE = /```(\w*)\n([\s\S]*?)```/g

function extractBlocks(source: string): string[] {
  const blocks: string[] = []
  for (const m of source.matchAll(FENCE_RE)) {
    const lang = m[1].trim().toLowerCase()
    if (lang === '' || lang === 'neofermi') {
      blocks.push(m[2])
    }
  }
  return blocks
}

function evaluateExample(source: string): Evaluator {
  const evaluator = new Evaluator()
  const blocks = extractBlocks(source)
  expect(blocks.length).toBeGreaterThan(0)
  for (const block of blocks) {
    parse(block, evaluator)
  }
  return evaluator
}

// Each example ends by checking itself against a published figure; the
// estimate's median should land within a factor of 2.5 of it.
function toBeNear(actual: number, expected: number) {
  expect(actual).toBeGreaterThan(expected / 2.5)
  expect(actual).toBeLessThan(expected * 2.5)
}

function medianOf(q: Quantity | undefined, unit?: string): number {
  if (!q) throw new Error('variable not defined')
  const v = unit ? q.to(unit) : q
  return v.isDistribution() ? v.median() : (v.value as number)
}

describe('examples/*.md — smoke test', () => {
  const files = readdirSync(EXAMPLES_DIR).filter((f) => f.endsWith('.md'))
  expect(files.length).toBeGreaterThan(0)

  for (const file of files) {
    it(`${file} evaluates without errors`, () => {
      const source = readFileSync(join(EXAMPLES_DIR, file), 'utf-8')
      expect(() => evaluateExample(source)).not.toThrow()
    })
  }
})

// [file, variable, unit to read it in, published value, source]
const CHECKS: [string, string, string | undefined, number, string][] = [
  ['piano_tuners.md', 'tuners', undefined, 150, 'BLS OEWS May 2025, Chicago metro'],
  ['household_electricity.md', 'total', 'kWh/year', 10791, 'EIA 2022'],
  ['us_gasoline.md', 'from_cars', 'barrel/day', 8.94e6, 'EIA 2023'],
  ['us_gasoline.md', 'from_stations', 'barrel/day', 8.94e6, 'EIA 2023'],
  ['llm_training.md', 'gpu_time', 'hour', 1720320, 'Llama 2 paper, Table 2'],
  ['llm_training.md', 'llama3', 'hour', 30.84e6, 'Llama 3.1 405B model card'],
  ['data_centers.md', 'energy', 'TWh', 415, 'IEA Energy and AI'],
  ['atmosphere_mass.md', 'first_pass', 'kg', 5.148e18, 'Trenberth & Smith 2005'],
  ['atmosphere_mass.md', 'mass', 'kg', 5.148e18, 'Trenberth & Smith 2005'],
  ['uk_tea.md', 'cups', 'day^-1', 100e6, 'UKTIA 2023'],
  ['daily_flights.md', 'flights', 'day^-1', 102000, 'ICAO 2024'],
]

describe('examples/*.md — published answers (within 2.5x)', () => {
  for (const [file, name, unit, expected, source] of CHECKS) {
    it(`${file}: ${name} ≈ ${expected} (${source})`, () => {
      const ev = evaluateExample(readFileSync(join(EXAMPLES_DIR, file), 'utf-8'))
      toBeNear(medianOf(ev.getVariable(name), unit), expected)
    })
  }
})
