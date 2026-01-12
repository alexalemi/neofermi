/**
 * Basic usage examples for NeoFermi
 *
 * Run with: pnpm tsx examples/basic_usage.ts
 * (requires: pnpm add -D tsx)
 */

import {
  Quantity,
  to,
  lognormal,
  normal,
  outof,
  plusminus,
  percent,
  db,
} from '../src/index.js'

console.log('=== NeoFermi Basic Examples ===\n')

// Example 1: Simple scalar with units
console.log('1. Scalar quantities with units:')
const distance = new Quantity(100, 'meters')
const time = new Quantity(10, 'seconds')
const speed = distance.divide(time)
console.log(`  Distance: ${distance}`)
console.log(`  Time: ${time}`)
console.log(`  Speed: ${speed}`)
console.log(`  Speed in km/h: ${speed.to('km/hour')}\n`)

// Example 2: LogNormal distribution (default for positive quantities)
console.log('2. LogNormal distribution (orders of magnitude):')
const estimate = lognormal(10, 1000, 'meters', 0.9, 20000)
console.log(`  Estimate: ${estimate}`)
console.log(`  Mean: ${estimate.mean().toFixed(2)} meters`)
console.log(`  Median: ${estimate.median().toFixed(2)} meters`)
console.log(`  Std: ${estimate.std().toFixed(2)} meters\n`)

// Example 3: Smart to() function
console.log('3. Smart to() function:')
const positive = to(10, 100, 'meters') // Uses lognormal (both positive)
const negative = to(-10, 10, 'celsius') // Uses normal (can be negative)
console.log(`  to(10, 100, 'meters'): ${positive}`)
console.log(`  to(-10, 10, 'celsius'): ${negative}\n`)

// Example 4: Proportions with outof()
console.log('4. Proportions (beta distribution):')
const proportion = outof(7, 10) // "7 out of 10"
console.log(`  outof(7, 10): ${proportion}`)
console.log(`  Mean: ${proportion.mean().toFixed(3)}`)
console.log(`  5th percentile: ${proportion.percentile(0.05).toFixed(3)}`)
console.log(`  95th percentile: ${proportion.percentile(0.95).toFixed(3)}\n`)

// Example 5: Arithmetic with uncertainty
console.log('5. Arithmetic with uncertainty:')
const width = lognormal(5, 15, 'meters', 0.9, 20000)
const length = lognormal(10, 30, 'meters', 0.9, 20000)
const area = width.multiply(length)
console.log(`  Width: ${width}`)
console.log(`  Length: ${length}`)
console.log(`  Area: ${area}`)
console.log(`  Area mean: ${area.mean().toFixed(2)} square meters\n`)

// Example 6: Percentage error
console.log('6. Percentage error:')
const measurement = new Quantity(100, 'kg')
const withError = measurement.multiply(percent(10)) // ±10%
console.log(`  Measurement: ${measurement}`)
console.log(`  With ±10% error: ${withError}`)
console.log(`  Range: ${withError.percentile(0.05).toFixed(2)} to ${withError.percentile(0.95).toFixed(2)} kg\n`)

// Example 7: Order of magnitude uncertainty
console.log('7. Order of magnitude (decibel) uncertainty:')
const rough = new Quantity(1000, 'meters')
const veryRough = rough.multiply(db(10)) // ±1 order of magnitude
console.log(`  Estimate: ${rough}`)
console.log(`  With ±10dB uncertainty: ${veryRough}`)
console.log(`  Range: ${veryRough.percentile(0.05).toExponential(1)} to ${veryRough.percentile(0.95).toExponential(1)} meters\n`)

// Example 8: Normal distribution with mean ± std
console.log('8. Normal distribution (plusminus):')
const temp = plusminus(20, 5, 'celsius', 20000)
console.log(`  Temperature: ${temp}`)
console.log(`  Mean: ${temp.mean().toFixed(2)}°C`)
console.log(`  Std: ${temp.std().toFixed(2)}°C\n`)

console.log('=== All examples completed! ===')
