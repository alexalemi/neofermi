import { describe, it, expect } from 'vitest'
import { annotateMarkdown } from '../src/cli/annotate.js'
import { stripAnnotations } from '../src/core/annotations.js'

const DOC = `# Road Trip

## Assumptions

\`\`\`
speed = 60 to 120 km/hr
time = 2 to 6 hours
\`\`\`

## Calculation

\`\`\`
distance = speed * time
\`\`\`

The trip covers about \${distance}, or \${distance as miles}.
`

describe('annotateMarkdown', () => {
  it('adds a result block after each executable code block', () => {
    const { content, blockCount } = annotateMarkdown(DOC)
    expect(blockCount).toBe(2)
    const matches = content.match(/<!-- nf:results -->/g)
    expect(matches).toHaveLength(2)
    expect(content).toMatch(/<!-- nf:results -->\n> `.+`\n<!-- \/nf:results -->/)
  })

  it('replaces bare inline expressions with annotated values', () => {
    const { content, inlineCount } = annotateMarkdown(DOC)
    expect(inlineCount).toBe(2)
    expect(content).toMatch(/`[^`]+`<!--nf:\$\{distance\}-->/)
    expect(content).toMatch(/`[^`]*miles[^`]*`<!--nf:\$\{distance as miles\}-->/)
    // The raw ${...} should no longer appear outside the annotation comments
    expect(content).not.toMatch(/[^:]\$\{distance\}/)
  })

  it('is idempotent: annotating twice is byte-identical', () => {
    const once = annotateMarkdown(DOC).content
    const twice = annotateMarkdown(once).content
    expect(twice).toBe(once)
  })

  it('is deterministic across runs on the same input', () => {
    expect(annotateMarkdown(DOC).content).toBe(annotateMarkdown(DOC).content)
  })

  it('never duplicates result blocks on re-annotation', () => {
    const twice = annotateMarkdown(annotateMarkdown(DOC).content).content
    expect(twice.match(/<!-- nf:results -->/g)).toHaveLength(2)
    expect(twice.match(/<!--nf:\$\{distance\}-->/g)).toHaveLength(1)
  })

  it('updates stale values when the source changes', () => {
    const annotated = annotateMarkdown(DOC).content
    const changed = annotated.replace('60 to 120 km/hr', '600 to 1200 km/hr')
    const reannotated = annotateMarkdown(changed).content
    expect(reannotated).not.toBe(changed)
    // The distance annotation must reflect the new magnitude (~10x larger)
    const inline = reannotated.match(/`([^`]+)`<!--nf:\$\{distance\}-->/)
    expect(inline).not.toBeNull()
    const stale = changed.match(/`([^`]+)`<!--nf:\$\{distance\}-->/)
    expect(inline![1]).not.toBe(stale![1])
  })

  it('stripAnnotations recovers the original document', () => {
    const annotated = annotateMarkdown(DOC).content
    expect(stripAnnotations(annotated)).toBe(DOC)
  })

  it('leaves non-neofermi code blocks alone', () => {
    const doc = '```python\nx = 1\n```\n'
    const { content, blockCount } = annotateMarkdown(doc)
    expect(blockCount).toBe(0)
    expect(content).toBe(doc)
  })

  it('leaves ${...} inside inline code spans alone', () => {
    const doc = 'Use `${x}` to interpolate.\n\n```\nx = 5\n```\n'
    const { content } = annotateMarkdown(doc)
    expect(content).toContain('Use `${x}` to interpolate.')
  })

  it('warns instead of annotating on errors, and removes stale annotations', () => {
    const good = '```\nx = 5 kg\n```\n'
    const annotated = annotateMarkdown(good).content
    const broken = annotated.replace('x = 5 kg', 'x = bogus_name')
    const result = annotateMarkdown(broken)
    expect(result.warnings.length).toBeGreaterThan(0)
    expect(result.content).not.toContain('nf:results')
  })

  it('errored inline expressions fall back to bare ${expr}', () => {
    const doc = 'Value: ${undefined_var}\n'
    const result = annotateMarkdown(doc)
    expect(result.warnings).toHaveLength(1)
    expect(result.content).toContain('${undefined_var}')
    expect(result.content).not.toContain('<!--nf:')
  })
})
