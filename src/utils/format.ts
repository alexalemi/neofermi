/**
 * Shared number & quantity formatting for all NeoFermi consumers
 */
import type { Quantity } from '../core/Quantity.js'

/**
 * Format a number for display with appropriate precision (exact scalars).
 */
export function formatNumber(n: number): string {
  if (!isFinite(n)) return String(n)
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
  const abs = Math.abs(n)
  const magnitude = Math.floor(Math.log10(abs))
  if (magnitude >= 6 || magnitude <= -4) {
    return n.toExponential(digits - 1)
  }
  const factor = Math.pow(10, magnitude - digits + 1)
  const rounded = Math.round(n / factor) * factor
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

export interface FormatQuantityOptions {
  html?: boolean
  classPrefix?: string
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

  const unit = q.unit.toString()
  const dimName = q.dimensionName?.() || null
  const hasDim = dimName && dimName !== 'dimensionless'
  const dimSuffix = !hasDim
    ? ''
    : html
      ? ` <span class="${p}-dim">{${dimName}}</span>`
      : ` {${dimName}}`

  let valuePart: string
  if (q.isDistribution()) {
    const medianVal = q.median()
    const p16Val = q.percentile(0.16)
    const p84Val = q.percentile(0.84)
    const sigFigs = sigFigsForUncertainty(medianVal, (p84Val - p16Val) / 2)
    const [median, p16, p84] = [medianVal, p16Val, p84Val].map((v) =>
      formatWithSigFigs(v, sigFigs)
    )
    valuePart = html
      ? `<span class="${p}-scalar">${median}</span> <span class="${p}-ci">[${p16}, ${p84}]</span>`
      : `${median} [${p16}, ${p84}]`
  } else {
    const value = formatNumber(q.value as number)
    valuePart = html ? `<span class="${p}-scalar">${value}</span>` : value
  }

  return `${valuePart} ${unit}${dimSuffix}`.trim()
}
