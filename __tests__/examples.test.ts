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

function meanOf(q: Quantity | undefined): number {
  if (!q) throw new Error('variable not defined')
  return q.isDistribution() ? q.mean() : (q.value as number)
}

// Fermi tolerance: within one order of magnitude of the textbook answer.
function toBeInFermiRange(actual: number, expected: number) {
  expect(actual).toBeGreaterThan(expected / 10)
  expect(actual).toBeLessThan(expected * 10)
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

describe('examples/*.md — textbook answers (Fermi ±10x)', () => {
  it('piano_tuners.md: ~80 tuners in Chicago', () => {
    const ev = evaluateExample(
      readFileSync(join(EXAMPLES_DIR, 'piano_tuners.md'), 'utf-8')
    )
    toBeInFermiRange(meanOf(ev.getVariable('num_tuners')), 100)
  })

  it('seconds_in_year.md: ~3.15e7 seconds', () => {
    const ev = evaluateExample(
      readFileSync(join(EXAMPLES_DIR, 'seconds_in_year.md'), 'utf-8')
    )
    expect(meanOf(ev.getVariable('quick_estimate'))).toBeCloseTo(31_536_000, -2)
  })

  it('earth_size.md: ~40000 km circumference', () => {
    const ev = evaluateExample(
      readFileSync(join(EXAMPLES_DIR, 'earth_size.md'), 'utf-8')
    )
    toBeInFermiRange(meanOf(ev.getVariable('earth_circumference_km')), 40075)
  })

  it('heartbeats_lifetime.md: ~2.5e9 heartbeats', () => {
    const ev = evaluateExample(
      readFileSync(join(EXAMPLES_DIR, 'heartbeats_lifetime.md'), 'utf-8')
    )
    toBeInFermiRange(meanOf(ev.getVariable('total_heartbeats')), 2.5e9)
  })

  it('golf_balls_bus.md: ~4e5 balls', () => {
    const ev = evaluateExample(
      readFileSync(join(EXAMPLES_DIR, 'golf_balls_bus.md'), 'utf-8')
    )
    toBeInFermiRange(meanOf(ev.getVariable('num_balls')), 4e5)
  })

  it('atmosphere_weight.md: ~5e18 kg', () => {
    const ev = evaluateExample(
      readFileSync(join(EXAMPLES_DIR, 'atmosphere_weight.md'), 'utf-8')
    )
    toBeInFermiRange(meanOf(ev.getVariable('atmosphere_mass')), 5e18)
  })
})
