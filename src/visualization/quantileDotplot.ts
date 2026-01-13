/**
 * Quantile Dotplot visualization for probability distributions
 *
 * A quantile dotplot displays a distribution as stacked dots where each dot
 * represents an equal probability mass. This makes it intuitive to estimate
 * probabilities by counting dots.
 */

import {
  shouldUseLogScale,
  generateLinearTicks,
  generateLogTicks,
  formatAxisNumber,
  createScale,
} from './axisUtils.js'

export interface DotplotOptions {
  width: number
  height: number
  numDots: number // Number of dots (each represents 1/numDots probability)
  dotRadius?: number
  dotColor?: string
  axisColor?: string
  backgroundColor?: string
  showAxis?: boolean
  padding?: number
  axisLabel?: string // Unit and dimension label for x-axis (e.g., "m {length}")
}

const DEFAULT_OPTIONS: Required<DotplotOptions> = {
  width: 300,
  height: 100,
  numDots: 20,
  dotRadius: 4,
  dotColor: '#4ec9b0',
  axisColor: '#666',
  backgroundColor: 'transparent',
  showAxis: true,
  padding: 10,
  axisLabel: '',
}

export interface DotplotData {
  quantiles: number[]
  min: number
  max: number
  unit: string
}

/**
 * Calculate quantile positions for dotplot from particle samples
 */
export function calculateDotplotData(
  samples: number[],
  numDots: number,
  unit: string = ''
): DotplotData {
  const sorted = [...samples].sort((a, b) => a - b)
  const n = sorted.length
  const quantiles: number[] = []

  // Get quantile at each dot position (centered in each probability bin)
  for (let i = 0; i < numDots; i++) {
    const p = (i + 0.5) / numDots // Center of each bin
    const index = Math.floor(p * n)
    quantiles.push(sorted[Math.min(index, n - 1)])
  }

  return {
    quantiles,
    min: sorted[0],
    max: sorted[n - 1],
    unit,
  }
}

/**
 * Render a quantile dotplot to a canvas context
 */
export function renderDotplot(
  ctx: CanvasRenderingContext2D,
  data: DotplotData,
  options: Partial<DotplotOptions> = {}
): void {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const { width, height, dotRadius, dotColor, axisColor, backgroundColor, showAxis, padding, axisLabel } = opts

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

  // Determine if we should use log scale
  const useLog = shouldUseLogScale(data.min, data.max)

  // Create scale function
  const scale = createScale(data.min, data.max, padding, width - padding, useLog)

  // Calculate bin width in pixels and find max stack
  const binPixelWidth = dotRadius * 2.5
  const bins = new Map<number, number[]>() // bin pixel index -> quantile values

  for (const q of data.quantiles) {
    const x = scale(q)
    const binIdx = Math.floor(x / binPixelWidth)
    if (!bins.has(binIdx)) bins.set(binIdx, [])
    bins.get(binIdx)!.push(q)
  }

  // Find max stack height
  let maxStack = 1
  for (const values of bins.values()) {
    maxStack = Math.max(maxStack, values.length)
  }

  // Calculate dot spacing to fit within available height
  const availableHeight = plotHeight - dotRadius * 2
  const dotSpacing = Math.min(dotRadius * 2.2, availableHeight / maxStack)
  const baseY = height - padding - axisHeight

  // Draw dots
  ctx.fillStyle = dotColor
  const binCounts = new Map<number, number>()

  for (const q of data.quantiles) {
    const x = scale(q)
    const binIdx = Math.floor(x / binPixelWidth)
    const count = binCounts.get(binIdx) || 0
    binCounts.set(binIdx, count + 1)

    // X position: center of bin
    const binCenterX = (binIdx + 0.5) * binPixelWidth

    // Y position: stack upward from baseline
    const y = baseY - dotRadius - count * dotSpacing

    // Draw dot
    ctx.beginPath()
    ctx.arc(binCenterX, y, dotRadius, 0, Math.PI * 2)
    ctx.fill()
  }

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
 * Create a canvas element with a quantile dotplot
 */
export function createDotplotCanvas(
  samples: number[],
  unit: string = '',
  options: Partial<DotplotOptions> = {}
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

  const data = calculateDotplotData(samples, opts.numDots, unit)
  renderDotplot(ctx, data, opts)

  return canvas
}
