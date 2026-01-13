/**
 * Unit utilities for NeoFermi
 *
 * Handles SI prefix expansion, plural removal, and common aliases
 * to make unit parsing more forgiving.
 */

import { unit as mathjsUnit, Unit } from 'mathjs'

/**
 * Common unit aliases - maps informal/abbreviated names to mathjs unit names
 */
const UNIT_ALIASES: Record<string, string> = {
  // Time
  yr: 'year',
  yrs: 'year',
  mo: 'month',
  mos: 'month',
  wk: 'week',
  wks: 'week',
  d: 'day',
  hr: 'hour',
  hrs: 'hour',
  min: 'minute',
  mins: 'minute',
  sec: 'second',
  secs: 'second',
  ms: 'millisecond',
  us: 'microsecond',
  ns: 'nanosecond',
  fortnight: '336 hour',  // 14 days
  decade: '3652.425 day', // 10 years (average)
  century: '36524.25 day', // 100 years (average)
  millennium: '365242.5 day', // 1000 years

  // Length
  mi: 'mile',
  yd: 'yard',
  yds: 'yard',
  ft: 'foot',
  'in': 'inch',  // 'in' is a reserved word in JS but works as key

  // Mass
  lb: 'pound',
  lbs: 'pound',
  oz: 'ounce',

  // Speed
  mph: 'mile/hour',
  kph: 'km/hour',
  kmh: 'km/hour',
  kmph: 'km/hour',
  mps: 'm/s',
  fps: 'foot/second',
  knot: 'knot',
  kn: 'knot',
  kt: 'knot',
  kts: 'knot',

  // Volume
  gal: 'gallon',
  gals: 'gallon',
  qt: 'quart',
  pt: 'pint',
  L: 'liter',
  l: 'liter',
  ml: 'milliliter',
  mL: 'milliliter',
  cup: 'cup',
  cups: 'cup',
  tbsp: 'tablespoon',
  Tbsp: 'tablespoon',
  tsp: 'teaspoon',
  floz: 'fluidounce',

  // Area
  sqft: 'foot^2',
  sqm: 'm^2',
  sqkm: 'km^2',
  sqmi: 'mile^2',
  sqyd: 'yard^2',
  sqin: 'inch^2',
  acre: 'acre',
  acres: 'acre',
  hectare: 'hectare',
  hectares: 'hectare',
  ha: 'hectare',

  // Energy
  cal: 'calorie',
  kcal: 'kilocalorie',
  Cal: 'kilocalorie',  // food calorie
  kWh: 'kW hour',
  kwh: 'kW hour',
  Wh: 'W hour',
  wh: 'W hour',
  eV: 'electronvolt',
  ev: 'electronvolt',
  keV: 'kiloelectronvolt',
  MeV: 'megaelectronvolt',
  GeV: 'gigaelectronvolt',
  TeV: 'teraelectronvolt',

  // Pressure
  atm: 'atmosphere',
  psi: 'psi',
  bar: 'bar',
  mbar: 'millibar',
  kPa: 'kilopascal',
  MPa: 'megapascal',
  Pa: 'pascal',
  torr: 'torr',
  mmHg: 'mmHg',

  // Temperature (mathjs uses these, but aliases help)
  degC: 'degC',
  degF: 'degF',
  celsius: 'degC',
  fahrenheit: 'degF',

  // Frequency
  Hz: 'hertz',
  hz: 'hertz',
  kHz: 'kilohertz',
  khz: 'kilohertz',
  MHz: 'megahertz',
  mhz: 'megahertz',
  GHz: 'gigahertz',
  ghz: 'gigahertz',

  // Data
  bit: 'bit',
  bits: 'bit',
  byte: 'byte',
  bytes: 'byte',
  B: 'byte',
  kB: 'kilobyte',
  KB: 'kilobyte',
  MB: 'megabyte',
  GB: 'gigabyte',
  TB: 'terabyte',
  PB: 'petabyte',

  // Force
  N: 'newton',

  // Power
  W: 'watt',
  kW: 'kilowatt',
  MW: 'megawatt',
  GW: 'gigawatt',
  hp: 'horsepower',

  // Angle
  deg: 'degree',
  rad: 'radian',
  arcmin: 'arcmin',
  arcminute: 'arcmin',
  arcsec: 'arcsec',
  arcsecond: 'arcsec',
  sr: 'steradian',

  // Astronomy (common informal)
  au: 'AU',
  AU: 'AU',
  ly: 'lightyear',
  lyr: 'lightyear',
  pc: 'parsec',

  // Counts and quantities
  dozen: '12',
  doz: '12',
  gross: '144', // 12 dozen
  score: '20',
  pair: '2',
  mol: 'mole',

  // Misc
  rpm: '1/minute',
  rps: '1/second',
  bpm: '1/minute', // beats per minute (same as rpm)
}

/**
 * SI prefixes - both full names and abbreviations
 * Maps prefix -> multiplier exponent (power of 10)
 */
const SI_PREFIXES: Record<string, { abbrev: string; power: number }> = {
  // Large
  yotta: { abbrev: 'Y', power: 24 },
  zetta: { abbrev: 'Z', power: 21 },
  exa: { abbrev: 'E', power: 18 },
  peta: { abbrev: 'P', power: 15 },
  tera: { abbrev: 'T', power: 12 },
  giga: { abbrev: 'G', power: 9 },
  mega: { abbrev: 'M', power: 6 },
  kilo: { abbrev: 'k', power: 3 },
  hecto: { abbrev: 'h', power: 2 },
  deca: { abbrev: 'da', power: 1 },
  deka: { abbrev: 'da', power: 1 }, // alternate spelling
  // Small
  deci: { abbrev: 'd', power: -1 },
  centi: { abbrev: 'c', power: -2 },
  milli: { abbrev: 'm', power: -3 },
  micro: { abbrev: 'u', power: -6 }, // also μ but we use 'u'
  nano: { abbrev: 'n', power: -9 },
  pico: { abbrev: 'p', power: -12 },
  femto: { abbrev: 'f', power: -15 },
  atto: { abbrev: 'a', power: -18 },
  zepto: { abbrev: 'z', power: -21 },
  yocto: { abbrev: 'y', power: -24 },
}

/**
 * Abbreviation to full prefix mapping (reverse lookup)
 */
const ABBREV_TO_PREFIX: Record<string, string> = {}
for (const [name, info] of Object.entries(SI_PREFIXES)) {
  ABBREV_TO_PREFIX[info.abbrev] = name
}
// Special case: 'μ' -> micro
ABBREV_TO_PREFIX['μ'] = 'micro'

/**
 * Try to parse a unit string, returning the Unit if successful or null if not
 */
function tryParseUnit(unitStr: string): Unit | null {
  if (!unitStr || unitStr.trim() === '') return null
  try {
    return mathjsUnit(unitStr)
  } catch {
    return null
  }
}

/**
 * Remove plural suffix from a unit name
 * Handles: meters->meter, inches->inch, feet->foot (special cases)
 */
function removePlural(unitStr: string): string {
  // Special irregular plurals
  const irregulars: Record<string, string> = {
    feet: 'foot',
    inches: 'inch',
  }

  const lower = unitStr.toLowerCase()
  if (irregulars[lower]) {
    // Preserve original case if possible
    return irregulars[lower]
  }

  // Regular plurals: remove trailing 's'
  if (unitStr.endsWith('s') && unitStr.length > 1) {
    return unitStr.slice(0, -1)
  }

  return unitStr
}

/**
 * Try to extract SI prefix from a unit string
 * Returns { prefix, baseUnit } or null if no prefix found
 *
 * Handles both:
 * - Full names: "millimeter" -> { prefix: "milli", baseUnit: "meter" }
 * - Abbreviations: "km" -> { prefix: "kilo", baseUnit: "m" }
 * - Mixed: "Myear" -> { prefix: "mega", baseUnit: "year" }
 */
function extractSIPrefix(unitStr: string): { prefix: string; baseUnit: string; power: number } | null {
  // Try full prefix names first (case-insensitive for prefix, preserve case for base)
  const lowerStr = unitStr.toLowerCase()
  for (const [prefix, info] of Object.entries(SI_PREFIXES)) {
    if (lowerStr.startsWith(prefix)) {
      const baseUnit = unitStr.slice(prefix.length)
      if (baseUnit.length > 0) {
        return { prefix, baseUnit, power: info.power }
      }
    }
  }

  // Try abbreviation prefixes (case-sensitive)
  // Sort by length descending to match 'da' before 'd'
  const abbrevs = Object.keys(ABBREV_TO_PREFIX).sort((a, b) => b.length - a.length)
  for (const abbrev of abbrevs) {
    if (unitStr.startsWith(abbrev)) {
      const baseUnit = unitStr.slice(abbrev.length)
      if (baseUnit.length > 0) {
        const prefix = ABBREV_TO_PREFIX[abbrev]
        return { prefix, baseUnit, power: SI_PREFIXES[prefix].power }
      }
    }
  }

  return null
}

/**
 * Normalize a unit string for mathjs parsing
 *
 * Tries multiple strategies:
 * 1. Original string as-is
 * 2. Remove plural suffix
 * 3. Expand SI prefix to mathjs-compatible form
 * 4. Combine: expand prefix + remove plural
 *
 * @param unitStr - The unit string to normalize
 * @returns Normalized unit string that mathjs can parse
 * @throws Error if no valid interpretation found
 */
export function normalizeUnit(unitStr: string): string {
  if (!unitStr || unitStr.trim() === '') {
    return ''
  }

  const original = unitStr.trim()

  // Strategy 0: Check unit aliases first
  if (UNIT_ALIASES[original]) {
    const aliased = UNIT_ALIASES[original]
    if (tryParseUnit(aliased)) {
      return aliased
    }
  }

  // Strategy 1: Try original string
  if (tryParseUnit(original)) {
    return original
  }

  // Strategy 2: Try removing plural
  const singular = removePlural(original)
  if (singular !== original && tryParseUnit(singular)) {
    return singular
  }

  // Strategy 3: Try extracting SI prefix
  const prefixInfo = extractSIPrefix(original)
  if (prefixInfo) {
    // mathjs understands some SI prefixes natively, try that first
    const mathjsPrefixed = SI_PREFIXES[prefixInfo.prefix]?.abbrev + prefixInfo.baseUnit
    if (tryParseUnit(mathjsPrefixed)) {
      return mathjsPrefixed
    }

    // Try just the base unit (we'll handle prefix as multiplier)
    if (tryParseUnit(prefixInfo.baseUnit)) {
      // mathjs might understand the abbreviated form
      return mathjsPrefixed
    }

    // Try base unit with plural removed
    const singularBase = removePlural(prefixInfo.baseUnit)
    if (singularBase !== prefixInfo.baseUnit) {
      const mathjsSingular = SI_PREFIXES[prefixInfo.prefix]?.abbrev + singularBase
      if (tryParseUnit(mathjsSingular)) {
        return mathjsSingular
      }
      if (tryParseUnit(singularBase)) {
        return SI_PREFIXES[prefixInfo.prefix]?.abbrev + singularBase
      }
    }
  }

  // Strategy 4: Try plural removal on potential prefixed unit
  const singularFull = removePlural(original)
  if (singularFull !== original) {
    const prefixInfoSingular = extractSIPrefix(singularFull)
    if (prefixInfoSingular) {
      const mathjsPrefixed = SI_PREFIXES[prefixInfoSingular.prefix]?.abbrev + prefixInfoSingular.baseUnit
      if (tryParseUnit(mathjsPrefixed)) {
        return mathjsPrefixed
      }
    }
  }

  // Nothing worked, return original and let mathjs throw the error
  return original
}

/**
 * Normalize a unit string and return scaling factor for SI prefixes
 *
 * When mathjs doesn't natively support an SI-prefixed unit (e.g., "milliyear"),
 * this returns the base unit and a scale factor to apply to the value.
 *
 * @param unitStr - The unit string (may include SI prefixes, plurals)
 * @returns { unit: string, scale: number } - normalized unit and scale factor
 */
export function normalizeUnitWithScale(unitStr: string): { unit: string; scale: number } {
  if (!unitStr || unitStr.trim() === '') {
    return { unit: '', scale: 1 }
  }

  const original = unitStr.trim()

  // Check unit aliases first (with scale 1)
  if (UNIT_ALIASES[original]) {
    const aliased = UNIT_ALIASES[original]
    if (tryParseUnit(aliased)) {
      return { unit: aliased, scale: 1 }
    }
  }

  const normalized = normalizeUnit(unitStr)

  // Try the normalized unit directly
  if (tryParseUnit(normalized)) {
    return { unit: normalized, scale: 1 }
  }

  // Extract SI prefix and try scaling
  const prefixInfo = extractSIPrefix(original)
  if (prefixInfo) {
    const baseOptions = [
      prefixInfo.baseUnit,
      removePlural(prefixInfo.baseUnit),
    ]

    for (const base of baseOptions) {
      if (tryParseUnit(base)) {
        return { unit: base, scale: Math.pow(10, prefixInfo.power) }
      }
    }
  }

  // Nothing worked, return original (will fail later)
  return { unit: normalized, scale: 1 }
}

/**
 * Create a mathjs Unit from a unit string with automatic normalization
 *
 * @param unitStr - The unit string (may include SI prefixes, plurals)
 * @returns mathjs Unit object
 */
export function parseUnit(unitStr: string): Unit {
  const normalized = normalizeUnit(unitStr)
  return mathjsUnit(normalized)
}

/**
 * Create a mathjs Unit with a value, with automatic normalization
 *
 * Handles SI prefixes by scaling the value when mathjs doesn't natively
 * support the prefixed unit (e.g., "milliyear" -> 0.001 year)
 *
 * @param value - The numeric value
 * @param unitStr - The unit string (may include SI prefixes, plurals)
 * @returns mathjs Unit object with value
 */
export function createUnit(value: number, unitStr: string): Unit {
  if (!unitStr || unitStr.trim() === '') {
    return mathjsUnit(value, '')
  }

  const normalized = normalizeUnit(unitStr)

  // Try the normalized unit directly
  try {
    return mathjsUnit(value, normalized)
  } catch {
    // Normalized unit failed, try SI prefix extraction with scaling
  }

  // Extract SI prefix and try scaling the value
  const prefixInfo = extractSIPrefix(unitStr)
  if (prefixInfo) {
    // Try the base unit (with plural removal)
    const baseOptions = [
      prefixInfo.baseUnit,
      removePlural(prefixInfo.baseUnit),
    ]

    for (const base of baseOptions) {
      if (tryParseUnit(base)) {
        // Base unit works! Scale the value by the prefix power
        const scaledValue = value * Math.pow(10, prefixInfo.power)
        return mathjsUnit(scaledValue, base)
      }
    }
  }

  // Nothing worked, try original and let mathjs throw the error
  return mathjsUnit(value, normalized)
}

/**
 * Get all known unit alias names for autocomplete and error suggestions
 */
export function getKnownUnitNames(): string[] {
  // Common mathjs base units + our aliases
  const baseUnits = [
    'meter', 'm', 'kilometer', 'km', 'centimeter', 'cm', 'millimeter', 'mm',
    'inch', 'foot', 'yard', 'mile', 'lightyear',
    'second', 'minute', 'hour', 'day', 'week', 'month', 'year',
    'gram', 'g', 'kilogram', 'kg', 'pound', 'ounce', 'ton',
    'liter', 'gallon', 'quart', 'pint', 'cup',
    'joule', 'J', 'calorie', 'watt', 'W', 'kilowatt', 'horsepower',
    'newton', 'N', 'pascal', 'Pa', 'bar', 'atmosphere', 'psi',
    'kelvin', 'K', 'celsius', 'fahrenheit',
    'ampere', 'A', 'volt', 'V', 'ohm', 'farad', 'coulomb', 'C',
    'hertz', 'Hz', 'radian', 'degree', 'steradian',
    'mole', 'mol', 'candela', 'lumen', 'lux',
    'byte', 'bit', 'AU', 'parsec'
  ]
  return [...new Set([...Object.keys(UNIT_ALIASES), ...baseUnits])]
}
