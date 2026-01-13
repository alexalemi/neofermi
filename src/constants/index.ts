/**
 * Physical Constants Library
 *
 * Based on CODATA 2018 values. Constants with measured uncertainties
 * are represented as distributions.
 */

import { Quantity } from '../core/Quantity.js'
import { plusminus } from '../distributions/normal.js'

// ============================================
// Exact Constants (no uncertainty by definition)
// ============================================

/** Speed of light in vacuum (exact) */
export const c = new Quantity(299792458, 'm/s')

/** Planck constant (exact since 2019) */
export const h = new Quantity(6.62607015e-34, 'J s')

/** Reduced Planck constant ℏ = h/(2π) */
export const hbar = new Quantity(6.62607015e-34 / (2 * Math.PI), 'J s')

/** Elementary charge (exact since 2019) */
export const e = new Quantity(1.602176634e-19, 'C')

/** Boltzmann constant (exact since 2019) */
export const k = new Quantity(1.380649e-23, 'J/K')
export const kB = k // alias

/** Avogadro constant (exact since 2019) */
export const NA = new Quantity(6.02214076e23, '1/mol')

/** Standard gravity */
export const g = new Quantity(9.80665, 'm/s^2')

// ============================================
// Measured Constants (with uncertainty)
// ============================================

/** Gravitational constant G */
export const G = plusminus(6.67430e-11, 1.5e-15, 'N m^2 / kg^2')

/** Fine structure constant α ≈ 1/137 */
export const alpha = plusminus(7.2973525693e-3, 1.1e-12)

/** Electron mass */
export const m_e = plusminus(9.1093837015e-31, 2.8e-40, 'kg')

/** Proton mass */
export const m_p = plusminus(1.67262192369e-27, 5.1e-37, 'kg')

/** Neutron mass */
export const m_n = plusminus(1.67492749804e-27, 9.5e-37, 'kg')

/** Atomic mass unit */
export const u = plusminus(1.66053906660e-27, 5.0e-37, 'kg')
export const amu = u // alias

/** Bohr radius */
export const a0 = plusminus(5.29177210903e-11, 8.0e-21, 'm')

/** Classical electron radius */
export const r_e = plusminus(2.8179403262e-15, 1.3e-24, 'm')

/** Rydberg constant */
export const R_inf = plusminus(10973731.568160, 2.1e-5, '1/m')

// ============================================
// Derived/Composite Constants
// ============================================

/** Stefan-Boltzmann constant σ = (2π⁵k⁴)/(15h³c²) */
export const sigma = new Quantity(5.670374419e-8, 'W / m^2 / K^4')

/** Wien displacement constant */
export const b = new Quantity(2.897771955e-3, 'm K')

/** Vacuum permittivity ε₀ */
export const epsilon0 = new Quantity(8.8541878128e-12, 'F/m')

/** Vacuum permeability μ₀ */
export const mu0 = new Quantity(1.25663706212e-6, 'H/m')

/** Molar gas constant R = NA × k */
export const R = new Quantity(8.314462618, 'J / mol / K')

// ============================================
// Astronomical Constants
// ============================================

/** Astronomical unit (exact since 2012) */
export const AU = new Quantity(149597870700, 'm')

/** Light year */
export const ly = new Quantity(9.4607304725808e15, 'm')

/** Parsec */
export const pc = new Quantity(3.0856775814913673e16, 'm')

/** Solar mass */
export const M_sun = plusminus(1.98841e30, 4e25, 'kg')

/** Solar radius */
export const R_sun = plusminus(6.96342e8, 6.5e4, 'm')

/** Solar luminosity */
export const L_sun = plusminus(3.828e26, 8e22, 'W')

/** Earth mass */
export const M_earth = plusminus(5.97217e24, 1.3e20, 'kg')

/** Earth radius (equatorial) */
export const R_earth = new Quantity(6.3781e6, 'm')

/** Moon mass */
export const M_moon = plusminus(7.342e22, 1e18, 'kg')

// ============================================
// Common Everyday Constants
// ============================================

/** Standard atmospheric pressure */
export const atm = new Quantity(101325, 'Pa')

/** Absolute zero in Celsius */
export const T0 = new Quantity(273.15, 'K')

/** Water density at 4°C */
export const rho_water = new Quantity(1000, 'kg/m^3')

// ============================================
// Export all constants as a map for easy access
// ============================================

export const constants: Record<string, Quantity> = {
  // Exact
  c, h, hbar, e, k, kB, NA, g,
  // Measured
  G, alpha, m_e, m_p, m_n, u, amu, a0, r_e, R_inf,
  // Derived
  sigma, b, epsilon0, mu0, R,
  // Astronomical
  AU, ly, pc, M_sun, R_sun, L_sun, M_earth, R_earth, M_moon,
  // Everyday
  atm, T0, rho_water,
}

export default constants
