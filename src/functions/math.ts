/**
 * Standard math functions for NeoFermi
 *
 * All functions work element-wise on distributions, preserving sample alignment.
 */

import { Quantity } from '../core/Quantity.js'

/**
 * Helper to apply a unary function element-wise to a Quantity
 */
function applyUnary(q: Quantity, fn: (x: number) => number, unitTransform?: (u: string) => string): Quantity {
  const particles = q.toParticles()
  const result = particles.map(fn)
  const newUnit = unitTransform ? unitTransform(q.unit.toString()) : q.unit.toString()

  if (particles.length === 1) {
    return new Quantity(result[0], newUnit)
  }
  return new Quantity(result, newUnit)
}

/**
 * Helper to apply a binary function element-wise to two Quantities
 */
function applyBinary(a: Quantity, b: Quantity, fn: (x: number, y: number) => number): Quantity {
  const aParticles = a.toParticles()
  const bParticles = b.toParticles()
  const maxLength = Math.max(aParticles.length, bParticles.length)
  const result: number[] = new Array(maxLength)

  for (let i = 0; i < maxLength; i++) {
    const x = aParticles[i % aParticles.length]
    const y = bParticles[i % bParticles.length]
    result[i] = fn(x, y)
  }

  // Result is dimensionless for most binary math functions
  if (aParticles.length === 1 && bParticles.length === 1) {
    return new Quantity(result[0])
  }
  return new Quantity(result)
}

// ============================================
// Basic Math Functions
// ============================================

export function abs(q: Quantity): Quantity {
  return applyUnary(q, Math.abs)
}

export function sign(q: Quantity): Quantity {
  return applyUnary(q, Math.sign, () => '')
}

export function floor(q: Quantity): Quantity {
  return applyUnary(q, Math.floor)
}

export function ceil(q: Quantity): Quantity {
  return applyUnary(q, Math.ceil)
}

export function round(q: Quantity): Quantity {
  return applyUnary(q, Math.round)
}

export function trunc(q: Quantity): Quantity {
  return applyUnary(q, Math.trunc)
}

// ============================================
// Power and Root Functions
// ============================================

export function sqrt(q: Quantity): Quantity {
  // sqrt(x) = x^0.5, so unit becomes unit^0.5
  return applyUnary(q, Math.sqrt, (u) => {
    if (!u || u === '') return ''
    return `(${u})^0.5`
  })
}

export function cbrt(q: Quantity): Quantity {
  // cbrt(x) = x^(1/3), so unit becomes unit^(1/3)
  return applyUnary(q, Math.cbrt, (u) => {
    if (!u || u === '') return ''
    return `(${u})^0.333333`
  })
}

export function exp(q: Quantity): Quantity {
  // e^x requires dimensionless x
  const unitStr = q.unit.toString()
  if (unitStr && unitStr !== '') {
    throw new Error(`exp() requires a dimensionless argument, got ${unitStr}`)
  }
  return applyUnary(q, Math.exp, () => '')
}

export function expm1(q: Quantity): Quantity {
  // e^x - 1, requires dimensionless x
  const unitStr = q.unit.toString()
  if (unitStr && unitStr !== '') {
    throw new Error(`expm1() requires a dimensionless argument, got ${unitStr}`)
  }
  return applyUnary(q, Math.expm1, () => '')
}

// ============================================
// Logarithmic Functions
// ============================================

export function log(q: Quantity): Quantity {
  // ln(x), requires dimensionless x
  const unitStr = q.unit.toString()
  if (unitStr && unitStr !== '') {
    throw new Error(`log() requires a dimensionless argument, got ${unitStr}`)
  }
  return applyUnary(q, Math.log, () => '')
}

export function ln(q: Quantity): Quantity {
  return log(q)
}

export function log10(q: Quantity): Quantity {
  const unitStr = q.unit.toString()
  if (unitStr && unitStr !== '') {
    throw new Error(`log10() requires a dimensionless argument, got ${unitStr}`)
  }
  return applyUnary(q, Math.log10, () => '')
}

export function log2(q: Quantity): Quantity {
  const unitStr = q.unit.toString()
  if (unitStr && unitStr !== '') {
    throw new Error(`log2() requires a dimensionless argument, got ${unitStr}`)
  }
  return applyUnary(q, Math.log2, () => '')
}

export function log1p(q: Quantity): Quantity {
  // ln(1 + x), requires dimensionless x
  const unitStr = q.unit.toString()
  if (unitStr && unitStr !== '') {
    throw new Error(`log1p() requires a dimensionless argument, got ${unitStr}`)
  }
  return applyUnary(q, Math.log1p, () => '')
}

// ============================================
// Trigonometric Functions (input in radians)
// ============================================

export function sin(q: Quantity): Quantity {
  const unitStr = q.unit.toString()
  if (unitStr && unitStr !== '' && unitStr !== 'rad') {
    throw new Error(`sin() requires dimensionless or radian argument, got ${unitStr}`)
  }
  return applyUnary(q, Math.sin, () => '')
}

export function cos(q: Quantity): Quantity {
  const unitStr = q.unit.toString()
  if (unitStr && unitStr !== '' && unitStr !== 'rad') {
    throw new Error(`cos() requires dimensionless or radian argument, got ${unitStr}`)
  }
  return applyUnary(q, Math.cos, () => '')
}

export function tan(q: Quantity): Quantity {
  const unitStr = q.unit.toString()
  if (unitStr && unitStr !== '' && unitStr !== 'rad') {
    throw new Error(`tan() requires dimensionless or radian argument, got ${unitStr}`)
  }
  return applyUnary(q, Math.tan, () => '')
}

export function asin(q: Quantity): Quantity {
  const unitStr = q.unit.toString()
  if (unitStr && unitStr !== '') {
    throw new Error(`asin() requires dimensionless argument, got ${unitStr}`)
  }
  return applyUnary(q, Math.asin, () => 'rad')
}

export function acos(q: Quantity): Quantity {
  const unitStr = q.unit.toString()
  if (unitStr && unitStr !== '') {
    throw new Error(`acos() requires dimensionless argument, got ${unitStr}`)
  }
  return applyUnary(q, Math.acos, () => 'rad')
}

export function atan(q: Quantity): Quantity {
  const unitStr = q.unit.toString()
  if (unitStr && unitStr !== '') {
    throw new Error(`atan() requires dimensionless argument, got ${unitStr}`)
  }
  return applyUnary(q, Math.atan, () => 'rad')
}

export function atan2(y: Quantity, x: Quantity): Quantity {
  // Both must have same units (they cancel out)
  if (!y.unit.equalBase(x.unit)) {
    throw new Error(`atan2() requires arguments with same units, got ${y.unit} and ${x.unit}`)
  }
  return applyBinary(y, x, Math.atan2)
}

// ============================================
// Hyperbolic Functions
// ============================================

export function sinh(q: Quantity): Quantity {
  const unitStr = q.unit.toString()
  if (unitStr && unitStr !== '') {
    throw new Error(`sinh() requires dimensionless argument, got ${unitStr}`)
  }
  return applyUnary(q, Math.sinh, () => '')
}

export function cosh(q: Quantity): Quantity {
  const unitStr = q.unit.toString()
  if (unitStr && unitStr !== '') {
    throw new Error(`cosh() requires dimensionless argument, got ${unitStr}`)
  }
  return applyUnary(q, Math.cosh, () => '')
}

export function tanh(q: Quantity): Quantity {
  const unitStr = q.unit.toString()
  if (unitStr && unitStr !== '') {
    throw new Error(`tanh() requires dimensionless argument, got ${unitStr}`)
  }
  return applyUnary(q, Math.tanh, () => '')
}

export function asinh(q: Quantity): Quantity {
  const unitStr = q.unit.toString()
  if (unitStr && unitStr !== '') {
    throw new Error(`asinh() requires dimensionless argument, got ${unitStr}`)
  }
  return applyUnary(q, Math.asinh, () => '')
}

export function acosh(q: Quantity): Quantity {
  const unitStr = q.unit.toString()
  if (unitStr && unitStr !== '') {
    throw new Error(`acosh() requires dimensionless argument, got ${unitStr}`)
  }
  return applyUnary(q, Math.acosh, () => '')
}

export function atanh(q: Quantity): Quantity {
  const unitStr = q.unit.toString()
  if (unitStr && unitStr !== '') {
    throw new Error(`atanh() requires dimensionless argument, got ${unitStr}`)
  }
  return applyUnary(q, Math.atanh, () => '')
}

// ============================================
// Binary Math Functions
// ============================================

export function pow(base: Quantity, exponent: Quantity): Quantity {
  // Exponent must be dimensionless
  const expUnit = exponent.unit.toString()
  if (expUnit && expUnit !== '') {
    throw new Error(`pow() exponent must be dimensionless, got ${expUnit}`)
  }

  // If exponent is scalar, use Quantity.pow for proper unit handling
  if (exponent.isScalar()) {
    return base.pow(exponent.value as number)
  }

  // Element-wise with distribution exponent (unusual but supported)
  const baseParticles = base.toParticles()
  const expParticles = exponent.toParticles()
  const maxLength = Math.max(baseParticles.length, expParticles.length)
  const result: number[] = new Array(maxLength)

  for (let i = 0; i < maxLength; i++) {
    const b = baseParticles[i % baseParticles.length]
    const e = expParticles[i % expParticles.length]
    result[i] = Math.pow(b, e)
  }

  // Unit handling is complex with distribution exponents, return dimensionless
  if (baseParticles.length === 1 && expParticles.length === 1) {
    return new Quantity(result[0])
  }
  return new Quantity(result)
}

export function min(a: Quantity, b: Quantity): Quantity {
  if (!a.unit.equalBase(b.unit)) {
    throw new Error(`min() requires arguments with compatible units, got ${a.unit} and ${b.unit}`)
  }
  return applyBinary(a, b, Math.min)
}

export function max(a: Quantity, b: Quantity): Quantity {
  if (!a.unit.equalBase(b.unit)) {
    throw new Error(`max() requires arguments with compatible units, got ${a.unit} and ${b.unit}`)
  }
  return applyBinary(a, b, Math.max)
}

export function hypot(a: Quantity, b: Quantity): Quantity {
  if (!a.unit.equalBase(b.unit)) {
    throw new Error(`hypot() requires arguments with same units, got ${a.unit} and ${b.unit}`)
  }

  const aParticles = a.toParticles()
  const bParticles = b.toParticles()
  const maxLength = Math.max(aParticles.length, bParticles.length)
  const result: number[] = new Array(maxLength)

  for (let i = 0; i < maxLength; i++) {
    const x = aParticles[i % aParticles.length]
    const y = bParticles[i % bParticles.length]
    result[i] = Math.hypot(x, y)
  }

  if (aParticles.length === 1 && bParticles.length === 1) {
    return new Quantity(result[0], a.unit.toString())
  }
  return new Quantity(result, a.unit.toString())
}

// ============================================
// Statistical Functions for Distributions
// ============================================

/**
 * Get a specific percentile from a distribution
 * quantile(dist, 0.95) returns the 95th percentile
 */
export function quantile(q: Quantity, p: Quantity): Quantity {
  const pVal = p.isScalar() ? (p.value as number) : p.mean()
  if (pVal < 0 || pVal > 1) {
    throw new Error(`quantile() probability must be between 0 and 1, got ${pVal}`)
  }
  const result = q.percentile(pVal)
  return new Quantity(result, q.unit.toString())
}

/**
 * Alias for quantile
 */
export function percentile(q: Quantity, p: Quantity): Quantity {
  return quantile(q, p)
}

/**
 * Get the 5th percentile (low end of 90% CI)
 */
export function p5(q: Quantity): Quantity {
  return new Quantity(q.percentile(0.05), q.unit.toString())
}

/**
 * Get the 10th percentile
 */
export function p10(q: Quantity): Quantity {
  return new Quantity(q.percentile(0.10), q.unit.toString())
}

/**
 * Get the 25th percentile (first quartile)
 */
export function p25(q: Quantity): Quantity {
  return new Quantity(q.percentile(0.25), q.unit.toString())
}

/**
 * Get the 50th percentile (median)
 */
export function median(q: Quantity): Quantity {
  return new Quantity(q.percentile(0.50), q.unit.toString())
}

/**
 * Get the 75th percentile (third quartile)
 */
export function p75(q: Quantity): Quantity {
  return new Quantity(q.percentile(0.75), q.unit.toString())
}

/**
 * Get the 90th percentile
 */
export function p90(q: Quantity): Quantity {
  return new Quantity(q.percentile(0.90), q.unit.toString())
}

/**
 * Get the 95th percentile (high end of 90% CI)
 */
export function p95(q: Quantity): Quantity {
  return new Quantity(q.percentile(0.95), q.unit.toString())
}

/**
 * Get the 99th percentile
 */
export function p99(q: Quantity): Quantity {
  return new Quantity(q.percentile(0.99), q.unit.toString())
}

/**
 * Get the mean of a distribution
 */
export function mean(q: Quantity): Quantity {
  return new Quantity(q.mean(), q.unit.toString())
}

/**
 * Get the standard deviation of a distribution
 */
export function std(q: Quantity): Quantity {
  const particles = q.toParticles()
  const m = q.mean()
  const variance = particles.reduce((sum, x) => sum + (x - m) ** 2, 0) / particles.length
  return new Quantity(Math.sqrt(variance), q.unit.toString())
}

/**
 * Internal helper to compute CRPS components.
 * Returns { reliability, resolution } where CRPS = reliability - resolution
 */
function crpsComponents(dist: Quantity, observation: Quantity): {
  reliability: number | number[]
  resolution: number
  unit: string
} {
  if (!dist.unit.equalBase(observation.unit)) {
    throw new Error(
      `crps functions require arguments with compatible units, got ${dist.unit} and ${observation.unit}`
    )
  }

  const particles = dist.toParticles()
  const n = particles.length

  // Sort particles for efficient E|X - X'| computation
  const sorted = particles.slice().sort((a, b) => a - b)

  // Compute E|X - X'| using sorted samples: (2/n²) * Σᵢ (2i - n + 1) * xᵢ
  // This exploits the fact that for sorted values, we can compute the sum of
  // all pairwise absolute differences in O(n) instead of O(n²)
  let pairwiseSum = 0
  for (let i = 0; i < n; i++) {
    pairwiseSum += (2 * i - n + 1) * sorted[i]
  }
  const giniMeanDiff = (2 / (n * n)) * pairwiseSum
  const resolution = 0.5 * giniMeanDiff

  // Handle observation - could be scalar or distribution
  const obsParticles = observation.toParticles()

  if (obsParticles.length === 1) {
    const y = obsParticles[0]
    let absSum = 0
    for (let i = 0; i < n; i++) {
      absSum += Math.abs(sorted[i] - y)
    }
    return { reliability: absSum / n, resolution, unit: dist.unit.toString() }
  }

  // Distribution observation - compute reliability for each observation particle
  const reliabilities: number[] = new Array(obsParticles.length)
  for (let j = 0; j < obsParticles.length; j++) {
    const y = obsParticles[j]
    let absSum = 0
    for (let i = 0; i < n; i++) {
      absSum += Math.abs(sorted[i] - y)
    }
    reliabilities[j] = absSum / n
  }
  return { reliability: reliabilities, resolution, unit: dist.unit.toString() }
}

/**
 * Compute CRPS (Continuous Ranked Probability Score) for a distribution against an observation.
 *
 * CRPS measures the accuracy of a probabilistic forecast. Lower scores are better.
 * Score of 0 means the distribution is a perfect point mass at the observation.
 *
 * CRPS = reliability - resolution = E|X - y| - 0.5 * E|X - X'|
 *
 * @param dist - The forecast distribution
 * @param observation - The observed value (scalar or distribution)
 * @returns CRPS score with same units as inputs
 */
export function crps(dist: Quantity, observation: Quantity): Quantity {
  const { reliability, resolution, unit } = crpsComponents(dist, observation)
  if (typeof reliability === 'number') {
    return new Quantity(reliability - resolution, unit)
  }
  return new Quantity(reliability.map(r => r - resolution), unit)
}

/**
 * Compute the reliability component of CRPS: E|X - y|
 *
 * This is the mean absolute error between the forecast samples and the observation.
 * Higher values indicate the forecast center is far from the truth.
 *
 * @param dist - The forecast distribution
 * @param observation - The observed value (scalar or distribution)
 * @returns Reliability term with same units as inputs
 */
export function crps_reliability(dist: Quantity, observation: Quantity): Quantity {
  const { reliability, unit } = crpsComponents(dist, observation)
  if (typeof reliability === 'number') {
    return new Quantity(reliability, unit)
  }
  return new Quantity(reliability, unit)
}

/**
 * Compute the resolution component of CRPS: 0.5 * E|X - X'|
 *
 * This is half the Gini mean difference of the forecast distribution.
 * Higher values indicate a wider, less confident forecast.
 * This term rewards sharpness (narrow forecasts) in the CRPS score.
 *
 * @param dist - The forecast distribution
 * @param observation - The observed value (unused, for API consistency)
 * @returns Resolution term with same units as dist
 */
export function crps_resolution(dist: Quantity, observation: Quantity): Quantity {
  const { resolution, unit } = crpsComponents(dist, observation)
  return new Quantity(resolution, unit)
}

// ============================================
// Clamp function
// ============================================

export function clamp(value: Quantity, minVal: Quantity, maxVal: Quantity): Quantity {
  if (!value.unit.equalBase(minVal.unit) || !value.unit.equalBase(maxVal.unit)) {
    throw new Error(`clamp() requires all arguments with compatible units`)
  }

  const vParticles = value.toParticles()
  const minParticles = minVal.toParticles()
  const maxParticles = maxVal.toParticles()
  const maxLength = Math.max(vParticles.length, minParticles.length, maxParticles.length)
  const result: number[] = new Array(maxLength)

  for (let i = 0; i < maxLength; i++) {
    const v = vParticles[i % vParticles.length]
    const lo = minParticles[i % minParticles.length]
    const hi = maxParticles[i % maxParticles.length]
    result[i] = Math.max(lo, Math.min(hi, v))
  }

  if (vParticles.length === 1 && minParticles.length === 1 && maxParticles.length === 1) {
    return new Quantity(result[0], value.unit.toString())
  }
  return new Quantity(result, value.unit.toString())
}
