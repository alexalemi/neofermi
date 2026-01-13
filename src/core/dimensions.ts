/**
 * Human-readable dimension names for unit types
 *
 * Maps SI base dimension signatures to intuitive names like "volume", "velocity", etc.
 * Based on SimpleFermi's approach.
 *
 * mathjs dimension order: [mass, length, time, current, temperature, moles, luminosity, angle, bit]
 */

import { Unit } from 'mathjs'

interface DimensionInfo {
  name: string
  description?: string
}

// Map from dimension signature to human name
// mathjs order: [mass, length, time, current, temp, moles, luminosity, angle, bit]
const DIMENSION_NAMES: Record<string, DimensionInfo> = {
  // Base dimensions
  '0,1,0,0,0,0,0,0,0': { name: 'length' },
  '1,0,0,0,0,0,0,0,0': { name: 'mass' },
  '0,0,1,0,0,0,0,0,0': { name: 'time' },
  '0,0,0,1,0,0,0,0,0': { name: 'current' },
  '0,0,0,0,1,0,0,0,0': { name: 'temperature' },
  '0,0,0,0,0,1,0,0,0': { name: 'amount of substance' },
  '0,0,0,0,0,0,1,0,0': { name: 'luminous intensity' },
  '0,0,0,0,0,0,0,1,0': { name: 'angle' },
  '0,0,0,0,0,0,0,0,1': { name: 'information' },

  // Geometry
  '0,2,0,0,0,0,0,0,0': { name: 'area' },
  '0,3,0,0,0,0,0,0,0': { name: 'volume' },

  // Mechanics
  '0,0,-1,0,0,0,0,0,0': { name: 'frequency' },
  '0,1,-1,0,0,0,0,0,0': { name: 'velocity' },
  '0,1,-2,0,0,0,0,0,0': { name: 'acceleration' },
  '1,1,-1,0,0,0,0,0,0': { name: 'momentum' },
  '1,1,-2,0,0,0,0,0,0': { name: 'force' },
  '1,2,-2,0,0,0,0,0,0': { name: 'energy' },
  '1,2,-3,0,0,0,0,0,0': { name: 'power' },
  '1,-1,-2,0,0,0,0,0,0': { name: 'pressure' },
  '1,2,-1,0,0,0,0,0,0': { name: 'angular momentum' },
  '1,2,0,0,0,0,0,0,0': { name: 'moment of inertia' },
  '0,3,-1,0,0,0,0,0,0': { name: 'flow' },
  '1,-3,0,0,0,0,0,0,0': { name: 'mass density' },
  '-1,3,0,0,0,0,0,0,0': { name: 'specific volume' },
  '1,0,-1,0,0,0,0,0,0': { name: 'mass flow rate' },
  '0,2,-2,0,0,0,0,0,0': { name: 'specific energy' },

  // Surface tension / energy per area
  '1,0,-2,0,0,0,0,0,0': { name: 'surface tension' },

  // Electromagnetism
  '0,0,1,1,0,0,0,0,0': { name: 'charge' },
  '1,2,-3,-1,0,0,0,0,0': { name: 'voltage' },
  '1,2,-3,-2,0,0,0,0,0': { name: 'resistance' },
  '-1,-2,3,2,0,0,0,0,0': { name: 'conductance' },
  '1,2,-2,-1,0,0,0,0,0': { name: 'magnetic flux' },
  '1,2,-2,-2,0,0,0,0,0': { name: 'inductance' },
  '1,0,-2,-1,0,0,0,0,0': { name: 'magnetic flux density' },
  '0,1,-2,-1,0,0,0,0,0': { name: 'electric field strength' },
  '0,-1,0,1,0,0,0,0,0': { name: 'magnetic field strength' },
  '-1,-2,4,2,0,0,0,0,0': { name: 'capacitance' },
  '0,-2,0,1,0,0,0,0,0': { name: 'current density' },
  '0,-2,1,1,0,0,0,0,0': { name: 'surface charge density' },
  '0,-3,1,1,0,0,0,0,0': { name: 'charge density' },

  // Thermodynamics
  '1,2,-2,0,-1,0,0,0,0': { name: 'heat capacity' },
  '0,2,-2,0,-1,0,0,0,0': { name: 'specific heat capacity' },
  '1,1,-3,0,-1,0,0,0,0': { name: 'thermal conductivity' },

  // Concentration / molarity
  '0,-3,0,0,0,1,0,0,0': { name: 'concentration' },

  // Dimensionless
  '0,0,0,0,0,0,0,0,0': { name: 'dimensionless' },
}

/**
 * Get the dimension signature from a mathjs Unit
 */
function getDimensionSignature(unit: Unit): string {
  try {
    // mathjs units have a dimensions property
    const dims = (unit as any).dimensions
    if (!dims || !Array.isArray(dims)) {
      return '0,0,0,0,0,0,0,0,0'
    }
    return dims.join(',')
  } catch {
    return '0,0,0,0,0,0,0,0,0'
  }
}

/**
 * Get a human-readable dimension name for a unit
 * Returns null if no specific name is known
 */
export function getDimensionName(unit: Unit): string | null {
  const sig = getDimensionSignature(unit)
  const info = DIMENSION_NAMES[sig]
  return info?.name || null
}

/**
 * Get full dimension info for a unit
 */
export function getDimensionInfo(unit: Unit): DimensionInfo | null {
  const sig = getDimensionSignature(unit)
  return DIMENSION_NAMES[sig] || null
}

/**
 * Format a unit with its dimension name in curly braces
 * e.g., "m^3" -> "m^3 {volume}"
 */
export function formatUnitWithDimension(unit: Unit): string {
  const unitStr = unit.toString()
  const dimName = getDimensionName(unit)

  if (dimName && dimName !== 'dimensionless') {
    return `${unitStr} {${dimName}}`
  }
  return unitStr
}

/**
 * Check if a unit represents a specific dimension type
 */
export function isDimension(unit: Unit, dimensionName: string): boolean {
  const sig = getDimensionSignature(unit)
  const info = DIMENSION_NAMES[sig]
  return info?.name === dimensionName
}
