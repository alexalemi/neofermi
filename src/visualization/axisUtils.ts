/**
 * Axis utilities for visualization
 *
 * Provides smart axis scaling (linear vs log) and nice tick generation.
 */

/**
 * Determines if log scale should be used based on data range.
 * Uses log scale if range spans more than 2 decades (100x).
 */
export function shouldUseLogScale(min: number, max: number): boolean {
  // Only use log scale for positive values
  if (min <= 0 || max <= 0) return false

  const ratio = max / min
  return ratio > 100 // More than 2 decades
}

/**
 * "Nice" numbers for tick marks: 1, 2, 5, 10, 20, 50, etc.
 * Returns the nearest nice number >= the input.
 */
export function niceNumber(x: number, round: boolean = false): number {
  if (x === 0) return 0

  const exp = Math.floor(Math.log10(Math.abs(x)))
  const f = x / Math.pow(10, exp) // Fraction between 1-10

  let nf: number
  if (round) {
    if (f < 1.5) nf = 1
    else if (f < 3) nf = 2
    else if (f < 7) nf = 5
    else nf = 10
  } else {
    if (f <= 1) nf = 1
    else if (f <= 2) nf = 2
    else if (f <= 5) nf = 5
    else nf = 10
  }

  return nf * Math.pow(10, exp)
}

/**
 * Generate nice tick values for a range.
 * Returns 3-5 tick values that are "nice" numbers.
 */
export function generateLinearTicks(min: number, max: number, maxTicks: number = 5): number[] {
  const range = niceNumber(max - min, false)
  const tickSpacing = niceNumber(range / (maxTicks - 1), true)

  const niceMin = Math.floor(min / tickSpacing) * tickSpacing
  const niceMax = Math.ceil(max / tickSpacing) * tickSpacing

  const ticks: number[] = []
  for (let tick = niceMin; tick <= niceMax + tickSpacing * 0.5; tick += tickSpacing) {
    if (tick >= min && tick <= max) {
      ticks.push(tick)
    }
  }

  return ticks
}

/**
 * Generate nice tick values for log scale.
 * Returns powers of 10 within the range.
 */
export function generateLogTicks(min: number, max: number): number[] {
  if (min <= 0 || max <= 0) return []

  const minExp = Math.floor(Math.log10(min))
  const maxExp = Math.ceil(Math.log10(max))

  const ticks: number[] = []

  for (let exp = minExp; exp <= maxExp; exp++) {
    const tick = Math.pow(10, exp)
    if (tick >= min * 0.99 && tick <= max * 1.01) {
      ticks.push(tick)
    }
  }

  // If we have few ticks, add intermediate values (2, 5)
  if (ticks.length <= 2) {
    const allTicks: number[] = []
    for (let exp = minExp; exp <= maxExp; exp++) {
      for (const mult of [1, 2, 5]) {
        const tick = mult * Math.pow(10, exp)
        if (tick >= min * 0.99 && tick <= max * 1.01) {
          allTicks.push(tick)
        }
      }
    }
    return allTicks
  }

  return ticks
}

/**
 * Format a number for axis display.
 * Uses scientific notation for very large or small numbers.
 */
export function formatAxisNumber(n: number): string {
  if (n === 0) return '0'

  const absN = Math.abs(n)

  // Use scientific notation for very large or very small
  if (absN >= 10000 || absN < 0.001) {
    return n.toExponential(0)
  }

  // For numbers close to integers, show as integers
  if (Math.abs(n - Math.round(n)) < 0.001) {
    return Math.round(n).toString()
  }

  // Otherwise use appropriate precision
  if (absN >= 100) return n.toFixed(0)
  if (absN >= 10) return n.toFixed(1)
  if (absN >= 1) return n.toFixed(2)
  return n.toPrecision(2)
}

/**
 * Create scale functions for mapping data to pixel coordinates.
 */
export function createScale(
  min: number,
  max: number,
  pixelMin: number,
  pixelMax: number,
  useLog: boolean = false
): (value: number) => number {
  if (useLog && min > 0 && max > 0) {
    const logMin = Math.log10(min)
    const logMax = Math.log10(max)
    const logRange = logMax - logMin

    return (value: number): number => {
      if (value <= 0) return pixelMin
      const logVal = Math.log10(value)
      return pixelMin + ((logVal - logMin) / logRange) * (pixelMax - pixelMin)
    }
  }

  const range = max - min
  if (range === 0) {
    return () => (pixelMin + pixelMax) / 2
  }

  return (value: number): number => {
    return pixelMin + ((value - min) / range) * (pixelMax - pixelMin)
  }
}
