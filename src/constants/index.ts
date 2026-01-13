/**
 * Physical Constants Library
 *
 * Based on CODATA 2022 values. Constants with measured uncertainties
 * are represented as distributions.
 *
 * Sources:
 * - CODATA 2022: https://physics.nist.gov/cuu/Constants/
 * - Planetary data: https://ssd.jpl.nasa.gov/planets/phys_par.html
 * - IAU 2015 Resolution B3 for nominal solar/planetary constants
 */

import { Quantity } from '../core/Quantity.js'
import { plusminus } from '../distributions/normal.js'
import { weighted } from '../distributions/weighted.js'
import { lognormal } from '../distributions/lognormal.js'

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

/** Fine structure constant α ≈ 1/137 (CODATA 2022) */
export const alpha = plusminus(7.2973525643e-3, 1.1e-12)

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

/** Bohr radius (CODATA 2022) */
export const a0 = plusminus(5.29177210544e-11, 8.2e-21, 'm')
export const bohr_radius = a0

/** Planck temperature */
export const planck_temperature = plusminus(1.416808e32, 0.000033e32, 'K')

// ============================================
// Particle Masses (CODATA 2022)
// ============================================

/** Electron mass */
export const m_e = plusminus(9.1093837139e-31, 2.8e-40, 'kg')

/** Proton mass */
export const m_p = plusminus(1.67262192595e-27, 5.2e-37, 'kg')

/** Neutron mass */
export const m_n = plusminus(1.67492750056e-27, 8.5e-37, 'kg')

/** Muon mass */
export const m_muon = plusminus(1.883531627e-28, 4.2e-36, 'kg')

/** Tau mass */
export const m_tau = plusminus(3.16754e-27, 2.1e-31, 'kg')

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

/** Bohr magneton (CODATA 2022) */
export const bohr_magneton = plusminus(9.2740100657e-24, 2.9e-33, 'J/T')
export const mu_B = bohr_magneton

/** Nuclear magneton (CODATA 2022) */
export const nuclear_magneton = plusminus(5.0507837393e-27, 1.6e-36, 'J/T')
export const mu_N = nuclear_magneton

// ============================================
// Compton Wavelengths (CODATA 2022)
// ============================================

/** Electron Compton wavelength */
export const lambda_C = plusminus(2.42631023538e-12, 7.6e-22, 'm')
export const compton_wavelength = lambda_C

/** Proton Compton wavelength */
export const lambda_C_p = plusminus(1.3214098536e-15, 4.1e-25, 'm')

/** Neutron Compton wavelength */
export const lambda_C_n = plusminus(1.31959090382e-15, 6.7e-25, 'm')

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

/** Moon radius */
export const R_moon = plusminus(1737.4e3, 100, 'm')

// ============================================
// Planetary Constants (JPL/NASA)
// ============================================

/** Mercury mass */
export const M_mercury = plusminus(3.30103e23, 2.1e19, 'kg')
/** Mercury radius (mean) */
export const R_mercury = plusminus(2439.4e3, 100, 'm')

/** Venus mass */
export const M_venus = plusminus(4.86731e24, 2.3e20, 'kg')
/** Venus radius (mean) */
export const R_venus = plusminus(6051.8e3, 1000, 'm')

/** Mars mass */
export const M_mars = plusminus(6.41691e23, 3.0e19, 'kg')
/** Mars radius (mean) */
export const R_mars = plusminus(3389.5e3, 200, 'm')

/** Jupiter mass */
export const M_jupiter = plusminus(1.898125e27, 8.8e22, 'kg')
/** Jupiter radius (mean) */
export const R_jupiter = plusminus(69911e3, 6000, 'm')

/** Saturn mass */
export const M_saturn = plusminus(5.68317e26, 2.6e22, 'kg')
/** Saturn radius (mean) */
export const R_saturn = plusminus(58232e3, 6000, 'm')

/** Uranus mass */
export const M_uranus = plusminus(8.68099e25, 4.0e21, 'kg')
/** Uranus radius (mean) */
export const R_uranus = plusminus(25362e3, 7000, 'm')

/** Neptune mass */
export const M_neptune = plusminus(1.024092e26, 4.8e21, 'kg')
/** Neptune radius (mean) */
export const R_neptune = plusminus(24622e3, 19000, 'm')

// ============================================
// Stellar and Galactic Constants
// ============================================

/** Distance to Proxima Centauri (nearest star) - 1.302 pc */
export const d_proxima = plusminus(4.0175e16, 9.3e12, 'm')

/** Distance to Sirius - 2.64 pc */
export const d_sirius = plusminus(8.15e16, 3.1e14, 'm')

/** Number of stars in the Milky Way (highly uncertain) */
export const milky_way_stars = lognormal(100e9, 400e9)

/** Milky Way diameter - 26.8 kpc */
export const milky_way_diameter = plusminus(8.27e20, 3.4e19, 'm')

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

// Common time conversion constants (useful for Fermi estimation)
/** Seconds per minute (exact) */
export const seconds_per_minute = new Quantity(60)
/** Seconds per hour (exact) */
export const seconds_per_hour = new Quantity(3600)
/** Seconds per day (exact) */
export const seconds_per_day = new Quantity(86400)
/** Seconds per year (approx - based on 365.2425 day Gregorian average) */
export const seconds_per_year = new Quantity(31556952)
/** Minutes per day */
export const minutes_per_day = new Quantity(1440)
/** Hours per day */
export const hours_per_day = new Quantity(24)
/** Days per year (distribution based on leap year cycle) */
export const days_per_year = weighted([365, 366], [303, 97])
/** Days per week */
export const days_per_week = new Quantity(7)
/** Weeks per year (approx) */
export const weeks_per_year = new Quantity(52.1775)

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
// Earth Geography
// ============================================

/** Earth surface area (total) */
export const earth_surface_area = new Quantity(5.1e14, 'm^2')

/** Earth land area */
export const earth_land_area = new Quantity(1.49e14, 'm^2')

/** Earth ocean area */
export const earth_ocean_area = new Quantity(3.61e14, 'm^2')

/** Earth circumference (equatorial) */
export const earth_circumference = new Quantity(4.0075e7, 'm')

// ============================================
// Human/Biology Constants
// ============================================

/** Human basal metabolic rate (at rest) */
export const human_basal_power = plusminus(80, 10, 'W')

/** Human power output during exercise */
export const human_active_power = plusminus(400, 100, 'W')

/** Human body temperature (core) */
export const human_body_temperature = plusminus(310, 1, 'K')

/** Human blood volume (adult) */
export const human_blood_volume = plusminus(5, 0.5, 'liter')

/** Human daily caloric intake (global average, in kilocalories) */
export const human_caloric_intake = plusminus(2000, 500)

/** Human life expectancy (global average, 2024) */
export const human_lifespan = plusminus(73, 10, 'year')

// ============================================
// Population (time-varying estimates, 2024)
// ============================================

/** World population (2024 estimate) */
export const world_population = plusminus(8.2e9, 0.1e9)

/** US population (2024 estimate) */
export const us_population = plusminus(335e6, 5e6)

// ============================================
// Material Densities
// ============================================

/** Density of steel (mild/carbon) */
export const rho_steel = plusminus(7850, 100, 'kg/m^3')

/** Density of aluminum */
export const rho_aluminum = plusminus(2700, 50, 'kg/m^3')

/** Density of concrete */
export const rho_concrete = plusminus(2400, 200, 'kg/m^3')

/** Density of wood (average) */
export const rho_wood = plusminus(600, 200, 'kg/m^3')

/** Density of air (at STP) */
export const rho_air = plusminus(1.225, 0.01, 'kg/m^3')

/** Density of copper */
export const rho_copper = plusminus(8960, 50, 'kg/m^3')

/** Density of gold */
export const rho_gold = plusminus(19300, 100, 'kg/m^3')

/** Density of ice */
export const rho_ice = plusminus(917, 10, 'kg/m^3')

// ============================================
// Energy Densities (gravimetric)
// ============================================

/** Energy density of gasoline */
export const energy_density_gasoline = plusminus(46e6, 2e6, 'J/kg')

/** Energy density of diesel */
export const energy_density_diesel = plusminus(45e6, 2e6, 'J/kg')

/** Energy density of coal */
export const energy_density_coal = plusminus(24e6, 4e6, 'J/kg')

/** Energy density of hydrogen */
export const energy_density_hydrogen = plusminus(120e6, 5e6, 'J/kg')

/** Energy density of lithium-ion batteries */
export const energy_density_lithium_battery = plusminus(0.9e6, 0.3e6, 'J/kg')

/** Energy density of TNT */
export const energy_density_tnt = plusminus(4.184e6, 0.1e6, 'J/kg')

/** Energy density of uranium-235 (fission) */
export const energy_density_uranium = plusminus(8.1e13, 0.5e13, 'J/kg')

/** Kilocalorie (food calorie) in joules */
export const calorie = new Quantity(4184, 'J')
export const kcal = calorie

// ============================================
// Economic Constants (2024 estimates)
// ============================================

/** US GDP (2024, nominal, in USD) */
export const us_gdp = plusminus(28.8e12, 0.5e12)

/** World GDP (2024, nominal, in USD) */
export const world_gdp = plusminus(105e12, 5e12)

/** US median household income (2024, in USD) */
export const us_median_income = plusminus(80000, 5000)

/** US federal minimum wage (per hour, in USD) */
export const us_minimum_wage = new Quantity(7.25)

/** US national debt (2024, in USD) */
export const us_national_debt = plusminus(35e12, 1e12)

/** S&P 500 total market cap (2024, in USD) */
export const sp500_market_cap = plusminus(50e12, 5e12)

/** Bitcoin market cap (2024, highly variable, in USD) */
export const bitcoin_market_cap = lognormal(0.5e12, 2e12)

// ============================================
// Computing Constants (2024 estimates)
// ============================================

/** Moore's law doubling time (historically ~18-24 months) */
export const moores_law_doubling = plusminus(20, 4, 'month')

/** Cost per GB of SSD storage (2024, in USD) */
export const cost_per_gb_ssd = plusminus(0.08, 0.02)

/** Cost per GB of HDD storage (2024, in USD) */
export const cost_per_gb_hdd = plusminus(0.02, 0.005)

/** Cost per GB of cloud storage per month (2024, in USD) */
export const cost_per_gb_cloud = plusminus(0.02, 0.01)

/** Transistors in a modern CPU (2024, high-end) */
export const cpu_transistors = lognormal(10e9, 100e9)

/** Transistors in a modern GPU (2024, high-end) */
export const gpu_transistors = lognormal(50e9, 200e9)

/** Global internet users (2024) */
export const internet_users = plusminus(5.4e9, 0.2e9)

/** Google searches per day (2024 estimate) */
export const google_searches_per_day = plusminus(8.5e9, 1e9)

/** Global data created per day (2024, in bytes) */
export const data_created_per_day = lognormal(300e18, 500e18)

/** Average smartphone storage (2024, in bytes) */
export const smartphone_storage = lognormal(64e9, 256e9)

/** Global email traffic per day (2024) */
export const emails_per_day = plusminus(350e9, 50e9)

/** Average webpage size (2024, in bytes) */
export const webpage_size = plusminus(2.5e6, 1e6)

/** Speed of light latency per km (in seconds) */
export const fiber_latency_per_km = new Quantity(5e-6, 's')

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
  m_e, m_p, m_n, m_muon, m_tau,
  electron_mass: m_e, proton_mass: m_p, neutron_mass: m_n,
  muon_mass: m_muon, tau_mass: m_tau,
  // Magnetic moments and magnetons
  muon_magnetic_moment, proton_magnetic_moment, electron_magnetic_moment,
  neutron_magnetic_moment, deuteron_magnetic_moment,
  bohr_magneton, mu_B, nuclear_magneton, mu_N,
  // Compton wavelengths
  lambda_C, compton_wavelength, lambda_C_p, lambda_C_n,
  // Derived
  sigma, stefan_boltzmann, epsilon0, mu0, R, gas_constant,
  // Astronomical - Solar system
  AU, ly, pc, M_sun, R_sun, L_sun, M_earth, R_earth, M_moon, R_moon, solar_constant,
  // Planetary
  M_mercury, R_mercury, M_venus, R_venus, M_mars, R_mars,
  M_jupiter, R_jupiter, M_saturn, R_saturn, M_uranus, R_uranus, M_neptune, R_neptune,
  // Planetary aliases
  mercury_mass: M_mercury, mercury_radius: R_mercury,
  venus_mass: M_venus, venus_radius: R_venus,
  mars_mass: M_mars, mars_radius: R_mars,
  jupiter_mass: M_jupiter, jupiter_radius: R_jupiter,
  saturn_mass: M_saturn, saturn_radius: R_saturn,
  uranus_mass: M_uranus, uranus_radius: R_uranus,
  neptune_mass: M_neptune, neptune_radius: R_neptune,
  // Stellar and galactic
  d_proxima, d_sirius, milky_way_stars, milky_way_diameter,
  // User-friendly astronomical aliases
  earth_mass: M_earth, sun_mass: M_sun, moon_mass: M_moon,
  earth_radius: R_earth, sun_radius: R_sun, moon_radius: R_moon,
  sun_luminosity: L_sun,
  // Time
  year, yr, month, day, hour, hr, minute, min, week,
  seconds_per_minute, seconds_per_hour, seconds_per_day, seconds_per_year,
  minutes_per_day, hours_per_day, days_per_year, days_per_week, weeks_per_year,
  // Everyday
  atm, T0, rho_water,
  // Earth geography
  earth_surface_area, earth_land_area, earth_ocean_area, earth_circumference,
  // Human/biology
  human_basal_power, human_active_power, human_body_temperature,
  human_blood_volume, human_caloric_intake, human_lifespan,
  // Population
  world_population, us_population,
  // Material densities
  rho_steel, rho_aluminum, rho_concrete, rho_wood, rho_air,
  rho_copper, rho_gold, rho_ice,
  // Energy densities
  energy_density_gasoline, energy_density_diesel, energy_density_coal,
  energy_density_hydrogen, energy_density_lithium_battery,
  energy_density_tnt, energy_density_uranium,
  calorie, kcal,
  // Economic
  us_gdp, world_gdp, us_median_income, us_minimum_wage,
  us_national_debt, sp500_market_cap, bitcoin_market_cap,
  // Computing
  moores_law_doubling, cost_per_gb_ssd, cost_per_gb_hdd, cost_per_gb_cloud,
  cpu_transistors, gpu_transistors, internet_users, google_searches_per_day,
  data_created_per_day, smartphone_storage, emails_per_day, webpage_size,
  fiber_latency_per_km,
}

export default constants
