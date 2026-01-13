/**
 * Physical Constants Library
 *
 * Based on CODATA 2018 values. Constants with measured uncertainties
 * are represented as distributions.
 */

import { Quantity } from '../core/Quantity.js'
import { plusminus } from '../distributions/normal.js'
import { weighted } from '../distributions/weighted.js'

// ============================================
// Mathematical Constants
// ============================================

/** Pi */
export const pi = new Quantity(Math.PI)

/** Euler's number */
export const e = new Quantity(Math.E)
export const euler = e

/** Tau = 2π */
export const tau = new Quantity(2 * Math.PI)

/** Googol = 10^100 */
export const googol = new Quantity(1e100)

// ============================================
// SI Defining Constants (exact since 2019)
// ============================================

/** Speed of light in vacuum (exact) */
export const c = new Quantity(299792458, 'm/s')
export const speed_of_light = c

/** Planck constant (exact since 2019) */
export const h = new Quantity(6.62607015e-34, 'J s')
export const Planck = h
export const planck = h
export const plancks_constant = h

/** Reduced Planck constant ℏ = h/(2π) */
export const hbar = new Quantity(6.62607015e-34 / (2 * Math.PI), 'J s')

/** Elementary charge (exact since 2019) */
export const elementary_charge = new Quantity(1.602176634e-19, 'C')
export const q = elementary_charge // alias

/** Boltzmann constant (exact since 2019) */
export const k = new Quantity(1.380649e-23, 'J/K')
export const kB = k
export const boltzmann = k
export const boltzmann_constant = k
export const boltzmanns_constant = k

/** Avogadro constant (exact since 2019) */
export const NA = new Quantity(6.02214076e23, '1/mol')
export const avogadro = NA

/** Cesium hyperfine transition frequency (defines the second) */
export const vcs = new Quantity(9192631770, '1/s')

/** Luminous efficacy of 540 THz radiation (683 lm/W) */
export const kcd = new Quantity(683) // lumen/W - mathjs doesn't support lumen

// ============================================
// Measured Constants (with uncertainty)
// ============================================

/** Gravitational constant G */
export const G = plusminus(6.67408e-11, 0.00031e-11, 'N m^2 / kg^2')

/** Standard gravity */
export const g = new Quantity(9.80665, 'm/s^2')
export const standard_gravity = g

/** Fine structure constant α ≈ 1/137 */
export const alpha = plusminus(7.2973525693e-3, 1.1e-12)

/** Atomic mass unit */
export const u = plusminus(1.660539040e-27, 0.000000020e-27, 'kg')
export const amu = u
export const atomic_mass_unit = u

/** Classical electron radius */
export const r_e = plusminus(2.8179403227e-15, 0.0000000019e-15, 'm')
export const classical_electron_radius = r_e

/** Thomson cross section */
export const thomson_cross_section = plusminus(0.66524587158e-28, 0.00000000091e-28, 'm^2')

/** Wien displacement constant */
export const b = plusminus(2.8977729e-3, 0.0000017e-3, 'm K')
export const wien_displacement = b

/** Rydberg constant */
export const R_inf = plusminus(10973731.568508, 0.000065, '1/m')
export const Rydberg_constant = R_inf

/** Bohr radius */
export const a0 = plusminus(0.52917721067e-10, 0.00000000012e-10, 'm')
export const bohr_radius = a0

/** Planck temperature */
export const planck_temperature = plusminus(1.416808e32, 0.000033e32, 'K')

// ============================================
// Particle Masses
// ============================================

/** Electron mass */
export const m_e = plusminus(9.1093837015e-31, 2.8e-40, 'kg')

/** Proton mass */
export const m_p = plusminus(1.67262192369e-27, 5.1e-37, 'kg')

/** Neutron mass */
export const m_n = plusminus(1.67492749804e-27, 9.5e-37, 'kg')

// ============================================
// Magnetic Moments
// ============================================

/** Muon magnetic moment */
export const muon_magnetic_moment = plusminus(-4.49044826e-26, 0.00000010e-26, 'J/T')

/** Proton magnetic moment */
export const proton_magnetic_moment = plusminus(1.4106067873e-26, 0.0000000097e-26, 'J/T')

/** Electron magnetic moment */
export const electron_magnetic_moment = plusminus(-928.4764520e-26, 0.0000057e-26, 'J/T')

/** Neutron magnetic moment */
export const neutron_magnetic_moment = plusminus(-0.96623650e-26, 0.00000023e-26, 'J/T')

/** Deuteron magnetic moment */
export const deuteron_magnetic_moment = plusminus(0.4330735040e-26, 0.0000000036e-26, 'J/T')

// ============================================
// Derived/Composite Constants
// ============================================

/** Stefan-Boltzmann constant σ = (2π⁵k⁴)/(15h³c²) */
export const sigma = new Quantity(5.670374419e-8, 'W / m^2 / K^4')
export const stefan_boltzmann = sigma

/** Vacuum permittivity ε₀ */
export const epsilon0 = new Quantity(8.8541878128e-12, 'F/m')

/** Vacuum permeability μ₀ */
export const mu0 = new Quantity(1.25663706212e-6, 'H/m')

/** Molar gas constant R = NA × k */
export const R = new Quantity(8.314462618, 'J / mol / K')
export const gas_constant = R

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
export const M_earth = plusminus(5.9722e24, 6.0e20, 'kg')

/** Earth radius (mean) */
export const R_earth = plusminus(6.371e6, 1e4, 'm')

/** Moon mass */
export const M_moon = plusminus(7.342e22, 1e18, 'kg')

/** Solar constant (power per area at 1 AU) */
export const solar_constant = plusminus(1360.8, 0.5, 'W/m^2')

// ============================================
// Time Constants
// ============================================

/**
 * Gregorian calendar year
 * In a 400-year cycle: 303 regular years (365 days), 97 leap years (366 days)
 */
export const year = weighted([365, 366], [303, 97], 'day')
export const yr = year

/**
 * Gregorian calendar month
 * In a 400-year cycle:
 * - 31-day months: 7 months × 400 years = 2800
 * - 30-day months: 4 months × 400 years = 1600
 * - February 29: 97 leap years
 * - February 28: 303 regular years
 */
export const month = weighted([31, 30, 29, 28], [2800, 1600, 97, 303], 'day')

/** Day (exact) */
export const day = new Quantity(86400, 's')

/** Hour (exact) */
export const hour = new Quantity(3600, 's')
export const hr = hour

/** Minute (exact) */
export const minute = new Quantity(60, 's')
export const min = minute

/** Week (exact) */
export const week = new Quantity(604800, 's')

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
  // Mathematical
  e, euler, pi, tau, googol,
  // SI Defining (exact)
  c, speed_of_light, h, Planck, planck, plancks_constant, hbar,
  q, elementary_charge, k, kB, boltzmann, boltzmann_constant, boltzmanns_constant,
  NA, avogadro, vcs, kcd,
  // Measured
  G, g, standard_gravity, alpha, u, amu, atomic_mass_unit,
  r_e, classical_electron_radius, thomson_cross_section,
  b, wien_displacement, R_inf, Rydberg_constant, a0, bohr_radius, planck_temperature,
  // Particles
  m_e, m_p, m_n,
  electron_mass: m_e, proton_mass: m_p, neutron_mass: m_n,
  // Magnetic moments
  muon_magnetic_moment, proton_magnetic_moment, electron_magnetic_moment,
  neutron_magnetic_moment, deuteron_magnetic_moment,
  // Derived
  sigma, stefan_boltzmann, epsilon0, mu0, R, gas_constant,
  // Astronomical
  AU, ly, pc, M_sun, R_sun, L_sun, M_earth, R_earth, M_moon, solar_constant,
  // User-friendly astronomical aliases
  earth_mass: M_earth, sun_mass: M_sun, moon_mass: M_moon,
  earth_radius: R_earth, sun_radius: R_sun,
  sun_luminosity: L_sun,
  // Time
  year, yr, month, day, hour, hr, minute, min, week,
  // Everyday
  atm, T0, rho_water,
}

export default constants
