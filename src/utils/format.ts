/**
 * Shared number & quantity formatting for all NeoFermi consumers
 */
import type { Quantity } from '../core/Quantity.js'
import { displayUnit } from '../core/unitUtils.js'

/**
 * Format a number for display with appropriate precision (exact scalars).
 */
export function formatNumber(n: number): string {
  if (!isFinite(n)) return String(n)
  if (n === 0) return '0'
  const abs = Math.abs(n)
  if (abs >= 1e6 || (abs < 1e-3 && abs > 0)) return n.toExponential(2)
  if (abs >= 100) return n.toFixed(0)
  if (abs >= 10) return n.toFixed(1)
  if (abs >= 1) return n.toFixed(2)
  return n.toPrecision(3)
}

/**
 * Format `n` with `sigFigs` significant figures.
 *
 * Uses decimal notation for moderate magnitudes and scientific notation
 * at the extremes, matching the magnitude thresholds in `formatNumber`.
 */
export function formatWithSigFigs(n: number, sigFigs: number): string {
  if (!isFinite(n)) return String(n)
  if (n === 0) return '0'
  const digits = Math.max(1, Math.min(10, Math.round(sigFigs)))
  // Round to the requested precision first, so values that round across a
  // power of ten (0.99999 → "1.0", not "1.00") pick their notation and
  // decimal places from the rounded magnitude.
  const rounded = Number(n.toPrecision(digits))
  const magnitude = Math.floor(Math.log10(Math.abs(rounded)))
  if (magnitude >= 6 || magnitude <= -4) {
    return rounded.toExponential(digits - 1)
  }
  const decimals = Math.max(0, digits - 1 - magnitude)
  return rounded.toFixed(decimals)
}

/**
 * Pick the number of significant figures for a central estimate given
 * the half-width of its uncertainty interval.
 *
 * Rule of thumb: the least-significant displayed digit of the point
 * estimate should sit one decimal place below the leading digit of the
 * uncertainty. So a CI half-width of ~1e6 on a value of 8e5 gets 1 sig
 * fig; a half-width of ~0.01 on a value of 100 gets 5 sig figs.
 */
export function sigFigsForUncertainty(value: number, halfWidth: number): number {
  if (!isFinite(value) || !isFinite(halfWidth) || halfWidth <= 0) return 3
  if (value === 0) return 1
  const ratio = Math.abs(value) / halfWidth
  return Math.max(1, Math.min(5, Math.ceil(Math.log10(ratio)) + 1))
}

export type FormatPart = 'scalar' | 'ci' | 'unit' | 'dim'

export interface FormatQuantityOptions {
  html?: boolean
  classPrefix?: string
  /** Wrap each semantic part of the plain-text output (e.g. with ANSI colors). Ignored when html is set. */
  decorate?: (part: FormatPart, text: string) => string
  /** Append the `{dimension}` tag (default true). Off for values set in prose. */
  dimension?: boolean
}

/**
 * Format a Quantity in concise single-line format
 *
 * Distribution: median [p16, p84] unit {dim}
 * Scalar:       value unit {dim}
 *
 * When html=true, wraps parts in <span> elements using the given classPrefix.
 */
export function formatQuantityConcise(
  q: Quantity,
  opts?: FormatQuantityOptions
): string {
  const html = opts?.html ?? false
  const p = opts?.classPrefix ?? 'nf'
  const decorate = (!html && opts?.decorate) || ((_part: FormatPart, text: string) => text)

  const unit = displayUnit(q.unit)
  // HTML is typeset: 3.7e+6 → 3.7 × 10⁶, year^-1 → year⁻¹
  const num = (text: string) => (html ? typesetNumber(text) : text)
  const dimName = q.dimensionName?.() || null
  const hasDim = (opts?.dimension ?? true) && dimName && dimName !== 'dimensionless'
  const dimSuffix = !hasDim
    ? ''
    : html
      ? ` <span class="${p}-dim">{${dimName}}</span>`
      : ` ${decorate('dim', `{${dimName}}`)}`

  let valuePart: string
  let tailNote = ''
  if (q.isDistribution()) {
    const medianVal = q.median()
    const p16Val = q.percentile(0.16)
    const p84Val = q.percentile(0.84)
    const sigFigs = sigFigsForUncertainty(medianVal, (p84Val - p16Val) / 2)
    const [median, p16, p84] = [medianVal, p16Val, p84Val].map((v) =>
      num(formatWithSigFigs(v, sigFigs))
    )
    valuePart = html
      ? `<span class="${p}-scalar">${median}</span> <span class="${p}-ci">[${p16}, ${p84}]</span>`
      : `${decorate('scalar', median)} ${decorate('ci', `[${p16}, ${p84}]`)}`

    // A point mass holding >68% of samples collapses the interval (a mixture
    // like {0: 0.95, 1 to 100: 0.05} reads `0 [0, 0]`) and hides the tail
    // entirely — say how much mass lies elsewhere and what the mean is.
    if (p16Val === p84Val) {
      const particles = q.toParticles()
      const off = particles.filter((x) => x !== medianVal).length / particles.length
      if (off > 0) {
        const pct = off >= 0.01 ? `${Math.round(off * 100)}%` : '<1%'
        const note = `(${pct} ≠ ${median}, mean ${num(formatNumber(q.mean()))})`
        tailNote = html ? ` <span class="${p}-ci">${note}</span>` : ` ${decorate('ci', note)}`
      }
    }
  } else {
    const value = num(formatNumber(q.value as number))
    valuePart = html ? `<span class="${p}-scalar">${value}</span>` : decorate('scalar', value)
  }

  const unitPart = !unit
    ? ''
    : html
      ? `<span class="${p}-unit">${typesetUnit(unit)}</span>`
      : decorate('unit', unit)
  return `${valuePart} ${unitPart}${dimSuffix}${tailNote}`.replace(/ {2,}/g, ' ').trim()
}

/** `3.7e+6` → `3.7 × 10<sup>6</sup>` (minus signs as U+2212). */
function typesetNumber(text: string): string {
  return text.replace(
    /(\d(?:\.\d+)?)e([+-]?)(\d+)/g,
    (_m, mantissa: string, sign: string, exp: string) =>
      `${mantissa}\u202f×\u202f10<sup>${sign === '-' ? '\u2212' : ''}${exp}</sup>`
  )
}

/** Escape a unit string and raise its exponents: `m^-2` → `m<sup>−2</sup>`. */
function typesetUnit(unit: string): string {
  const escaped = unit.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return escaped.replace(/\^(-?[\d.]+)/g, (_m, exp: string) => `<sup>${exp.replace('-', '\u2212')}</sup>`)
}
