# NeoFermi Usage Guide

## Installation

```bash
pnpm install
```

## Running Tests

```bash
pnpm test          # Run tests
pnpm test:ui       # Run tests with UI
pnpm test:coverage # Generate coverage report
```

## Basic Usage

### 1. Import the library

```typescript
import { Quantity, to, lognormal, normal, outof } from './src/index.js'
```

### 2. Create quantities with units

```typescript
const distance = new Quantity(100, 'meters')
const time = new Quantity(10, 'seconds')
const speed = distance.divide(time)
console.log(speed.toString()) // "10 meters / second"
```

### 3. Work with uncertainty (distributions)

```typescript
// LogNormal (DEFAULT for positive quantities)
const estimate = lognormal(10, 100, 'meters') // Could be 10 to 100 meters
console.log(estimate.mean()) // ~31.6 meters (geometric mean)
console.log(estimate.percentile(0.5)) // median

// Smart to() function - chooses lognormal or normal automatically
const positive = to(10, 100, 'meters') // → lognormal (both positive)
const temp = to(-10, 10, 'celsius') // → normal (can be negative)

// Normal distribution
const measurement = normal(0, 100, 'cm')
const withStd = plusminus(50, 10, 'cm') // 50 ± 10 cm

// Uniform (flat prior)
const unknown = uniform(1, 10, 'kg')

// Beta for proportions
const prob = outof(7, 10) // "7 out of 10" → beta distribution
console.log(prob.mean()) // ~0.67 (with Laplace smoothing)
```

### 4. Arithmetic with uncertainty

All operations work element-wise on the particle arrays:

```typescript
const width = lognormal(5, 15, 'meters')
const length = lognormal(10, 30, 'meters')
const area = width.multiply(length)
console.log(area.mean()) // Mean area
console.log(area.percentile(0.95)) // 95th percentile
```

### 5. Unit conversion

```typescript
const dist = new Quantity(1000, 'meters')
const km = dist.to('km')
console.log(km) // 1 km
```

### 6. Convenience functions

```typescript
// Percentage error (multiplicative)
const value = new Quantity(100, 'kg')
const withError = value.multiply(percent(10)) // ±10%

// Order of magnitude (10 dB = 10x)
const rough = new Quantity(1000, 'meters')
const veryRough = rough.multiply(db(10)) // ±1 order of magnitude
```

## Distribution Functions Reference

### Core Distributions (20,000 samples default)

1. **`lognormal(low, high, unit?, p=0.9, n=20000)`** - DEFAULT for positive
   - Use for: Mass, distance, time, energy, money
   - Handles orders of magnitude naturally

2. **`normal(left, right, unit?, p=0.9, n=20000)`** - For negative/centered values
   - Use for: Temperature, elevation, errors
   - Can be negative

3. **`uniform(low, high, unit?, n=20000)`** - Flat prior
   - Use for: Complete ignorance except bounds
   - Maximum entropy

4. **`outof(successes, total, n=20000)`** - Beta for proportions
   - Use for: "X out of Y" observations
   - Always between 0 and 1

5. **`gamma(shape, scale=1, unit?, n=20000)`** - For counts/rates
   - Use for: Count data, waiting times
   - Always positive

### Convenience Functions

- **`to(low, high, unit?, p=0.9, n=20000)`** - Smart choice
  - Lognormal if both positive, Normal otherwise
  - **USE THIS MOST OF THE TIME**

- **`plusminus(mean, std, unit?, n=20000)`** - Normal with explicit σ
  - "100 ± 10" notation

- **`percent(pct, p=0.9, n=20000)`** - Multiplicative percentage error
  - Returns dimensionless lognormal

- **`db(decibels=1, p=0.9, n=20000)`** - Order of magnitude
  - 10 dB = 10x, 3 dB ≈ 2x

## Statistical Methods

Every Quantity with a distribution has:

```typescript
q.mean() // Arithmetic mean
q.median() // 50th percentile
q.std() // Standard deviation
q.percentile(p) // p-th percentile (0 to 1)
q.sampleCount // Number of particles
q.isDistribution() // true if has uncertainty
q.isScalar() // true if single value
```

## Why LogNormal is Default?

Most Fermi estimates involve:
- **Positive quantities** (can't have negative mass!)
- **Multiplicative processes** (errors compound multiplicatively)
- **Orders of magnitude** thinking (could be 10x or 100x)

LogNormal naturally handles "could be 10 or could be 1000" better than Normal.

Use Normal when:
- Values can be negative (temperature, profit/loss)
- Errors are additive (measurement errors)
- Values are tightly clustered around a mean

## Configuration

```typescript
import { DEFAULT_SAMPLE_COUNT, DEFAULT_CONFIDENCE } from './src/config.js'

// Defaults:
// DEFAULT_SAMPLE_COUNT = 20000
// DEFAULT_CONFIDENCE = 0.9 (90% of mass in [low, high])
```

You can override on a per-call basis:

```typescript
const fastEstimate = lognormal(10, 100, 'meters', 0.9, 1000) // Only 1k samples
const precise = lognormal(10, 100, 'meters', 0.9, 50000) // 50k samples
```

## Examples

See `examples/basic_usage.ts` for a complete walkthrough.

To run examples (requires `tsx`):

```bash
pnpm add -D tsx
pnpm tsx examples/basic_usage.ts
```

## Next Steps

Phase 1 (Core Engine) is complete. Coming in Phase 2:
- Peggy parser for DSL syntax
- Natural language: `3 meters + 5 meters`
- Distribution syntax: `[10 to 100] meters`
- Variables: `x = 10 meters; y = x^2`

Phase 4 will add the web interface with live notebook!
