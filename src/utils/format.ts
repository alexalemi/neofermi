/**
 * Shared number & quantity formatting for all NeoFermi consumers
 */
import type { Quantity } from '../core/Quantity.js'

/**
 * Format a number for display with appropriate precision
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

  if (q.isDistribution()) {
    const median = formatNumber(q.median())
    const p16 = formatNumber(q.percentile(0.16))
    const p84 = formatNumber(q.percentile(0.84))

    if (html) {
      const dimHtml = hasDim ? ` <span class="${p}-dim">{${dimName}}</span>` : ''
      return `<span class="${p}-scalar">${median}</span> <span class="${p}-ci">[${p16}, ${p84}]</span> ${unit}${dimHtml}`
    }
    const dimSuffix = hasDim ? ` {${dimName}}` : ''
    return `${median} [${p16}, ${p84}] ${unit}${dimSuffix}`.trim()
  } else {
    const value = formatNumber(q.value as number)

    if (html) {
      const dimHtml = hasDim ? ` <span class="${p}-dim">{${dimName}}</span>` : ''
      return `<span class="${p}-scalar">${value}</span> ${unit}${dimHtml}`
    }
    const dimSuffix = hasDim ? ` {${dimName}}` : ''
    return `${value} ${unit}${dimSuffix}`.trim()
  }
}
