/**
 * Evaluator for NeoFermi AST
 *
 * Takes an AST and evaluates it to Quantity objects
 */

import type { ASTNode, UnitNode, SourceLocation } from './ast.js'
import { Quantity } from '../core/Quantity.js'
import * as distributions from '../distributions/index.js'
import * as mathFunctions from '../functions/index.js'
import * as physicalConstants from '../constants/index.js'
import { createUnit, getKnownUnitNames } from '../core/unitUtils.js'

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  return matrix[b.length][a.length]
}

/**
 * Find similar strings from a list of candidates
 * Returns up to 3 suggestions with distance <= 3
 */
function findSimilar(target: string, candidates: string[], maxDistance = 3): string[] {
  const targetLower = target.toLowerCase()
  const scored = candidates
    .map(c => ({
      name: c,
      distance: levenshteinDistance(targetLower, c.toLowerCase())
    }))
    .filter(s => s.distance <= maxDistance && s.distance > 0)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3)
  return scored.map(s => s.name)
}

/**
 * Format a suggestion message
 */
function formatSuggestion(suggestions: string[]): string {
  if (suggestions.length === 0) return ''
  if (suggestions.length === 1) return `. Did you mean '${suggestions[0]}'?`
  return `. Did you mean ${suggestions.slice(0, -1).map(s => `'${s}'`).join(', ')} or '${suggestions[suggestions.length - 1]}'?`
}

export class EvaluationError extends Error {
  location?: SourceLocation

  constructor(message: string, location?: SourceLocation) {
    // Format message with location if available
    const locationStr = location
      ? ` at line ${location.start.line}, column ${location.start.column}`
      : ''
    super(message + locationStr)
    this.name = 'EvaluationError'
    this.location = location
  }
}

// Math functions that take Quantity objects (not raw values)
const MATH_FUNCTIONS = new Set([
  'abs', 'sign', 'floor', 'ceil', 'round', 'trunc',
  'sqrt', 'cbrt', 'exp', 'expm1', 'pow',
  'log', 'ln', 'log10', 'log2', 'log1p',
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2',
  'sinh', 'cosh', 'tanh', 'asinh', 'acosh', 'atanh',
  'min', 'max', 'hypot', 'clamp',
  'quantile', 'percentile', 'p5', 'p10', 'p25', 'median', 'p75', 'p90', 'p95', 'p99',
  'mean', 'std', 'crps', 'crps_reliability', 'crps_resolution',
  'logcrps', 'logcrps_reliability', 'logcrps_resolution',
  'dbcrps', 'dbcrps_reliability', 'dbcrps_resolution'
])

// User-defined function storage
interface UserFunction {
  params: string[]
  body: ASTNode
}

export class Evaluator {
  private variables: Map<string, Quantity> = new Map()
  private functions: Map<string, Function> = new Map()
  private userFunctions: Map<string, UserFunction> = new Map()
  private customUnits: Map<string, Quantity> = new Map()

  constructor() {
    // Register distribution functions
    this.functions.set('to', distributions.to)
    this.functions.set('lognormal', distributions.lognormal)
    this.functions.set('normal', distributions.normal)
    this.functions.set('uniform', distributions.uniform)
    this.functions.set('outof', distributions.outof)
    this.functions.set('gamma', distributions.gamma)
    this.functions.set('plusminus', distributions.plusminus)
    this.functions.set('percent', distributions.percent)
    this.functions.set('db', distributions.db)
    this.functions.set('poisson', distributions.poisson)
    this.functions.set('exponential', distributions.exponential)
    this.functions.set('binomial', distributions.binomial)

    // Register math functions (these take Quantity objects)
    this.registerMathFunctions()

    // Register physical constants
    this.registerPhysicalConstants()
  }

  private registerMathFunctions(): void {
    // Basic math
    this.functions.set('abs', mathFunctions.abs)
    this.functions.set('sign', mathFunctions.sign)
    this.functions.set('floor', mathFunctions.floor)
    this.functions.set('ceil', mathFunctions.ceil)
    this.functions.set('round', mathFunctions.round)
    this.functions.set('trunc', mathFunctions.trunc)

    // Power and roots
    this.functions.set('sqrt', mathFunctions.sqrt)
    this.functions.set('cbrt', mathFunctions.cbrt)
    this.functions.set('exp', mathFunctions.exp)
    this.functions.set('expm1', mathFunctions.expm1)
    this.functions.set('pow', mathFunctions.pow)

    // Logarithms
    this.functions.set('log', mathFunctions.log)
    this.functions.set('ln', mathFunctions.ln)
    this.functions.set('log10', mathFunctions.log10)
    this.functions.set('log2', mathFunctions.log2)
    this.functions.set('log1p', mathFunctions.log1p)

    // Trigonometry
    this.functions.set('sin', mathFunctions.sin)
    this.functions.set('cos', mathFunctions.cos)
    this.functions.set('tan', mathFunctions.tan)
    this.functions.set('asin', mathFunctions.asin)
    this.functions.set('acos', mathFunctions.acos)
    this.functions.set('atan', mathFunctions.atan)
    this.functions.set('atan2', mathFunctions.atan2)

    // Hyperbolic
    this.functions.set('sinh', mathFunctions.sinh)
    this.functions.set('cosh', mathFunctions.cosh)
    this.functions.set('tanh', mathFunctions.tanh)
    this.functions.set('asinh', mathFunctions.asinh)
    this.functions.set('acosh', mathFunctions.acosh)
    this.functions.set('atanh', mathFunctions.atanh)

    // Binary math
    this.functions.set('min', mathFunctions.min)
    this.functions.set('max', mathFunctions.max)
    this.functions.set('hypot', mathFunctions.hypot)
    this.functions.set('clamp', mathFunctions.clamp)

    // Statistical functions for distributions
    this.functions.set('quantile', mathFunctions.quantile)
    this.functions.set('percentile', mathFunctions.percentile)
    this.functions.set('p5', mathFunctions.p5)
    this.functions.set('p10', mathFunctions.p10)
    this.functions.set('p25', mathFunctions.p25)
    this.functions.set('median', mathFunctions.median)
    this.functions.set('p75', mathFunctions.p75)
    this.functions.set('p90', mathFunctions.p90)
    this.functions.set('p95', mathFunctions.p95)
    this.functions.set('p99', mathFunctions.p99)
    this.functions.set('mean', mathFunctions.mean)
    this.functions.set('std', mathFunctions.std)
    this.functions.set('crps', mathFunctions.crps)
    this.functions.set('crps_reliability', mathFunctions.crps_reliability)
    this.functions.set('crps_resolution', mathFunctions.crps_resolution)
    this.functions.set('logcrps', mathFunctions.logcrps)
    this.functions.set('logcrps_reliability', mathFunctions.logcrps_reliability)
    this.functions.set('logcrps_resolution', mathFunctions.logcrps_resolution)
    this.functions.set('dbcrps', mathFunctions.dbcrps)
    this.functions.set('dbcrps_reliability', mathFunctions.dbcrps_reliability)
    this.functions.set('dbcrps_resolution', mathFunctions.dbcrps_resolution)
  }

  private registerPhysicalConstants(): void {
    // Get all exported constants from the constants module
    const constantsMap = physicalConstants.constants
    for (const [name, value] of Object.entries(constantsMap)) {
      this.variables.set(name, value)
    }
  }

  evaluate(node: ASTNode): Quantity | null {
    switch (node.type) {
      case 'Program':
        let lastResult: Quantity | null = null
        for (const statement of node.statements) {
          lastResult = this.evaluate(statement)
        }
        return lastResult

      case 'Assignment':
        const value = this.evaluate(node.value)
        if (!value) {
          throw new EvaluationError('Assignment value evaluated to null')
        }
        this.variables.set(node.name, value)
        return value

      case 'UnitDef':
        // Define a custom unit: 1 'widget = 5 kg
        const unitValue = this.evaluate(node.value)
        if (!unitValue) {
          throw new EvaluationError('Unit definition value evaluated to null')
        }
        this.customUnits.set(node.unitName, unitValue)
        return unitValue

      case 'FunctionDef':
        // Store user-defined function
        this.userFunctions.set(node.name, {
          params: node.params,
          body: node.body
        })
        // Return a placeholder quantity (function definitions don't produce values)
        return new Quantity(0)

      case 'LetBinding':
        return this.evaluateLetBinding(node)

      case 'IfExpr':
        return this.evaluateIfExpr(node)

      case 'BinaryOp':
        return this.evaluateBinaryOp(node)

      case 'UnaryOp':
        return this.evaluateUnaryOp(node)

      case 'Range':
        return this.evaluateRange(node)

      case 'Uniform':
        return this.evaluateUniform(node)

      case 'Normal':
        return this.evaluateNormal(node)

      case 'BetaOf':
        return this.evaluateBetaOf(node)

      case 'BetaAgainst':
        return this.evaluateBetaAgainst(node)

      case 'WeightedSet':
        return this.evaluateWeightedSet(node)

      case 'PercentTwiddle':
        return distributions.percent(node.value)

      case 'DbTwiddle':
        // Positive db = precise, negative db = uncertain
        // -10db = order of magnitude, 10db = very precise
        return distributions.db(node.value)

      case 'Conversion':
        return this.evaluateConversion(node)

      case 'FunctionCall':
        return this.evaluateFunctionCall(node)

      case 'Number':
        return this.evaluateNumber(node)

      case 'SigFigNumber':
        return this.evaluateSigFigNumber(node)

      case 'Identifier':
        const variable = this.variables.get(node.name)
        if (variable) {
          return variable
        }
        // Try to interpret as a bare unit (e.g., "mile" means "1 mile")
        try {
          return new Quantity(1, node.name)
        } catch {
          // Suggest similar variable/constant names
          const allNames = [
            ...this.variables.keys(),
            ...Object.keys(physicalConstants.constants)
          ]
          const suggestions = findSimilar(node.name, allNames)
          throw new EvaluationError(
            `Undefined variable: ${node.name}${formatSuggestion(suggestions)}`,
            (node as any).location
          )
        }

      default:
        throw new EvaluationError(`Unknown node type: ${(node as any).type}`)
    }
  }

  private evaluateBinaryOp(node: ASTNode & { type: 'BinaryOp' }): Quantity {
    const left = this.evaluate(node.left)
    const right = this.evaluate(node.right)

    if (!left || !right) {
      throw new EvaluationError('Binary operation on null values')
    }

    switch (node.op) {
      case '+':
        return left.add(right)
      case '-':
        return left.subtract(right)
      case '*':
        return left.multiply(right)
      case '/':
        return left.divide(right)
      case '^':
        // Exponent must be a scalar number
        if (right.isDistribution()) {
          throw new EvaluationError('Exponent cannot be a distribution', (node as any).location)
        }
        const exponent = typeof right.value === 'number' ? right.value : right.value[0]
        return left.pow(exponent)

      // Comparison operators - return 1 (true) or 0 (false)
      // For distributions, compare element-wise and return proportion true
      case '>':
        return this.compareQuantities(left, right, (a, b) => a > b)
      case '<':
        return this.compareQuantities(left, right, (a, b) => a < b)
      case '>=':
        return this.compareQuantities(left, right, (a, b) => a >= b)
      case '<=':
        return this.compareQuantities(left, right, (a, b) => a <= b)
      case '==':
        return this.compareQuantities(left, right, (a, b) => Math.abs(a - b) < 1e-10)
      case '!=':
        return this.compareQuantities(left, right, (a, b) => Math.abs(a - b) >= 1e-10)

      default:
        throw new EvaluationError(`Unknown operator: ${node.op}`)
    }
  }

  private compareQuantities(
    left: Quantity,
    right: Quantity,
    compareFn: (a: number, b: number) => boolean
  ): Quantity {
    const leftParticles = left.toParticles()
    const rightParticles = right.toParticles()
    const maxLength = Math.max(leftParticles.length, rightParticles.length)

    // For scalars, return 1 or 0
    if (maxLength === 1) {
      return new Quantity(compareFn(leftParticles[0], rightParticles[0]) ? 1 : 0)
    }

    // For distributions, return array of 1s and 0s
    const result: number[] = new Array(maxLength)
    for (let i = 0; i < maxLength; i++) {
      const a = leftParticles[i % leftParticles.length]
      const b = rightParticles[i % rightParticles.length]
      result[i] = compareFn(a, b) ? 1 : 0
    }
    return new Quantity(result)
  }

  private evaluateUnaryOp(node: ASTNode & { type: 'UnaryOp' }): Quantity {
    const value = this.evaluate(node.value)
    if (!value) {
      throw new EvaluationError('Unary operation on null value')
    }

    switch (node.op) {
      case '-':
        // Negate by multiplying by -1
        return new Quantity(-1).multiply(value)
      default:
        throw new EvaluationError(`Unknown unary operator: ${node.op}`)
    }
  }

  private evaluateLetBinding(node: ASTNode & { type: 'LetBinding' }): Quantity {
    // Evaluate the value expression
    const boundValue = this.evaluate(node.value)
    if (!boundValue) {
      throw new EvaluationError('Let binding value evaluated to null')
    }

    // Save any existing variable with this name
    const previousValue = this.variables.get(node.name)

    // Bind the new value
    this.variables.set(node.name, boundValue)

    try {
      // Evaluate the body with the binding in scope
      const result = this.evaluate(node.body)
      if (!result) {
        throw new EvaluationError('Let binding body evaluated to null')
      }
      return result
    } finally {
      // Restore the previous value (or delete if there wasn't one)
      if (previousValue !== undefined) {
        this.variables.set(node.name, previousValue)
      } else {
        this.variables.delete(node.name)
      }
    }
  }

  private evaluateIfExpr(node: ASTNode & { type: 'IfExpr' }): Quantity {
    const condition = this.evaluate(node.condition)
    if (!condition) {
      throw new EvaluationError('If condition evaluated to null')
    }

    // For scalars, simple branching
    if (condition.isScalar()) {
      const condValue = condition.value as number
      // Truthy if non-zero
      if (condValue !== 0) {
        const result = this.evaluate(node.thenBranch)
        if (!result) throw new EvaluationError('Then branch evaluated to null')
        return result
      } else {
        const result = this.evaluate(node.elseBranch)
        if (!result) throw new EvaluationError('Else branch evaluated to null')
        return result
      }
    }

    // For distributions, evaluate both branches and select element-wise
    const thenResult = this.evaluate(node.thenBranch)
    const elseResult = this.evaluate(node.elseBranch)
    if (!thenResult || !elseResult) {
      throw new EvaluationError('If branch evaluated to null')
    }

    const condParticles = condition.toParticles()
    const thenParticles = thenResult.toParticles()
    const elseParticles = elseResult.toParticles()
    const maxLength = Math.max(condParticles.length, thenParticles.length, elseParticles.length)

    const result: number[] = new Array(maxLength)
    for (let i = 0; i < maxLength; i++) {
      const c = condParticles[i % condParticles.length]
      const t = thenParticles[i % thenParticles.length]
      const e = elseParticles[i % elseParticles.length]
      // Truthy if non-zero
      result[i] = c !== 0 ? t : e
    }

    // Determine result unit (prefer then branch)
    const unitStr = thenResult.unit.toString() || elseResult.unit.toString()
    return new Quantity(result, unitStr || undefined)
  }

  private evaluateRange(node: ASTNode & { type: 'Range' }): Quantity {
    const left = this.evaluate(node.left)
    const right = this.evaluate(node.right)

    if (!left || !right) {
      throw new EvaluationError('Range bounds evaluated to null')
    }

    // Extract scalar values (ranges work on scalars only)
    const leftVal = left.isScalar() ? (left.value as number) : left.mean()
    const rightVal = right.isScalar() ? (right.value as number) : right.mean()

    // Check if left/right have explicit units
    const leftHasUnit = left.unit && left.unit.toString() !== ''
    const rightHasUnit = right.unit && right.unit.toString() !== ''

    // Check if the right operand's ORIGINAL AST node has a dimensionless multiplier
    // This handles "100 to 200 million" where million should apply to both bounds
    // The right.value already has the multiplier applied (200e6), so we just apply to left
    if (
      !leftHasUnit &&
      !rightHasUnit &&
      (node.right as any).type === 'Number' &&
      (node.right as any).unit?.name
    ) {
      const rightMultiplier = this.getDimensionlessMultiplier((node.right as any).unit.name)
      if (rightMultiplier !== null) {
        // Right already has multiplier applied, apply it to left too
        return distributions.to(leftVal * rightMultiplier, rightVal)
      }
    }

    // Determine trailing unit from the range syntax
    // First check if the "unit" is actually a dimensionless multiplier (million, billion, etc.)
    let trailingMultiplier: number | null = null
    if (node.unit && node.unit.name && !node.unit.custom) {
      trailingMultiplier = this.getDimensionlessMultiplier(node.unit.name)
    }

    // If trailing token is a dimensionless multiplier, apply it to bounds
    if (trailingMultiplier !== null && !leftHasUnit && !rightHasUnit) {
      return distributions.to(leftVal * trailingMultiplier, rightVal * trailingMultiplier)
    }

    const trailingUnit = node.unit ? this.evaluateUnit(node.unit) : null

    // Rule 1: Trailing unit applies to both (when operands are unitless)
    if (trailingUnit && !leftHasUnit && !rightHasUnit) {
      return distributions.to(leftVal, rightVal, trailingUnit)
    }

    // Rule 2: Trailing unit with explicit conversion (operands may have units)
    if (trailingUnit && (leftHasUnit || rightHasUnit)) {
      const leftConverted = leftHasUnit ? left.to(trailingUnit) : new Quantity(leftVal, trailingUnit)
      const rightConverted = rightHasUnit
        ? right.to(trailingUnit)
        : new Quantity(rightVal, trailingUnit)
      return distributions.to(
        leftConverted.value as number,
        rightConverted.value as number,
        trailingUnit
      )
    }

    // Rule 3: Both operands have units - prefer right side's unit
    if (leftHasUnit && rightHasUnit) {
      // Check compatibility
      if (!left.unit.equalBase(right.unit)) {
        throw new EvaluationError(
          `Incompatible units in range: ${left.unit} and ${right.unit}`,
          (node as any).location
        )
      }
      // Convert left to right's unit
      const leftConverted = left.to(right.unit.toString())
      return distributions.to(
        leftConverted.value as number,
        rightVal,
        right.unit.toString()
      )
    }

    // Rule 4: Only left has unit - error
    if (leftHasUnit && !rightHasUnit) {
      throw new EvaluationError(
        'Cannot mix units and unitless in range. Use trailing unit: "1 to 10 m" not "1 m to 10"'
      )
    }

    // Rule 5: Only right has unit - treat as trailing unit
    // This handles: 1 to 10 meters (parses as 1, to, 10 meters)
    // We treat it like: 1 to 10, with trailing unit meters
    if (!leftHasUnit && rightHasUnit) {
      const targetUnit = right.unit.toString()
      return distributions.to(leftVal, rightVal, targetUnit)
    }

    // Rule 6: Both unitless (no trailing unit either)
    return distributions.to(leftVal, rightVal)
  }

  private evaluateUniform(node: ASTNode & { type: 'Uniform' }): Quantity {
    const left = this.evaluate(node.left)
    const right = this.evaluate(node.right)

    if (!left || !right) {
      throw new EvaluationError('Uniform bounds evaluated to null')
    }

    const leftVal = left.isScalar() ? (left.value as number) : left.mean()
    const rightVal = right.isScalar() ? (right.value as number) : right.mean()

    // Determine unit from trailing unit or from operands
    let unitStr: string | undefined
    if (node.unit) {
      unitStr = this.evaluateUnit(node.unit)
    } else if (right.unit && right.unit.toString() !== '') {
      unitStr = right.unit.toString()
    } else if (left.unit && left.unit.toString() !== '') {
      unitStr = left.unit.toString()
    }

    return distributions.uniform(leftVal, rightVal, unitStr)
  }

  private evaluateNormal(node: ASTNode & { type: 'Normal' }): Quantity {
    const mean = this.evaluate(node.mean)
    const sigma = this.evaluate(node.sigma)

    if (!mean || !sigma) {
      throw new EvaluationError('Normal parameters evaluated to null')
    }

    const meanVal = mean.isScalar() ? (mean.value as number) : mean.mean()
    const sigmaVal = sigma.isScalar() ? (sigma.value as number) : sigma.mean()

    // Determine unit from trailing unit or from mean
    let unitStr: string | undefined
    if (node.unit) {
      unitStr = this.evaluateUnit(node.unit)
    } else if (mean.unit && mean.unit.toString() !== '') {
      unitStr = mean.unit.toString()
    }

    // Create normal distribution: mean ± sigma represents 68% CI
    // So the 16th percentile is mean - sigma, 84th is mean + sigma
    return distributions.normal(meanVal - sigmaVal, meanVal + sigmaVal, unitStr)
  }

  private evaluateBetaOf(node: ASTNode & { type: 'BetaOf' }): Quantity {
    const successes = this.evaluate(node.successes)
    const total = this.evaluate(node.total)

    if (!successes || !total) {
      throw new EvaluationError('Beta parameters evaluated to null')
    }

    const successVal = successes.isScalar() ? (successes.value as number) : successes.mean()
    const totalVal = total.isScalar() ? (total.value as number) : total.mean()

    // outof(successes, total) creates a beta distribution
    return distributions.outof(successVal, totalVal)
  }

  private evaluateBetaAgainst(node: ASTNode & { type: 'BetaAgainst' }): Quantity {
    const successes = this.evaluate(node.successes)
    const failures = this.evaluate(node.failures)

    if (!successes || !failures) {
      throw new EvaluationError('Beta parameters evaluated to null')
    }

    const successVal = successes.isScalar() ? (successes.value as number) : successes.mean()
    const failureVal = failures.isScalar() ? (failures.value as number) : failures.mean()

    // against(successes, failures) creates a beta distribution
    return distributions.against(successVal, failureVal)
  }

  private evaluateWeightedSet(node: ASTNode & { type: 'WeightedSet' }): Quantity {
    // Extract values and weights from entries
    const values = node.entries.map((e: { value: number; weight: number }) => e.value)
    const weights = node.entries.map((e: { value: number; weight: number }) => e.weight)

    // Get unit string if present
    const unitStr = node.unit ? this.evaluateUnit(node.unit) : undefined

    return distributions.weighted(values, weights, unitStr)
  }

  private evaluateConversion(node: ASTNode & { type: 'Conversion' }): Quantity {
    const value = this.evaluate(node.value)
    if (!value) {
      throw new EvaluationError('Conversion value evaluated to null')
    }

    // Handle special SI conversion
    if (node.unit.special && node.unit.name === 'SI') {
      return value.toSI()
    }

    const targetUnit = this.evaluateUnit(node.unit)
    return value.to(targetUnit)
  }

  private evaluateFunctionCall(node: ASTNode & { type: 'FunctionCall' }): Quantity {
    // Check for user-defined function first
    const userFunc = this.userFunctions.get(node.name)
    if (userFunc) {
      return this.evaluateUserFunction(userFunc, node.args)
    }

    const func = this.functions.get(node.name)
    if (!func) {
      // Suggest similar function names
      const allFunctions = [...this.functions.keys(), ...this.userFunctions.keys()]
      const suggestions = findSimilar(node.name, allFunctions)
      throw new EvaluationError(
        `Unknown function: ${node.name}${formatSuggestion(suggestions)}`,
        (node as any).location
      )
    }

    const args = node.args.map((arg) => {
      const result = this.evaluate(arg)
      if (!result) {
        throw new EvaluationError('Function argument evaluated to null')
      }
      return result
    })

    try {
      // Math functions take Quantity objects directly
      if (MATH_FUNCTIONS.has(node.name)) {
        return func(...args) as Quantity
      }

      // Distribution functions take raw numeric values
      const rawArgs = args.map((arg) => {
        if (arg.isScalar()) {
          return arg.value
        }
        // For distributions, pass the mean
        return arg.mean()
      })

      return func(...rawArgs) as Quantity
    } catch (error) {
      throw new EvaluationError(
        `Error calling function ${node.name}: ${(error as Error).message}`,
        (node as any).location
      )
    }
  }

  private evaluateUserFunction(func: UserFunction, argNodes: ASTNode[]): Quantity {
    // Check argument count
    if (argNodes.length !== func.params.length) {
      throw new EvaluationError(
        `Function expects ${func.params.length} arguments, got ${argNodes.length}`
      )
    }

    // Evaluate arguments
    const argValues: Quantity[] = argNodes.map((arg) => {
      const result = this.evaluate(arg)
      if (!result) {
        throw new EvaluationError('Function argument evaluated to null')
      }
      return result
    })

    // Save current values of parameter names (if any exist)
    const savedValues: Map<string, Quantity | undefined> = new Map()
    for (const param of func.params) {
      savedValues.set(param, this.variables.get(param))
    }

    try {
      // Bind arguments to parameters
      for (let i = 0; i < func.params.length; i++) {
        this.variables.set(func.params[i], argValues[i])
      }

      // Evaluate the function body
      const result = this.evaluate(func.body)
      if (!result) {
        throw new EvaluationError('Function body evaluated to null')
      }
      return result
    } finally {
      // Restore previous values
      for (const [param, value] of savedValues) {
        if (value !== undefined) {
          this.variables.set(param, value)
        } else {
          this.variables.delete(param)
        }
      }
    }
  }

  private evaluateNumber(node: ASTNode & { type: 'Number' }): Quantity {
    // Check if this is a custom unit that we've defined
    if (node.unit?.custom && node.unit?.name) {
      const customUnitDef = this.customUnits.get(node.unit.name)
      if (customUnitDef) {
        // Multiply the value by the custom unit definition
        // e.g., if 1 'widget = 5 kg, then 10 'widgets = 10 * 5 kg
        return customUnitDef.multiply(new Quantity(node.value))
      }
      // Custom unit not defined - it's just a label
    }

    // Check if the "unit" is actually a dimensionless multiplier constant (million, billion, etc.)
    if (node.unit && node.unit.name && !node.unit.custom) {
      const multiplier = this.getDimensionlessMultiplier(node.unit.name)
      if (multiplier !== null) {
        return new Quantity(node.value * multiplier)
      }
    }

    const unitStr = node.unit ? this.evaluateUnit(node.unit) : undefined
    return new Quantity(node.value, unitStr)
  }

  /**
   * Check if a name is a dimensionless multiplier constant (million, billion, etc.)
   * Returns the multiplier value if it is, or null if not.
   */
  private getDimensionlessMultiplier(name: string): number | null {
    const multipliers: Record<string, number> = {
      hundred: 1e2,
      thousand: 1e3,
      million: 1e6,
      billion: 1e9,
      trillion: 1e12,
      quadrillion: 1e15,
      quintillion: 1e18,
      sextillion: 1e21,
      septillion: 1e24,
      // Also support K, M, B abbreviations
      K: 1e3,
      M: 1e6,
      B: 1e9,
      T: 1e12,
    }
    return multipliers[name] ?? null
  }

  private evaluateSigFigNumber(node: ASTNode & { type: 'SigFigNumber' }): Quantity {
    const unitStr = node.unit ? this.evaluateUnit(node.unit) : undefined
    const { value, uncertainty } = this.parseSigFigs(node.raw)

    // Create uniform distribution: [value - uncertainty, value + uncertainty]
    const low = value - uncertainty
    const high = value + uncertainty
    return distributions.uniform(low, high, unitStr)
  }

  /**
   * Parse a number string and determine its uncertainty from significant figures.
   *
   * Rules:
   * - "3.14" → 3 sig figs, uncertainty = 0.005 (half of last digit place)
   * - "130" → 2 sig figs (trailing zeros ambiguous), uncertainty = 5
   * - "130." → 3 sig figs (decimal indicates precision), uncertainty = 0.5
   * - "1.30" → 3 sig figs (trailing zero significant), uncertainty = 0.005
   * - "1.3e6" → 2 sig figs, uncertainty = 0.05e6 = 50000
   */
  private parseSigFigs(raw: string): { value: number; uncertainty: number } {
    const value = parseFloat(raw)

    // Handle scientific notation: extract mantissa and exponent
    const eMatch = raw.toLowerCase().match(/^([^e]+)e([+-]?\d+)$/)
    let mantissa = raw
    let exponent = 0

    if (eMatch) {
      mantissa = eMatch[1]
      exponent = parseInt(eMatch[2], 10)
    }

    // Determine the place value of the last significant digit
    let lastDigitPlace: number

    if (mantissa.includes('.')) {
      // Has decimal point
      const decimalIndex = mantissa.indexOf('.')
      const afterDecimal = mantissa.slice(decimalIndex + 1)

      if (afterDecimal.length === 0) {
        // Trailing decimal like "130." - precision is ones place
        lastDigitPlace = 0
      } else {
        // Normal decimal: "3.14" or "1.30"
        // Last digit is at position -(afterDecimal.length)
        lastDigitPlace = -afterDecimal.length
      }
    } else {
      // No decimal point: find last non-zero digit position
      // "130" → last sig fig is at position 1 (tens place)
      // "1300" → last sig fig is at position 2 (hundreds place)
      const reversed = mantissa.split('').reverse()
      let trailingZeros = 0
      for (const char of reversed) {
        if (char === '0') {
          trailingZeros++
        } else {
          break
        }
      }
      lastDigitPlace = trailingZeros
    }

    // Apply exponent to get actual place value
    const actualPlace = lastDigitPlace + exponent

    // Uncertainty is half of the last digit place value
    const uncertainty = 0.5 * Math.pow(10, actualPlace)

    return { value, uncertainty }
  }

  private evaluateUnit(unitNode: UnitNode): string {
    // Custom unit with tick
    if (unitNode.custom && unitNode.name) {
      return unitNode.name
    }

    // Reciprocal unit (e.g., /mile or per mile)
    if (unitNode.type === 'reciprocal' && unitNode.denominator) {
      const denom = this.evaluateUnit(unitNode.denominator)
      return `1/${denom}`
    }

    // Compound unit (e.g., kg/m^3)
    if (unitNode.numerator && unitNode.denominator) {
      const num = this.evaluateUnit(unitNode.numerator)
      const denom = this.evaluateUnit(unitNode.denominator)
      return `${num}/${denom}`
    }

    // Powered unit (e.g., m^2)
    if (unitNode.unit && unitNode.power) {
      const base = this.evaluateUnit(unitNode.unit)
      return `${base}^${unitNode.power}`
    }

    // Simple unit
    if (unitNode.name) {
      // Verify it's a known unit (unless custom)
      if (!unitNode.custom) {
        try {
          createUnit(1, unitNode.name)
        } catch {
          // Suggest similar unit names
          const suggestions = findSimilar(unitNode.name, getKnownUnitNames())
          const suggestionText = formatSuggestion(suggestions)
          throw new EvaluationError(
            `Unknown unit: ${unitNode.name}${suggestionText || `. Use '${unitNode.name} for custom units.`}`
          )
        }
      }
      return unitNode.name
    }

    throw new EvaluationError('Invalid unit node')
  }

  // Public API for REPL
  getVariable(name: string): Quantity | undefined {
    return this.variables.get(name)
  }

  setVariable(name: string, value: Quantity): void {
    this.variables.set(name, value)
  }

  getVariableNames(): string[] {
    return Array.from(this.variables.keys())
  }

  getUserVariableNames(): string[] {
    const builtInNames = new Set(Object.keys(physicalConstants.constants))
    return Array.from(this.variables.keys()).filter(name => !builtInNames.has(name))
  }

  clearVariables(): void {
    this.variables.clear()
  }

  reset(): void {
    this.variables.clear()
    this.userFunctions.clear()
    this.customUnits.clear()
    // Re-register physical constants after reset
    this.registerPhysicalConstants()
  }

  // Get user-defined function
  getUserFunction(name: string): UserFunction | undefined {
    return this.userFunctions.get(name)
  }

  // Get custom unit definition
  getCustomUnit(name: string): Quantity | undefined {
    return this.customUnits.get(name)
  }
}
