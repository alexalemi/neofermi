/**
 * Quantity class: represents a value with units and optional uncertainty
 *
 * A Quantity can be:
 * - A scalar with units (e.g., 3 meters)
 * - A distribution represented by particles (e.g., lognormal(10, 100, 'meters'))
 */

import { unit, Unit, type MathType } from 'mathjs'

export type Value = number | number[]

export class Quantity {
  readonly value: Value
  readonly unit: Unit

  constructor(value: Value, unitString?: string) {
    this.value = value
    this.unit = unitString ? unit(unitString) : unit('')
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

    // If both are scalars, return scalar
    if (aParticles.length === 1 && bParticles.length === 1) {
      return new Quantity(aParticles[0] / bParticles[0], resultUnit.toString())
    }

    // Otherwise, element-wise division
    const maxLength = Math.max(aParticles.length, bParticles.length)
    const result: number[] = new Array(maxLength)

    for (let i = 0; i < maxLength; i++) {
      const a = aParticles[i % aParticles.length]
      const b = bParticles[i % bParticles.length]
      result[i] = a / b
    }

    return new Quantity(result, resultUnit.toString())
  }

  pow(exponent: number): Quantity {
    const aParticles = this.toParticles()

    // Calculate resulting unit
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
   * Display methods
   */

  toString(): string {
    if (this.isScalar()) {
      return `${this.value} ${this.unit.toString()}`
    }

    // For distributions, show summary statistics
    const mean = this.mean()
    const p5 = this.percentile(0.05)
    const p95 = this.percentile(0.95)
    return `${mean.toExponential(2)} [${p5.toExponential(2)}, ${p95.toExponential(2)}] ${this.unit.toString()}`
  }
}
