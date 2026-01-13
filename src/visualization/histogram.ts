/**
 * Histogram visualization for probability distributions
 *
 * Renders a traditional bar histogram showing frequency distribution.
 * Supports both linear and log scale for wide-ranging data.
 */

import {
  shouldUseLogScale,
  generateLinearTicks,
  generateLogTicks,
  formatAxisNumber,
  createScale,
} from './axisUtils.js'

export interface HistogramOptions {
  width: number
  height: number
  numBins: number
  barColor?: string
  barOpacity?: number
  axisColor?: string
  backgroundColor?: string
  showAxis?: boolean
  padding?: number
  axisLabel?: string // Unit and dimension label for x-axis (e.g., "m {length}")
}

const DEFAULT_OPTIONS: Required<HistogramOptions> = {
  width: 300,
  height: 100,
  numBins: 25,
  barColor: '#4ec9b0',
  barOpacity: 0.8,
  axisColor: '#666',
  backgroundColor: 'transparent',
  showAxis: true,
  padding: 10,
  axisLabel: '',
}

export interface HistogramData {
  bins: number[] // Counts per bin
  binEdges: number[] // n+1 edges for n bins
  min: number
  max: number
  unit: string
}

/**
 * Calculate histogram bins from particle samples
 */
export function calculateHistogramData(
  samples: number[],
  numBins: number,
  unit: string = ''
): HistogramData {
  const min = Math.min(...samples)
  const max = Math.max(...samples)
  const range = max - min

  // Create bin edges
  const binEdges: number[] = []
  for (let i = 0; i <= numBins; i++) {
    binEdges.push(min + (i / numBins) * range)
  }

  // Count samples in each bin
  const bins = new Array(numBins).fill(0)
  for (const sample of samples) {
    if (range === 0) {
      bins[0]++
    } else {
      let binIndex = Math.floor(((sample - min) / range) * numBins)
      // Handle edge case where sample === max
      binIndex = Math.min(binIndex, numBins - 1)
      bins[binIndex]++
    }
  }

  return { bins, binEdges, min, max, unit }
}

/**
 * Render a histogram to a canvas context
 */
export function renderHistogram(
  ctx: CanvasRenderingContext2D,
  data: HistogramData,
  options: Partial<HistogramOptions> = {}
): void {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const { width, height, barColor, barOpacity, axisColor, backgroundColor, showAxis, padding, axisLabel } = opts

  // Clear background
  if (backgroundColor !== 'transparent') {
    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, 0, width, height)
  } else {
    ctx.clearRect(0, 0, width, height)
  }

  const plotWidth = width - 2 * padding
  // Increase axis height if we have a label
  const axisHeight = showAxis ? (axisLabel ? 30 : 18) : 0
  const plotHeight = height - 2 * padding - axisHeight

  // Find max bin count for scaling
  const maxCount = Math.max(...data.bins)
  if (maxCount === 0) return

  // Determine if we should use log scale for x-axis
  const useLog = shouldUseLogScale(data.min, data.max)

  // Create scale function for x-axis
  const scale = createScale(data.min, data.max, padding, width - padding, useLog)

  // Draw bars
  ctx.fillStyle = barColor
  ctx.globalAlpha = barOpacity

  const baseY = padding + plotHeight

  for (let i = 0; i < data.bins.length; i++) {
    const barHeight = (data.bins[i] / maxCount) * plotHeight
    const leftEdge = data.binEdges[i]
    const rightEdge = data.binEdges[i + 1]

    const x1 = scale(leftEdge)
    const x2 = scale(rightEdge)
    const barWidth = x2 - x1
    const y = baseY - barHeight

    ctx.fillRect(x1, y, barWidth - 1, barHeight) // -1 for gap between bars
  }

  ctx.globalAlpha = 1

  // Draw axis with nice tick marks
  if (showAxis) {
    ctx.strokeStyle = axisColor
    ctx.lineWidth = 1

    // Baseline
    const axisY = baseY + 4
    ctx.beginPath()
    ctx.moveTo(padding, axisY)
    ctx.lineTo(width - padding, axisY)
    ctx.stroke()

    // Generate tick values
    const ticks = useLog
      ? generateLogTicks(data.min, data.max)
      : generateLinearTicks(data.min, data.max, Math.min(5, Math.floor(plotWidth / 50)))

    // Draw ticks and labels
    ctx.fillStyle = axisColor
    ctx.font = '9px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'

    for (const tick of ticks) {
      const x = scale(tick)
      // Skip if too close to edges
      if (x < padding + 15 || x > width - padding - 15) continue

      // Tick mark
      ctx.beginPath()
      ctx.moveTo(x, axisY)
      ctx.lineTo(x, axisY + 3)
      ctx.stroke()

      // Label
      ctx.fillText(formatAxisNumber(tick), x, axisY + 4)
    }

    // Always draw min and max labels
    ctx.textAlign = 'left'
    ctx.fillText(formatAxisNumber(data.min), padding, axisY + 4)
    ctx.textAlign = 'right'
    ctx.fillText(formatAxisNumber(data.max), width - padding, axisY + 4)

    // Draw axis label (unit and dimension name) centered below
    if (axisLabel) {
      ctx.textAlign = 'center'
      ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif'
      ctx.fillStyle = '#888'
      ctx.fillText(axisLabel, width / 2, axisY + 16)
    }
  }
}

/**
 * Create a canvas element with a histogram
 */
export function createHistogramCanvas(
  samples: number[],
  unit: string = '',
  options: Partial<HistogramOptions> = {}
): HTMLCanvasElement {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const canvas = document.createElement('canvas')

  // Handle high-DPI displays
  const dpr = window.devicePixelRatio || 1
  canvas.width = opts.width * dpr
  canvas.height = opts.height * dpr
  canvas.style.width = `${opts.width}px`
  canvas.style.height = `${opts.height}px`

  const ctx = canvas.getContext('2d')!
  ctx.scale(dpr, dpr)

  const data = calculateHistogramData(samples, opts.numBins, unit)
  renderHistogram(ctx, data, opts)

  return canvas
}
