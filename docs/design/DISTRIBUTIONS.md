# Distribution Functions Reference

This document details the distribution functions to be implemented in NeoFermi, based on SimpleFermi.

## Core Distributions (Phase 1 Priority)

All distributions generate **20,000 samples** by default (configurable).

### 1. LogNormal (PRIMARY - Default for Positive Quantities)

**Why it's the default**: Most Fermi estimates involve positive quantities that vary multiplicatively. LogNormal naturally handles orders of magnitude.

```typescript
function lognormal(a: number, b: number, unit?: string, p = 0.9, n = 20000): Quantity
```

**Implementation** (from SimpleFermi):
```python
# Geometric mean for μ
mu = np.log(np.sqrt(b * a))

# Factor based on confidence level p (default 90%)
factor = -math.sqrt(2) * erfinv(2 * 0.5 * (1 - p) - 1)

# Standard deviation in log space
sig = np.log(np.sqrt(b / a)) / factor

# Generate samples
samples = np.exp(mu + sig * np.random.randn(n))
```

**Examples**:
- `lognormal(10, 1000, 'meters')` - could be 10m to 1km (2 orders of magnitude)
- `lognormal(1e6, 1e9, 'dollars')` - million to billion dollar estimate

**Properties**:
- Always positive
- Handles wide ranges naturally
- Symmetric in log-space
- Better than normal for "could be 10x or 100x"

---

### 2. Normal (General Purpose - Can Be Negative)

```typescript
function normal(a: number, b: number, unit?: string, p = 0.9, n = 20000): Quantity
```

**Implementation** (from SimpleFermi):
```python
# Arithmetic mean for μ
mu = 0.5 * (a + b)

# Factor based on confidence level p
factor = -math.sqrt(2) * erfinv(2 * 0.5 * (1 - p) - 1)

# Standard deviation
sig = 0.5 * (b - a) / factor

# Generate samples
samples = mu + sig * np.random.randn(n)
```

**Examples**:
- `normal(-10, 10, 'celsius')` - temperature could be negative
- `normal(0, 100, 'meters')` - when you know it starts at zero

**Properties**:
- Can be negative
- Symmetric around mean
- Use when values are additive, not multiplicative

---

### 3. Uniform (Maximum Entropy Prior)

```typescript
function uniform(low: number, high: number, unit?: string, n = 20000): Quantity
```

**Implementation**:
```python
samples = left + (right - left) * np.random.uniform(size=n)
```

**Examples**:
- `uniform(1, 10, 'meters')` - "I have no idea, could be anywhere from 1 to 10"
- `uniform(0, 1)` - probability with no prior knowledge

**Properties**:
- Flat distribution (maximum entropy given only bounds)
- Every value equally likely
- Simple and interpretable
- Use when you truly have no information except bounds

---

### 4. Beta (For Proportions via `outof()`)

```typescript
function outof(successes: number, total: number, n = 20000): Quantity
function beta(a: number, b: number, n = 20000): Quantity  // direct beta
```

**Implementation** (from SimpleFermi):
```python
# outof uses beta with +1 to both parameters (Laplace smoothing)
def outof(frac, tot, n=N):
    return np.random.beta(frac + 1, tot - frac + 1, size=n)

# Direct beta
def beta(a, b, n=N):
    return np.random.beta(a + 1, b + 1, size=n)
```

**Examples**:
- `outof(7, 10)` - "7 out of 10 succeeded" → beta distribution for true proportion
- `outof(70, 100)` - same mean (70%) but tighter distribution (more data)

**Properties**:
- Always between 0 and 1 (perfect for proportions/probabilities)
- Naturally incorporates uncertainty from finite samples
- More observations → tighter distribution
- Laplace smoothing (+1) prevents 0/1 probabilities

**Why not just 7/10 = 0.7?**
- `7/10 = 0.7` loses uncertainty information
- `outof(7, 10)` gives distribution: could be 0.4-0.9 with 90% confidence
- Crucial for propagating uncertainty through calculations

---

### 5. Gamma (For Counts and Rates)

```typescript
function gamma(shape: number, scale?: number, unit?: string, n = 20000): Quantity
```

**Implementation** (from SimpleFermi):
```python
def gamma(a, n=N):
    # shape parameter is a+1
    return np.random.gamma(shape=a + 1, size=n)
```

**Examples**:
- `gamma(10, 1, 'events/day')` - count data (events, arrivals, etc.)
- `gamma(5, 2, 'meters')` - positive continuous data from counting processes

**Properties**:
- Always positive (like lognormal)
- Natural for count data and waiting times
- Shape determines skewness
- Alternative to lognormal for some applications

**When to use Gamma vs LogNormal?**
- **Gamma**: Count-based processes, rates, Poisson-related
- **LogNormal**: Multiplicative processes, products of random variables

---

## Convenience Functions (Built on Core)

These are implemented using the core distributions above.

### `to()` - Smart Range (MOST COMMONLY USED)

```typescript
function to(a: number, b: number, unit?: string, p = 0.9, n = 20000): Quantity
```

**Implementation** (from SimpleFermi):
```python
def to(a, b, units=None, p=P, n=N):
    """Uses lognormal if both positive, normal otherwise."""
    if a > 0 and b > 0:
        return lognormal(a, b, units, p, n)
    else:
        return normal(a, b, units, p, n)
```

**Examples**:
- `to(10, 100, 'meters')` → lognormal (both positive)
- `to(-10, 10, 'celsius')` → normal (can be negative)

**This is the workhorse function** - use it most of the time!

---

### `plusminus()` - Normal with Mean ± Std Dev

```typescript
function plusminus(mean: number, std: number, unit?: string, n = 20000): Quantity
```

**Implementation**:
```python
def plusminus(mean=0.0, sig=1.0, units=None, n=N):
    return mean + sig * np.random.randn(n)
```

**Examples**:
- `plusminus(100, 10, 'meters')` - "100 ± 10 meters"
- `plusminus(0, 1)` - standard normal

---

### `percent()` - Multiplicative Percentage Error

```typescript
function percent(percentage: number, unit?: string, p = 0.9, n = 20000): Quantity
```

**Implementation** (from SimpleFermi):
```python
def percent(percentage, p=P, n=N):
    """Multiplicative uncertainty as percentage."""
    top = 1.0 + percentage / 100.0
    return lognormal(1.0 / top, top, p=p, n=n)
```

**Examples**:
- `3 meters * percent(10)` - "3 meters ± 10%" → lognormal from 2.7 to 3.3
- `percent(50)` - 50% error → factor of 1/1.5 to 1.5

**Use case**: "I know it's about X, give or take Y%"

---

### `db()` - Decibel-Based Error

```typescript
function db(decibels = 1.0, unit?: string, p = 0.9, n = 20000): Quantity
```

**Implementation** (from SimpleFermi):
```python
def db(x=1.0, p=P, n=N):
    """Uncertainty in decibels. 10dB = 10x, 3dB ≈ 2x."""
    return lognormal(10 ** (-x / 10.0), 10 ** (x / 10.0), p=p, n=n)
```

**Examples**:
- `db(10)` - one order of magnitude (factor of 10)
- `db(3)` - factor of ~2
- `100 * db(10)` - "100, give or take an order of magnitude" → 10 to 1000

**Use case**: "Order of magnitude" thinking

---

### `sigfig()` - Significant Figures

```typescript
function sigfig(value: string, unit?: string, n = 20000): Quantity
```

**Concept**: Interprets significant figures as uncertainty bounds.

**Examples**:
- `sigfig("1.0", "meters")` - 1 sig fig → uniform from 0.95 to 1.05
- `sigfig("1", "meters")` - 1 sig fig → uniform from 0.5 to 1.5
- `sigfig("1.00", "meters")` - 3 sig figs → uniform from 0.995 to 1.005

**Implementation**: Uniform distribution based on last significant digit.

---

### `against()` - Alternative Beta Phrasing

```typescript
function against(successes: number, failures: number, n = 20000): Quantity
```

**Implementation**:
```python
def against(a, b, n=N):
    return np.random.beta(a, b, size=n)
```

**Examples**:
- `against(7, 3)` - "7 for, 3 against" (same as `outof(7, 10)`)

---

## Data-Based Distributions (Phase 2+)

These will be implemented after core distributions are working.

### `data()` - Bootstrap from Empirical Data

```typescript
function data(values: number[], weights?: number[], unit?: string, n = 20000): Quantity
```

**Concept**: Resample from observed data (with replacement).

**Examples**:
- `data([1, 2, 3, 4, 5], undefined, 'meters')` - bootstrap from measurements
- `data([10, 20, 30], [0.5, 0.3, 0.2], 'kg')` - weighted samples

---

## Implementation Notes

### Confidence Parameter `p`

SimpleFermi uses `p = 0.9` by default, meaning:
- For `lognormal(a, b)`, the interval [a, b] contains 90% of the probability mass
- a is at the 5th percentile
- b is at the 95th percentile

This is configured in SimpleFermi as `utils.P` and should be configurable in NeoFermi.

### The `_factor()` Function

Critical helper function:

```python
def _factor(x):
    return math.sqrt(2) * erfinv(2 * x - 1)
```

This converts from percentile to standard deviations using the inverse error function.

For p=0.9:
```python
factor = -_factor(0.5 * (1 - 0.9))  # -_factor(0.05)
# This gives how many standard deviations out is the 5th percentile
```

### Unit Handling

All distribution functions accept an optional `unit` parameter:

```python
def _unitize(vals, units=None):
    if units is None:
        return vals
    return Q(vals, units)  # Q is the Quantity constructor
```

In TypeScript, this will be:
```typescript
if (unit) {
  return new Quantity(samples, unit)
} else {
  return new Quantity(samples)  // dimensionless
}
```

---

## Priority Order for Implementation

**Phase 1 - Core (Week 1-2):**
1. ✅ LogNormal - most important
2. ✅ Normal - second most important
3. ✅ Uniform - simplest
4. ✅ Beta (via `outof()`) - essential for proportions
5. ✅ Gamma - useful for counts

**Phase 1 - Convenience (Week 2-3):**
6. `to()` - most-used wrapper
7. `plusminus()` - common use case
8. `percent()` - Fermi-specific
9. `db()` - Fermi-specific
10. `sigfig()` - nice to have

**Phase 2 - Data:**
11. `data()` - bootstrap
12. `against()` - alternative beta syntax

---

## Testing Strategy

For each distribution, verify:

1. **Statistical properties** (using 20k samples):
   - Mean matches expected
   - Std dev matches expected
   - Percentiles match expected (5th, 50th, 95th)

2. **Edge cases**:
   - Very wide ranges (1 to 1e10)
   - Very narrow ranges (0.99 to 1.01)
   - Negative values (where applicable)

3. **Unit propagation**:
   - Distribution with units maintains units
   - Distribution without units is dimensionless

4. **Comparison with SimpleFermi**:
   - Port test cases from SimpleFermi
   - Verify statistical equivalence

---

## Why These Distributions?

This set covers the essential use cases for Fermi estimation:

- **Positive quantities** (most common): LogNormal
- **Can-be-negative quantities**: Normal
- **No prior knowledge**: Uniform
- **Proportions from data**: Beta
- **Counts/rates**: Gamma

Plus convenience wrappers for common patterns:
- **General range**: `to()` (auto-chooses lognormal or normal)
- **Percentage error**: `percent()`
- **Order of magnitude**: `db()`
- **Measurement notation**: `plusminus()`

This is a **minimal but complete** set for Fermi estimates, validated by SimpleFermi's real-world usage.
