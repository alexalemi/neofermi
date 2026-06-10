import { describe, it, expect } from 'vitest'
import { processMarkdown } from '../src/editor/markdown-processor.js'
import { evaluateExpressions } from '../src/editor/expression-evaluator.js'

function renderDoc(doc: string): string {
  const { expressions, render } = processMarkdown(doc)
  return render(evaluateExpressions(expressions))
}

describe('editor markdown processor', () => {
  it('evaluates blocks and interpolates inline expressions', () => {
    const html = renderDoc('```neofermi\nx = 5\n```\n\nValue is ${x} and doubled is ${x * 2}.')
    expect(html).toContain('<span class="nf-inline">5.00</span>')
    expect(html).toContain('<span class="nf-inline">10.0</span>')
  })

  it('leaves ${...} untouched inside fenced code blocks and inline code', () => {
    const doc = [
      '```neofermi',
      'x = 5',
      '```',
      '',
      'Use `${x}` like this:',
      '',
      '```python',
      'print("${x}")',
      '```',
      '',
      'Value is ${x}.',
    ].join('\n')
    const html = renderDoc(doc)
    expect(html).toContain('<code>${x}</code>')
    expect(html).toContain('print(&quot;${x}&quot;)')
    expect(html).toContain('<span class="nf-inline">5.00</span>')
  })

  it('gives repeated identical interpolations their own results', () => {
    const { expressions } = processMarkdown('```neofermi\nx = 1\n```\n\n${x} and ${x}')
    const inline = expressions.filter((e) => e.type === 'inline')
    expect(inline).toHaveLength(2)
    expect(new Set(inline.map((e) => e.id)).size).toBe(2)
  })

  it('renders inline errors as a span instead of leaving raw text', () => {
    const html = renderDoc('Value is ${undefined_variable_xyz}.')
    expect(html).toContain('nf-inline-error')
    expect(html).not.toContain('${undefined_variable_xyz}')
  })

  it('re-rendering with the same results is idempotent', () => {
    const { expressions, render } = processMarkdown('```neofermi\nx = 2\n```\n\n${x}')
    const results = evaluateExpressions(expressions)
    expect(render(results)).toBe(render(results))
  })
})
