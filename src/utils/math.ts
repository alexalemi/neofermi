/**
 * Mathematical utility functions for distribution calculations
 */

/**
 * Error function approximation using Abramowitz and Stegun formula
 * Accurate to about 1.5e-7
 */
export function erf(x: number): number {
  // Save the sign of x
  const sign = x >= 0 ? 1 : -1
  x = Math.abs(x)

  // Constants
  const a1 = 0.254829592
  const a2 = -0.284496736
  const a3 = 1.421413741
  const a4 = -1.453152027
  const a5 = 1.061405429
  const p = 0.3275911

  // A&S formula 7.1.26
  const t = 1.0 / (1.0 + p * x)
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)

  return sign * y
}

/**
 * Inverse error function
 * Used to convert from percentiles to standard deviations
 */
export function erfinv(y: number): number {
  if (y < -1 || y > 1) {
    throw new Error('erfinv: argument must be in [-1, 1]')
  }

  if (y === -1) return -Infinity
  if (y === 1) return Infinity
  if (y === 0) return 0

  const a = 0.147

  const ln1 = Math.log(1 - y * y)
  const part1 = 2 / (Math.PI * a) + ln1 / 2
  const part2 = ln1 / a

  const erfInvValue = Math.sqrt(Math.sqrt(part1 * part1 - part2) - part1)

  return y < 0 ? -erfInvValue : erfInvValue
}

/**
 * Calculate the factor for converting from percentile to standard deviations
 * Used in normal and lognormal distributions
 *
 * @param x - Percentile value (0 to 1)
 * @returns Number of standard deviations
 */
export function factor(x: number): number {
  return Math.sqrt(2) * erfinv(2 * x - 1)
}

/**
 * Generate an array of random normal values (mean=0, std=1)
 * Uses Box-Muller transform
 *
 * @param n - Number of samples to generate
 * @returns Array of random normal values
 */
export function randn(n: number): number[] {
  const result: number[] = new Array(n)

  for (let i = 0; i < n; i += 2) {
    // Box-Muller transform
    const u1 = Math.random()
    const u2 = Math.random()

    const r = Math.sqrt(-2.0 * Math.log(u1))
    const theta = 2.0 * Math.PI * u2

    result[i] = r * Math.cos(theta)
    if (i + 1 < n) {
      result[i + 1] = r * Math.sin(theta)
    }
  }

  return result
}

/**
 * Generate an array of random uniform values (0 to 1)
 *
 * @param n - Number of samples to generate
 * @returns Array of random uniform values
 */
export function rand(n: number): number[] {
  const result: number[] = new Array(n)
  for (let i = 0; i < n; i++) {
    result[i] = Math.random()
  }
  return result
}
