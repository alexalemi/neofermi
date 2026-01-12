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
