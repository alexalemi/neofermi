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
  c, h, hbar, e, k, kB, NA, g,           // Exact constants
  G, alpha, m_e, m_p, m_n, u, amu,       // Measured constants
  a0, r_e, R_inf,                        // Atomic constants
  sigma, b, epsilon0, mu0, R,            // Derived constants
  AU, ly, pc, M_sun, R_sun, L_sun,       // Astronomical constants
  M_earth, R_earth, M_moon,
  atm, T0, rho_water,                    // Everyday constants
} from './constants/index.js'
