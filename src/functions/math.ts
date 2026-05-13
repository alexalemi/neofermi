/**
 * Standard math functions for NeoFermi
 *
 * All functions work element-wise on distributions, preserving sample alignment.
 */

import { Quantity } from '../core/Quantity.js'

/** Wrap a particle array as a Quantity, collapsing a single particle to a scalar. */
function wrap(values: number[], unitStr?: string): Quantity {
  return new Quantity(values.length === 1 ? values[0] : values, unitStr)
}

/** Apply a unary numeric function element-wise, optionally transforming the unit. */
function applyUnary(
  q: Quantity,
  fn: (x: number) => number,
  unitTransform?: (u: string) => string,
): Quantity {
  const unitStr = q.unit.toString()
  return wrap(q.toParticles().map(fn), unitTransform ? unitTransform(unitStr) : unitStr)
}

/**
 * Apply a binary numeric function element-wise to two Quantities.
 *
 * When `resultUnit` is given, `b` is converted into it first so the operation
 * compares like-for-like numeric values (meters vs meters). When omitted the
 * result is dimensionless — right for ratios and log-scale ops.
 */
function applyBinary(
  a: Quantity,
  b: Quantity,
  fn: (x: number, y: number) => number,
  resultUnit?: string,
): Quantity {
  const aParticles = a.toParticles()
  const bParticles = resultUnit && b.unit.toString() !== resultUnit
    ? b.to(resultUnit).toParticles()
    : b.toParticles()
  const len = Math.max(aParticles.length, bParticles.length)
  const result = new Array<number>(len)
  for (let i = 0; i < len; i++) {
    result[i] = fn(aParticles[i % aParticles.length], bParticles[i % bParticles.length])
  }
  return wrap(result, resultUnit)
}

/** Throw unless `q` is dimensionless (or, when `allowRadians`, an angle in radians). */
function requireDimensionless(q: Quantity, fnName: string, allowRadians = false): void {
  const u = q.unit.toString()
  if (u === '' || (allowRadians && u === 'rad')) return
  throw new Error(
    `${fnName} requires a dimensionless${allowRadians ? ' or radian' : ''} argument, got ${u}`,
  )
}

// ── Basic ────────────────────────────────────────────────────────────────────

export const abs = (q: Quantity) => applyUnary(q, Math.abs)
export const sign = (q: Quantity) => applyUnary(q, Math.sign, () => '')
export const floor = (q: Quantity) => applyUnary(q, Math.floor)
export const ceil = (q: Quantity) => applyUnary(q, Math.ceil)
export const round = (q: Quantity) => applyUnary(q, Math.round)
export const trunc = (q: Quantity) => applyUnary(q, Math.trunc)

// ── Powers & roots ───────────────────────────────────────────────────────────

/** Map values through `fn` and raise the unit to `exponent` (used by sqrt/cbrt). */
function applyRoot(q: Quantity, exponent: number, fn: (x: number) => number): Quantity {
  // @ts-ignore - mathjs types are wrong; Unit.pow() accepts a plain number
  const resultUnit = q.unit.pow(exponent).toString()
  return wrap(q.toParticles().map(fn), resultUnit)
}
export const sqrt = (q: Quantity) => applyRoot(q, 0.5, Math.sqrt)
export const cbrt = (q: Quantity) => applyRoot(q, 1 / 3, Math.cbrt)

// ── Exponential & logarithmic (dimensionless in, dimensionless out) ──────────

/** Build a unary function that requires a dimensionless argument and result. */
function dimlessFn(fnName: string, fn: (x: number) => number): (q: Quantity) => Quantity {
  return (q: Quantity) => {
    requireDimensionless(q, fnName)
    return applyUnary(q, fn, () => '')
  }
}

export const exp = dimlessFn('exp()', Math.exp)
export const expm1 = dimlessFn('expm1()', Math.expm1)
export const log = dimlessFn('log()', Math.log)
export const ln = log // natural log alias
export const log10 = dimlessFn('log10()', Math.log10)
export const log2 = dimlessFn('log2()', Math.log2)
export const log1p = dimlessFn('log1p()', Math.log1p)

// ── Trigonometric (input in radians) ─────────────────────────────────────────

/** sin/cos/tan: accept dimensionless or radians, return dimensionless. */
function trigFn(fnName: string, fn: (x: number) => number): (q: Quantity) => Quantity {
  return (q: Quantity) => {
    requireDimensionless(q, fnName, true)
    return applyUnary(q, fn, () => '')
  }
}
export const sin = trigFn('sin()', Math.sin)
export const cos = trigFn('cos()', Math.cos)
export const tan = trigFn('tan()', Math.tan)

/** asin/acos/atan: require dimensionless, return radians. */
function inverseTrigFn(fnName: string, fn: (x: number) => number): (q: Quantity) => Quantity {
  return (q: Quantity) => {
    requireDimensionless(q, fnName)
    return applyUnary(q, fn, () => 'rad')
  }
}
export const asin = inverseTrigFn('asin()', Math.asin)
export const acos = inverseTrigFn('acos()', Math.acos)
export const atan = inverseTrigFn('atan()', Math.atan)

export function atan2(y: Quantity, x: Quantity): Quantity {
  // y and x must share a dimensional base; their units cancel in the ratio.
  if (!y.unit.equalBase(x.unit)) {
    throw new Error(`atan2() requires arguments with same units, got ${y.unit} and ${x.unit}`)
  }
  return applyBinary(y, x, Math.atan2)
}

// ── Hyperbolic (dimensionless in, dimensionless out) ─────────────────────────

export const sinh = dimlessFn('sinh()', Math.sinh)
export const cosh = dimlessFn('cosh()', Math.cosh)
export const tanh = dimlessFn('tanh()', Math.tanh)
export const asinh = dimlessFn('asinh()', Math.asinh)
export const acosh = dimlessFn('acosh()', Math.acosh)
export const atanh = dimlessFn('atanh()', Math.atanh)

// ── Binary ───────────────────────────────────────────────────────────────────

export function pow(base: Quantity, exponent: Quantity): Quantity {
  requireDimensionless(exponent, 'pow() exponent')
  // Scalar exponent: defer to Quantity.pow so the unit is raised correctly.
  if (exponent.isScalar()) return base.pow(exponent.value as number)
  // Distribution exponent (unusual): element-wise, dimensionless result.
  return applyBinary(base, exponent, Math.pow)
}

/** min/max/hypot all require a common dimensional base and report in `a`'s unit. */
function binaryReducer(
  fnName: string,
  fn: (x: number, y: number) => number,
  unitWord: string,
): (a: Quantity, b: Quantity) => Quantity {
  return (a: Quantity, b: Quantity) => {
    if (!a.unit.equalBase(b.unit)) {
      throw new Error(`${fnName} requires arguments with ${unitWord} units, got ${a.unit} and ${b.unit}`)
    }
    return applyBinary(a, b, fn, a.unit.toString())
  }
}
export const min = binaryReducer('min()', Math.min, 'compatible')
export const max = binaryReducer('max()', Math.max, 'compatible')
export const hypot = binaryReducer('hypot()', Math.hypot, 'same')

// ── Distribution summaries ───────────────────────────────────────────────────

/** Get a specific quantile from a distribution: `quantile(dist, 0.95)` → P95. */
export function quantile(q: Quantity, p: Quantity): Quantity {
  const pVal = p.isScalar() ? (p.value as number) : p.mean()
  if (pVal < 0 || pVal > 1) {
    throw new Error(`quantile() probability must be between 0 and 1, got ${pVal}`)
  }
  return new Quantity(q.percentile(pVal), q.unit.toString())
}
/** Alias for {@link quantile}; the probability argument is in 0..1. */
export const percentile = quantile

/** Build a `(dist) => Quantity` returning a fixed percentile. */
const atPercentile = (p: number) => (q: Quantity) =>
  new Quantity(q.percentile(p), q.unit.toString())
export const p5 = atPercentile(0.05)
export const p10 = atPercentile(0.10)
export const p25 = atPercentile(0.25)
export const median = atPercentile(0.50)
export const p75 = atPercentile(0.75)
export const p90 = atPercentile(0.90)
export const p95 = atPercentile(0.95)
export const p99 = atPercentile(0.99)

export const mean = (q: Quantity) => new Quantity(q.mean(), q.unit.toString())
export const std = (q: Quantity) => new Quantity(q.std(), q.unit.toString())

// ── CRPS family ──────────────────────────────────────────────────────────────

/**
 * Core of the CRPS family. Under an optional monotone transform `t`, computes
 *
 *   reliability = E|t(X) − t(y)|        (one value per observation particle)
 *   resolution  = ½·E|t(X) − t(X′)|     (half the Gini mean difference of the sample)
 *
 * with CRPS = reliability − resolution. `t` = identity gives ordinary CRPS;
 * `log` gives log-CRPS (relative error); `10·log10` gives dB-CRPS. The Gini
 * term is read off the sorted sample in O(n log n) as (2/n²)·Σᵢ (2i − n + 1)·x₍ᵢ₎.
 */
function crpsCore(
  dist: Quantity,
  observation: Quantity,
  label: string,
  transform?: (x: number) => number,
): { reliability: number[]; resolution: number } {
  if (!dist.unit.equalBase(observation.unit)) {
    throw new Error(
      `${label} requires arguments with compatible units, got ${dist.unit} and ${observation.unit}`,
    )
  }

  const requirePositive = (xs: number[], where: string) => {
    if (!transform) return
    for (const x of xs) {
      if (x <= 0) throw new Error(`${label} requires all positive values, got ${x} in ${where}`)
    }
  }
  const t = transform ?? ((x: number) => x)

  const dParticles = dist.toParticles()
  requirePositive(dParticles, 'forecast distribution')
  const sorted = dParticles.map(t).sort((a, b) => a - b)
  const n = sorted.length

  let pairwiseSum = 0
  for (let i = 0; i < n; i++) pairwiseSum += (2 * i - n + 1) * sorted[i]
  const resolution = pairwiseSum / (n * n) // = ½·(2/n²)·Σ … = Σ … / n²

  const obsParticles = observation.toParticles()
  requirePositive(obsParticles, 'observation')
  const reliability = obsParticles.map((y) => {
    const ty = t(y)
    let absSum = 0
    for (let i = 0; i < n; i++) absSum += Math.abs(sorted[i] - ty)
    return absSum / n
  })

  return { reliability, resolution }
}

/** Build the `crps` / `*_reliability` / `*_resolution` trio for one transform. */
function crpsFamily(label: string, opts: { transform?: (x: number) => number; resultUnit?: string }) {
  const unitOf = (dist: Quantity) => opts.resultUnit ?? dist.unit.toString()
  return {
    /** CRPS score — lower is better; 0 iff the forecast is a point mass at `obs`. */
    score: (dist: Quantity, obs: Quantity) => {
      const { reliability, resolution } = crpsCore(dist, obs, label, opts.transform)
      return wrap(reliability.map((r) => r - resolution), unitOf(dist))
    },
    /** Reliability term E|X − y|: how far the forecast centre sits from the truth. */
    reliability: (dist: Quantity, obs: Quantity) => {
      const { reliability } = crpsCore(dist, obs, label, opts.transform)
      return wrap(reliability, unitOf(dist))
    },
    /** Resolution term ½·E|X − X′|: the forecast's spread (rewards sharpness). */
    resolution: (dist: Quantity, obs: Quantity) => {
      const { resolution } = crpsCore(dist, obs, label, opts.transform)
      return new Quantity(resolution, unitOf(dist))
    },
  }
}

const _crps = crpsFamily('crps()', {})
// log-CRPS / dB-CRPS act on transformed values, so they weigh relative rather
// than absolute error; both require strictly positive inputs.
const _logcrps = crpsFamily('logcrps()', { transform: Math.log, resultUnit: '' })
const _dbcrps = crpsFamily('dbcrps()', { transform: (x) => 10 * Math.log10(x), resultUnit: 'dB' })

export const crps = _crps.score
export const crps_reliability = _crps.reliability
export const crps_resolution = _crps.resolution
export const logcrps = _logcrps.score
export const logcrps_reliability = _logcrps.reliability
export const logcrps_resolution = _logcrps.resolution
export const dbcrps = _dbcrps.score
export const dbcrps_reliability = _dbcrps.reliability
export const dbcrps_resolution = _dbcrps.resolution

// ── Clamp ────────────────────────────────────────────────────────────────────

export function clamp(value: Quantity, minVal: Quantity, maxVal: Quantity): Quantity {
  if (!value.unit.equalBase(minVal.unit) || !value.unit.equalBase(maxVal.unit)) {
    throw new Error('clamp() requires all arguments with compatible units')
  }
  const unitStr = value.unit.toString()
  const align = (q: Quantity) => (unitStr !== '' && q.unit.toString() !== unitStr ? q.to(unitStr) : q)
  const v = value.toParticles()
  const lo = align(minVal).toParticles()
  const hi = align(maxVal).toParticles()
  const len = Math.max(v.length, lo.length, hi.length)
  const result = new Array<number>(len)
  for (let i = 0; i < len; i++) {
    result[i] = Math.max(lo[i % lo.length], Math.min(hi[i % hi.length], v[i % v.length]))
  }
  return wrap(result, unitStr)
}
