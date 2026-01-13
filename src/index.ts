/**
 * NeoFermi - Monte Carlo calculator for Fermi estimation
 *
 * A TypeScript library for order of magnitude calculations with
 * uncertainty propagation and dimensional analysis.
 */

// Core
export { Quantity, type Value } from './core/Quantity.js'

// Configuration
export { DEFAULT_SAMPLE_COUNT, DEFAULT_CONFIDENCE } from './config.js'

// Core distributions
export { lognormal } from './distributions/lognormal.js'
export { normal, plusminus } from './distributions/normal.js'
export { uniform } from './distributions/uniform.js'
export { outof, against, beta } from './distributions/beta.js'
export { gamma } from './distributions/gamma.js'

// Convenience functions
export { to, percent, db } from './distributions/convenience.js'

// Utility functions
export { erf, erfinv, factor, randn, rand } from './utils/math.js'

// Parser
export { parse, parseToAST, isValidSyntax, Evaluator, EvaluationError } from './parser/index.js'
export type { ASTNode } from './parser/ast.js'

// Visualization
export {
  visualize,
  createDotplotCanvas,
  createHistogramCanvas,
  calculateDotplotData,
  calculateHistogramData,
  renderDotplot,
  renderHistogram,
  type VisualizationType,
  type DotplotOptions,
  type DotplotData,
  type HistogramOptions,
  type HistogramData,
} from './visualization/index.js'

// Physical constants
export * as constants from './constants/index.js'
export {
  // Mathematical
  e, euler, pi, tau, googol,
  // SI Defining (exact)
  c, speed_of_light, h, hbar, q, elementary_charge,
  k, kB, boltzmann, NA, avogadro, g,
  // Measured
  G, alpha, m_e, m_p, m_n, u, amu,
  a0, bohr_radius, r_e, classical_electron_radius, R_inf,
  thomson_cross_section, planck_temperature,
  // Magnetic moments
  muon_magnetic_moment, proton_magnetic_moment,
  electron_magnetic_moment, neutron_magnetic_moment,
  // Derived
  sigma, stefan_boltzmann, b, wien_displacement, epsilon0, mu0, R, gas_constant,
  // Astronomical
  AU, ly, pc, M_sun, R_sun, L_sun, M_earth, R_earth, M_moon, solar_constant,
  // Time
  year, yr, month, day, hour, hr, minute, min, week,
  // Everyday
  atm, T0, rho_water,
} from './constants/index.js'
