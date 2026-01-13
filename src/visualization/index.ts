/**
 * Visualization module for NeoFermi
 *
 * Provides canvas-based visualizations for probability distributions:
 * - Quantile dotplots (intuitive probability counting)
 * - Histograms (traditional frequency distribution)
 */

export {
  type DotplotOptions,
  type DotplotData,
  calculateDotplotData,
  renderDotplot,
  createDotplotCanvas,
} from './quantileDotplot.js'

export {
  type HistogramOptions,
  type HistogramData,
  calculateHistogramData,
  renderHistogram,
  createHistogramCanvas,
} from './histogram.js'

import { Quantity } from '../core/Quantity.js'
import { createDotplotCanvas, DotplotOptions } from './quantileDotplot.js'
import { createHistogramCanvas, HistogramOptions } from './histogram.js'

export type VisualizationType = 'dotplot' | 'histogram'

/**
 * Create a visualization canvas for a Quantity
 */
export function visualize(
  quantity: Quantity,
  type: VisualizationType = 'dotplot',
  options: Partial<DotplotOptions | HistogramOptions> = {}
): HTMLCanvasElement | null {
  // Only visualize distributions, not scalars
  if (!quantity.isDistribution()) {
    return null
  }

  const samples = quantity.value as number[]
  const unit = quantity.unit.toString()

  // Build axis label with unit and dimension name
  const dimName = quantity.dimensionName ? quantity.dimensionName() : null
  let axisLabel = unit
  if (dimName && dimName !== 'dimensionless') {
    axisLabel = `${unit} {${dimName}}`
  }

  const optsWithLabel = { ...options, axisLabel }

  switch (type) {
    case 'dotplot':
      return createDotplotCanvas(samples, unit, optsWithLabel as Partial<DotplotOptions>)
    case 'histogram':
      return createHistogramCanvas(samples, unit, optsWithLabel as Partial<HistogramOptions>)
    default:
      return null
  }
}
