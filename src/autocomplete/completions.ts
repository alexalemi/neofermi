/**
 * Autocomplete completions for NeoFermi
 *
 * Provides lists of available units, constants, functions, and keywords.
 */

export interface Completion {
  label: string
  type: 'function' | 'constant' | 'unit' | 'keyword'
  description?: string
  signature?: string
}

// Keywords and operators
export const KEYWORDS: Completion[] = [
  { label: 'to', type: 'keyword', description: 'Range operator (lognormal distribution)' },
  { label: 'thru', type: 'keyword', description: 'Uniform distribution' },
  { label: 'pm', type: 'keyword', description: 'Normal distribution (plus/minus)' },
  { label: 'of', type: 'keyword', description: 'Beta distribution (successes of total)' },
  { label: 'against', type: 'keyword', description: 'Beta distribution (successes against failures)' },
  { label: 'as', type: 'keyword', description: 'Unit conversion' },
  { label: 'let', type: 'keyword', description: 'Local variable binding' },
  { label: 'in', type: 'keyword', description: 'Body of let binding' },
  { label: 'if', type: 'keyword', description: 'Conditional expression' },
  { label: 'then', type: 'keyword', description: 'Then branch of conditional' },
  { label: 'else', type: 'keyword', description: 'Else branch of conditional' },
]

// Distribution functions
export const DISTRIBUTION_FUNCTIONS: Completion[] = [
  { label: 'to', type: 'function', signature: 'to(low, high, unit?)', description: 'Smart range (lognormal if positive, normal otherwise)' },
  { label: 'lognormal', type: 'function', signature: 'lognormal(low, high, unit?)', description: 'Lognormal distribution from percentiles' },
  { label: 'normal', type: 'function', signature: 'normal(low, high, unit?)', description: 'Normal distribution from percentiles' },
  { label: 'uniform', type: 'function', signature: 'uniform(low, high, unit?)', description: 'Uniform distribution' },
  { label: 'outof', type: 'function', signature: 'outof(successes, total)', description: 'Beta distribution from success rate' },
  { label: 'gamma', type: 'function', signature: 'gamma(shape, scale, unit?)', description: 'Gamma distribution' },
  { label: 'plusminus', type: 'function', signature: 'plusminus(center, error, unit?)', description: 'Normal distribution from center ± error' },
  { label: 'percent', type: 'function', signature: 'percent(pct)', description: 'Multiplicative error (e.g., ±10%)' },
  { label: 'db', type: 'function', signature: 'db(decibels)', description: 'Precision in decibels (higher = more precise)' },
]

// Math functions
export const MATH_FUNCTIONS: Completion[] = [
  // Basic
  { label: 'abs', type: 'function', signature: 'abs(x)', description: 'Absolute value' },
  { label: 'sign', type: 'function', signature: 'sign(x)', description: 'Sign of number (-1, 0, or 1)' },
  { label: 'floor', type: 'function', signature: 'floor(x)', description: 'Round down to integer' },
  { label: 'ceil', type: 'function', signature: 'ceil(x)', description: 'Round up to integer' },
  { label: 'round', type: 'function', signature: 'round(x)', description: 'Round to nearest integer' },
  { label: 'trunc', type: 'function', signature: 'trunc(x)', description: 'Truncate to integer' },
  // Power/roots
  { label: 'sqrt', type: 'function', signature: 'sqrt(x)', description: 'Square root' },
  { label: 'cbrt', type: 'function', signature: 'cbrt(x)', description: 'Cube root' },
  { label: 'exp', type: 'function', signature: 'exp(x)', description: 'e^x' },
  { label: 'pow', type: 'function', signature: 'pow(base, exp)', description: 'Power function' },
  // Logarithms
  { label: 'log', type: 'function', signature: 'log(x)', description: 'Natural logarithm' },
  { label: 'ln', type: 'function', signature: 'ln(x)', description: 'Natural logarithm' },
  { label: 'log10', type: 'function', signature: 'log10(x)', description: 'Base-10 logarithm' },
  { label: 'log2', type: 'function', signature: 'log2(x)', description: 'Base-2 logarithm' },
  // Trigonometry
  { label: 'sin', type: 'function', signature: 'sin(x)', description: 'Sine (radians)' },
  { label: 'cos', type: 'function', signature: 'cos(x)', description: 'Cosine (radians)' },
  { label: 'tan', type: 'function', signature: 'tan(x)', description: 'Tangent (radians)' },
  { label: 'asin', type: 'function', signature: 'asin(x)', description: 'Arcsine (returns radians)' },
  { label: 'acos', type: 'function', signature: 'acos(x)', description: 'Arccosine (returns radians)' },
  { label: 'atan', type: 'function', signature: 'atan(x)', description: 'Arctangent (returns radians)' },
  { label: 'atan2', type: 'function', signature: 'atan2(y, x)', description: 'Two-argument arctangent' },
  // Hyperbolic
  { label: 'sinh', type: 'function', signature: 'sinh(x)', description: 'Hyperbolic sine' },
  { label: 'cosh', type: 'function', signature: 'cosh(x)', description: 'Hyperbolic cosine' },
  { label: 'tanh', type: 'function', signature: 'tanh(x)', description: 'Hyperbolic tangent' },
  // Binary
  { label: 'min', type: 'function', signature: 'min(a, b)', description: 'Minimum of two values' },
  { label: 'max', type: 'function', signature: 'max(a, b)', description: 'Maximum of two values' },
  { label: 'hypot', type: 'function', signature: 'hypot(a, b)', description: 'Hypotenuse (sqrt(a² + b²))' },
  { label: 'clamp', type: 'function', signature: 'clamp(x, min, max)', description: 'Clamp value to range' },
]

// Physical constants
export const CONSTANTS: Completion[] = [
  // Mathematical
  { label: 'pi', type: 'constant', description: 'π ≈ 3.14159' },
  { label: 'e', type: 'constant', description: 'Euler\'s number ≈ 2.71828' },
  { label: 'tau', type: 'constant', description: '2π ≈ 6.28318' },
  { label: 'googol', type: 'constant', description: '10^100' },
  // SI defining constants
  { label: 'c', type: 'constant', description: 'Speed of light (299,792,458 m/s)' },
  { label: 'h', type: 'constant', description: 'Planck constant' },
  { label: 'hbar', type: 'constant', description: 'Reduced Planck constant (h/2π)' },
  { label: 'q', type: 'constant', description: 'Elementary charge' },
  { label: 'k', type: 'constant', description: 'Boltzmann constant' },
  { label: 'kB', type: 'constant', description: 'Boltzmann constant (alias)' },
  { label: 'NA', type: 'constant', description: 'Avogadro number' },
  // Derived constants
  { label: 'G', type: 'constant', description: 'Gravitational constant' },
  { label: 'g', type: 'constant', description: 'Standard gravity (9.80665 m/s²)' },
  { label: 'epsilon0', type: 'constant', description: 'Vacuum permittivity' },
  { label: 'mu0', type: 'constant', description: 'Vacuum permeability' },
  { label: 'sigma', type: 'constant', description: 'Stefan-Boltzmann constant' },
  { label: 'alpha', type: 'constant', description: 'Fine-structure constant' },
  { label: 'R', type: 'constant', description: 'Gas constant' },
  // Masses
  { label: 'electron_mass', type: 'constant', description: 'Electron mass' },
  { label: 'proton_mass', type: 'constant', description: 'Proton mass' },
  { label: 'neutron_mass', type: 'constant', description: 'Neutron mass' },
  { label: 'm_e', type: 'constant', description: 'Electron mass (alias)' },
  { label: 'm_p', type: 'constant', description: 'Proton mass (alias)' },
  { label: 'm_n', type: 'constant', description: 'Neutron mass (alias)' },
  { label: 'u', type: 'constant', description: 'Atomic mass unit' },
  { label: 'amu', type: 'constant', description: 'Atomic mass unit (alias)' },
  { label: 'earth_mass', type: 'constant', description: 'Earth mass (with uncertainty)' },
  { label: 'sun_mass', type: 'constant', description: 'Solar mass (with uncertainty)' },
  { label: 'moon_mass', type: 'constant', description: 'Moon mass' },
  { label: 'M_earth', type: 'constant', description: 'Earth mass (alias)' },
  { label: 'M_sun', type: 'constant', description: 'Solar mass (alias)' },
  { label: 'M_moon', type: 'constant', description: 'Moon mass (alias)' },
  // Radii
  { label: 'earth_radius', type: 'constant', description: 'Earth mean radius' },
  { label: 'sun_radius', type: 'constant', description: 'Solar radius' },
  { label: 'R_earth', type: 'constant', description: 'Earth radius (alias)' },
  { label: 'R_sun', type: 'constant', description: 'Solar radius (alias)' },
  { label: 'a0', type: 'constant', description: 'Bohr radius' },
  // Distances
  { label: 'AU', type: 'constant', description: 'Astronomical unit' },
  { label: 'ly', type: 'constant', description: 'Light-year' },
  { label: 'pc', type: 'constant', description: 'Parsec' },
  // Luminosity/Power
  { label: 'sun_luminosity', type: 'constant', description: 'Solar luminosity' },
  { label: 'L_sun', type: 'constant', description: 'Solar luminosity (alias)' },
  { label: 'solar_constant', type: 'constant', description: 'Solar constant at Earth' },
  // Time
  { label: 'year', type: 'constant', description: 'Year (365 or 366 days, weighted)' },
  { label: 'yr', type: 'constant', description: 'Year (alias)' },
  { label: 'month', type: 'constant', description: 'Month (28-31 days, weighted)' },
  { label: 'week', type: 'constant', description: 'Week (7 days)' },
  { label: 'day', type: 'constant', description: 'Day (24 hours)' },
  { label: 'hour', type: 'constant', description: 'Hour (3600 seconds)' },
  { label: 'hr', type: 'constant', description: 'Hour (alias)' },
  { label: 'minute', type: 'constant', description: 'Minute (60 seconds)' },
  { label: 'min', type: 'constant', description: 'Minute (alias)' },
  // Other
  { label: 'atm', type: 'constant', description: 'Standard atmosphere (101325 Pa)' },
  { label: 'T0', type: 'constant', description: 'Ice point (273.15 K)' },
  { label: 'rho_water', type: 'constant', description: 'Density of water (1000 kg/m³)' },
]

// Common units
export const UNITS: Completion[] = [
  // Length
  { label: 'm', type: 'unit', description: 'Meter' },
  { label: 'km', type: 'unit', description: 'Kilometer' },
  { label: 'cm', type: 'unit', description: 'Centimeter' },
  { label: 'mm', type: 'unit', description: 'Millimeter' },
  { label: 'mi', type: 'unit', description: 'Mile' },
  { label: 'ft', type: 'unit', description: 'Foot' },
  { label: 'inch', type: 'unit', description: 'Inch' },
  // Time
  { label: 'second', type: 'unit', description: 'Second' },
  { label: 'minute', type: 'unit', description: 'Minute' },
  { label: 'hour', type: 'unit', description: 'Hour' },
  { label: 'day', type: 'unit', description: 'Day' },
  { label: 'week', type: 'unit', description: 'Week' },
  { label: 'yr', type: 'unit', description: 'Year' },
  // Mass
  { label: 'kg', type: 'unit', description: 'Kilogram' },
  { label: 'g', type: 'unit', description: 'Gram' },
  { label: 'lb', type: 'unit', description: 'Pound' },
  { label: 'oz', type: 'unit', description: 'Ounce' },
  // Speed
  { label: 'mph', type: 'unit', description: 'Miles per hour' },
  { label: 'kph', type: 'unit', description: 'Kilometers per hour' },
  // Energy
  { label: 'J', type: 'unit', description: 'Joule' },
  { label: 'kWh', type: 'unit', description: 'Kilowatt-hour' },
  { label: 'cal', type: 'unit', description: 'Calorie' },
  { label: 'eV', type: 'unit', description: 'Electronvolt' },
  // Power
  { label: 'W', type: 'unit', description: 'Watt' },
  { label: 'kW', type: 'unit', description: 'Kilowatt' },
  { label: 'hp', type: 'unit', description: 'Horsepower' },
  // Volume
  { label: 'L', type: 'unit', description: 'Liter' },
  { label: 'mL', type: 'unit', description: 'Milliliter' },
  { label: 'gal', type: 'unit', description: 'Gallon' },
  // Area
  { label: 'sqm', type: 'unit', description: 'Square meter' },
  { label: 'sqft', type: 'unit', description: 'Square foot' },
  // Data
  { label: 'byte', type: 'unit', description: 'Byte' },
  { label: 'KB', type: 'unit', description: 'Kilobyte' },
  { label: 'MB', type: 'unit', description: 'Megabyte' },
  { label: 'GB', type: 'unit', description: 'Gigabyte' },
  { label: 'TB', type: 'unit', description: 'Terabyte' },
  // Temperature
  { label: 'K', type: 'unit', description: 'Kelvin' },
  { label: 'degC', type: 'unit', description: 'Celsius' },
  { label: 'degF', type: 'unit', description: 'Fahrenheit' },
]

// All completions combined
export const ALL_COMPLETIONS: Completion[] = [
  ...KEYWORDS,
  ...DISTRIBUTION_FUNCTIONS,
  ...MATH_FUNCTIONS,
  ...CONSTANTS,
  ...UNITS,
]

/**
 * Get completions matching a prefix
 */
export function getCompletions(prefix: string, maxResults: number = 10): Completion[] {
  if (!prefix || prefix.length < 1) return []

  const lowerPrefix = prefix.toLowerCase()

  // Filter and sort completions
  const matches = ALL_COMPLETIONS
    .filter(c => c.label.toLowerCase().startsWith(lowerPrefix))
    .sort((a, b) => {
      // Exact matches first
      if (a.label === prefix && b.label !== prefix) return -1
      if (b.label === prefix && a.label !== prefix) return 1
      // Then by length (shorter first)
      if (a.label.length !== b.label.length) return a.label.length - b.label.length
      // Then alphabetically
      return a.label.localeCompare(b.label)
    })

  return matches.slice(0, maxResults)
}

/**
 * Get the word at the cursor position
 */
export function getWordAtCursor(text: string, cursorPos: number): { word: string; start: number; end: number } | null {
  // Find word boundaries
  const beforeCursor = text.slice(0, cursorPos)
  const afterCursor = text.slice(cursorPos)

  // Match identifier characters before cursor
  const beforeMatch = beforeCursor.match(/[a-zA-Z_][a-zA-Z0-9_]*$/)
  if (!beforeMatch) return null

  // Match identifier characters after cursor
  const afterMatch = afterCursor.match(/^[a-zA-Z0-9_]*/)
  const afterPart = afterMatch ? afterMatch[0] : ''

  const word = beforeMatch[0] + afterPart
  const start = cursorPos - beforeMatch[0].length
  const end = cursorPos + afterPart.length

  return { word, start, end }
}
