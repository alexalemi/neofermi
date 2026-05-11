/**
 * Significant-figure parsing: turn a written number into a value plus the
 * implied uncertainty (half the place value of its last significant digit).
 */

/**
 * Parse a number string and infer its uncertainty from significant figures.
 *
 *   "3.14"  → value 3.14,  uncertainty 0.005  (3 sig figs)
 *   "130"   → value 130,   uncertainty 5      (trailing zeros ambiguous → 2 sf)
 *   "130."  → value 130,   uncertainty 0.5    (trailing decimal → 3 sf)
 *   "1.30"  → value 1.30,  uncertainty 0.005  (trailing zero significant → 3 sf)
 *   "1.3e6" → value 1.3e6, uncertainty 5e4    (2 sf, exponent shifts the place)
 */
export function parseSigFigs(raw: string): { value: number; uncertainty: number } {
  const value = parseFloat(raw)

  // Split scientific notation into mantissa and exponent.
  const eMatch = raw.toLowerCase().match(/^([^e]+)e([+-]?\d+)$/)
  const mantissa = eMatch ? eMatch[1] : raw
  const exponent = eMatch ? parseInt(eMatch[2], 10) : 0

  // Place value (power of ten) of the last significant digit in the mantissa.
  let lastDigitPlace: number
  if (mantissa.includes('.')) {
    const afterDecimal = mantissa.slice(mantissa.indexOf('.') + 1)
    // "130." → ones place; "3.14"/"1.30" → -(digits after the point).
    lastDigitPlace = afterDecimal.length === 0 ? 0 : -afterDecimal.length
  } else {
    // No decimal point: trailing zeros are not significant ("130" → tens place).
    let trailingZeros = 0
    for (const ch of mantissa.split('').reverse()) {
      if (ch === '0') trailingZeros++
      else break
    }
    lastDigitPlace = trailingZeros
  }

  const uncertainty = 0.5 * Math.pow(10, lastDigitPlace + exponent)
  return { value, uncertainty }
}
