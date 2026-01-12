/**
 * NeoFermi Parser
 *
 * Parse NeoFermi DSL expressions and evaluate them
 */

import { Evaluator, EvaluationError } from './evaluator.js'
import type { ASTNode } from './ast.js'
import type { Quantity } from '../core/Quantity.js'

// Import the generated parser
// @ts-ignore - generated file
import * as parser from './generated.js'

export { Evaluator, EvaluationError }
export type { ASTNode }

/**
 * Parse and evaluate a NeoFermi expression
 *
 * @param source - The source code to parse
 * @param evaluator - Optional evaluator instance (for maintaining state)
 * @returns The result as a Quantity
 *
 * @example
 * ```ts
 * const result = parse('1 to 10 meters')
 * console.log(result.mean())  // ~5.5 meters
 * ```
 */
export function parse(source: string, evaluator?: Evaluator): Quantity | null {
  // Create evaluator if not provided
  const ev = evaluator || new Evaluator()

  try {
    // Parse the source code to AST
    const ast = parser.parse(source) as ASTNode

    // Evaluate the AST
    return ev.evaluate(ast)
  } catch (error) {
    if (error instanceof EvaluationError) {
      throw error
    }

    // Parsing error
    if ((error as any).location) {
      const location = (error as any).location
      const message = (error as any).message
      throw new Error(
        `Parse error at line ${location.start.line}, column ${location.start.column}: ${message}`
      )
    }

    throw error
  }
}

/**
 * Parse source code to AST without evaluation
 *
 * @param source - The source code to parse
 * @returns The AST
 */
export function parseToAST(source: string): ASTNode {
  try {
    return parser.parse(source) as ASTNode
  } catch (error) {
    if ((error as any).location) {
      const location = (error as any).location
      const message = (error as any).message
      throw new Error(
        `Parse error at line ${location.start.line}, column ${location.start.column}: ${message}`
      )
    }
    throw error
  }
}

/**
 * Check if source code is valid syntax (without evaluation)
 *
 * @param source - The source code to check
 * @returns true if valid, false otherwise
 */
export function isValidSyntax(source: string): boolean {
  try {
    parser.parse(source)
    return true
  } catch {
    return false
  }
}
