/**
 * Quantity class: represents a value with units and optional uncertainty
 *
 * A Quantity can be:
 * - A scalar with units (e.g., 3 meters)
 * - A distribution represented by particles (e.g., lognormal(10, 100, 'meters'))
 */

import { unit, Unit } from 'mathjs'
import { getDimensionName, formatUnitWithDimension } from './dimensions.js'
import { normalizeUnitWithScale } from './unitUtils.js'

export type Value = number | number[]

export class Quantity {
  readonly value: Value
  readonly unit: Unit

  constructor(value: Value, unitString?: string) {
    // Normalize unit and get scaling factor for SI prefixes
    const { unit: normalizedUnit, scale } = unitString
      ? normalizeUnitWithScale(unitString)
      : { unit: '', scale: 1 }

    // Apply scale to value if needed (for SI prefixes like "milliyear" -> year * 0.001)
    if (scale !== 1) {
      if (Array.isArray(value)) {
        this.value = value.map((v) => v * scale)
      } else {
        this.value = value * scale
      }
    } else {
      this.value = value
    }

    this.unit = normalizedUnit ? unit(normalizedUnit) : unit('')
  }

  /**
   * Check if this quantity is a distribution (has particles)
   */
  isDistribution(): boolean {
    return Array.isArray(this.value)
  }

  /**
   * Check if this quantity is a scalar
   */
  isScalar(): boolean {
    return typeof this.value === 'number'
  }

  /**
   * Get the number of particles if this is a distribution
   */
  get sampleCount(): number {
    return Array.isArray(this.value) ? this.value.length : 1
  }

  /**
   * Convert value to particle array (promoting scalar if needed)
   */
  toParticles(): number[] {
    if (Array.isArray(this.value)) {
      return this.value
    }
    // Scalar: create array with single value repeated
    // This allows arithmetic with scalars
    return [this.value]
  }

  /**
   * Statistical methods (only for distributions)
   */

  mean(): number {
    if (!Array.isArray(this.value)) {
      return this.value
    }
    const sum = this.value.reduce((a, b) => a + b, 0)
    return sum / this.value.length
  }

  median(): number {
    if (!Array.isArray(this.value)) {
      return this.value
    }
    const sorted = [...this.value].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
  }

  std(): number {
    if (!Array.isArray(this.value)) {
      return 0
    }
    const m = this.mean()
    const variance = this.value.reduce((sum, x) => sum + (x - m) ** 2, 0) / this.value.length
    return Math.sqrt(variance)
  }

  percentile(p: number): number {
    if (!Array.isArray(this.value)) {
      return this.value
    }
    if (p < 0 || p > 1) {
      throw new Error('Percentile must be between 0 and 1')
    }
    const sorted = [...this.value].sort((a, b) => a - b)
    const index = Math.floor(p * sorted.length)
    return sorted[Math.min(index, sorted.length - 1)]
  }

  /**
   * Arithmetic operations
   */

  add(other: Quantity): Quantity {
    // Check dimensional compatibility
    if (!this.unit.equalBase(other.unit)) {
      throw new Error(
        `Cannot add quantities with incompatible units: ${this.unit} and ${other.unit}`
      )
    }

    const aParticles = this.toParticles()
    const bParticles = other.toParticles()

    // If both are scalars, return scalar
    if (aParticles.length === 1 && bParticles.length === 1) {
      return new Quantity(aParticles[0] + bParticles[0], this.unit.toString())
    }

    // Otherwise, element-wise addition
    const maxLength = Math.max(aParticles.length, bParticles.length)
    const result: number[] = new Array(maxLength)

    for (let i = 0; i < maxLength; i++) {
      const a = aParticles[i % aParticles.length]
      const b = bParticles[i % bParticles.length]
      result[i] = a + b
    }

    return new Quantity(result, this.unit.toString())
  }

  subtract(other: Quantity): Quantity {
    // Check dimensional compatibility
    if (!this.unit.equalBase(other.unit)) {
      throw new Error(
        `Cannot subtract quantities with incompatible units: ${this.unit} and ${other.unit}`
      )
    }

    const aParticles = this.toParticles()
    const bParticles = other.toParticles()

    // If both are scalars, return scalar
    if (aParticles.length === 1 && bParticles.length === 1) {
      return new Quantity(aParticles[0] - bParticles[0], this.unit.toString())
    }

    // Otherwise, element-wise subtraction
    const maxLength = Math.max(aParticles.length, bParticles.length)
    const result: number[] = new Array(maxLength)

    for (let i = 0; i < maxLength; i++) {
      const a = aParticles[i % aParticles.length]
      const b = bParticles[i % bParticles.length]
      result[i] = a - b
    }

    return new Quantity(result, this.unit.toString())
  }

  multiply(other: Quantity): Quantity {
    const aParticles = this.toParticles()
    const bParticles = other.toParticles()

    // Calculate resulting unit
    const resultUnit = this.unit.multiply(other.unit)

    // If both are scalars, return scalar
    if (aParticles.length === 1 && bParticles.length === 1) {
      return new Quantity(aParticles[0] * bParticles[0], resultUnit.toString())
    }

    // Otherwise, element-wise multiplication
    const maxLength = Math.max(aParticles.length, bParticles.length)
    const result: number[] = new Array(maxLength)

    for (let i = 0; i < maxLength; i++) {
      const a = aParticles[i % aParticles.length]
      const b = bParticles[i % bParticles.length]
      result[i] = a * b
    }

    return new Quantity(result, resultUnit.toString())
  }

  divide(other: Quantity): Quantity {
    const aParticles = this.toParticles()
    const bParticles = other.toParticles()

    // Calculate resulting unit
    const resultUnit = this.unit.divide(other.unit)

    // mathjs returns a number when units cancel, or a Unit otherwise
    // Simplify dimensionless units (e.g., m/m -> '')
    let unitStr: string
    if (typeof resultUnit === 'number') {
      // Units cancelled completely
      unitStr = ''
    } else {
      // Check if dimensionless (all dimensions are 0)
      unitStr = resultUnit.equalBase(unit('')) ? '' : resultUnit.toString()
    }

    // If both are scalars, return scalar
    if (aParticles.length === 1 && bParticles.length === 1) {
      return new Quantity(aParticles[0] / bParticles[0], unitStr)
    }

    // Otherwise, element-wise division
    const maxLength = Math.max(aParticles.length, bParticles.length)
    const result: number[] = new Array(maxLength)

    for (let i = 0; i < maxLength; i++) {
      const a = aParticles[i % aParticles.length]
      const b = bParticles[i % bParticles.length]
      result[i] = a / b
    }

    return new Quantity(result, unitStr)
  }

  pow(exponent: number): Quantity {
    const aParticles = this.toParticles()

    // Calculate resulting unit
    // @ts-ignore - mathjs types are incorrect, pow() accepts number
    const resultUnit = this.unit.pow(exponent)

    // If scalar, return scalar
    if (aParticles.length === 1) {
      return new Quantity(Math.pow(aParticles[0], exponent), resultUnit.toString())
    }

    // Otherwise, element-wise power
    const result: number[] = aParticles.map((x) => Math.pow(x, exponent))

    return new Quantity(result, resultUnit.toString())
  }

  /**
   * Unit conversion
   */
  to(targetUnit: string): Quantity {
    // Use mathjs to do the conversion
    const targetUnitObj = unit(targetUnit)

    // Check if conversion is possible
    if (!this.unit.equalBase(targetUnitObj)) {
      throw new Error(`Cannot convert ${this.unit} to ${targetUnit}: incompatible dimensions`)
    }

    const aParticles = this.toParticles()

    // Get conversion factor
    const sourceUnit = unit(1, this.unit.toString())
    const converted = sourceUnit.to(targetUnit)
    const conversionFactor = converted.toNumber()

    // Apply conversion
    if (aParticles.length === 1) {
      return new Quantity(aParticles[0] * conversionFactor, targetUnit)
    }

    const result = aParticles.map((x) => x * conversionFactor)
    return new Quantity(result, targetUnit)
  }

  /**
   * Convert to SI base units
   * Returns a new Quantity with value expressed in SI base units
   */
  toSI(): Quantity {
    const unitStr = this.unit.toString()

    // If dimensionless, just return a copy (no conversion needed)
    if (!unitStr || unitStr === '') {
      return new Quantity(this.value)
    }

    const aParticles = this.toParticles()

    // Get the SI representation of the unit
    // mathjs can convert any unit to its SI base representation
    const sourceUnit = unit(1, unitStr)
    const siUnit = sourceUnit.toSI()
    const siUnitString = siUnit.toString().replace(/^[\d.e+-]+\s*/, '') // Remove numeric prefix
    const conversionFactor = siUnit.toNumber()

    // Apply conversion
    if (aParticles.length === 1) {
      return new Quantity(aParticles[0] * conversionFactor, siUnitString)
    }

    const result = aParticles.map((x) => x * conversionFactor)
    return new Quantity(result, siUnitString)
  }

  /**
   * Get human-readable dimension name (e.g., "volume", "velocity")
   */
  dimensionName(): string | null {
    return getDimensionName(this.unit)
  }

  /**
   * Get unit string with dimension name in curly braces
   * e.g., "m^3 {volume}"
   */
  unitWithDimension(): string {
    return formatUnitWithDimension(this.unit)
  }

  /**
   * Display methods
   */

  toString(): string {
    if (this.isScalar()) {
      return `${this.value} ${this.unit.toString()}`
    }

    // For distributions, show summary statistics with 68% CI (1 sigma)
    const mean = this.mean()
    const p16 = this.percentile(0.16)
    const p84 = this.percentile(0.84)
    return `${mean.toExponential(2)} [${p16.toExponential(2)}, ${p84.toExponential(2)}] ${this.unit.toString()}`
  }
}
