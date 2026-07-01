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
import { createUnit, getKnownUnitNames, ensureLabelUnitRegistered } from '../core/unitUtils.js'
import { SCALE_WORDS } from '../core/scaleWords.js'
import { findSimilar, formatSuggestion } from './suggestions.js'
import { parseSigFigs } from '../core/sigfigs.js'

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

// Functions from src/functions/ take Quantity arguments directly; the
// distribution constructors registered below take raw numbers instead. Both
// lists are derived from a single source so they can't drift.
const MATH_FUNCTION_NAMES = new Set(Object.keys(mathFunctions))

/**
 * Float equality for `==`/`!=`: relative tolerance, so small magnitudes
 * (electron vs proton mass, both ~1e-27 kg) don't spuriously compare equal
 * the way an absolute epsilon would.
 */
function approxEqual(a: number, b: number): boolean {
  return a === b || Math.abs(a - b) <= 1e-9 * Math.max(Math.abs(a), Math.abs(b))
}

// The physical-constants module exports only `Quantity` values (plus aliases),
// so the name → Quantity map is just its namespace, reflected at load time.
const PHYSICAL_CONSTANTS: Record<string, Quantity> = Object.fromEntries(
  Object.entries(physicalConstants).filter(
    (entry): entry is [string, Quantity] => entry[1] instanceof Quantity,
  ),
)
const CONSTANT_NAMES: string[] = Object.keys(PHYSICAL_CONSTANTS)

// Calling conventions for the distribution constructors registered in the
// Evaluator. The grammar only produces numeric arguments, so the trailing
// unitString/p/n parameters of the TS signatures are not reachable from the
// language — without an arity check, an extra numeric argument lands in the
// unitString slot and dies with an internal TypeError. `pair` marks the
// two-argument same-dimension families whose arguments get unit-aligned
// before the call ('a'/'b' = which argument's unit wins).
// `deltaB` marks forms whose second argument is a *difference* (a sigma), so
// unit alignment must ignore affine offsets: ±5 degC is a spread of 9 degF.
const DIST_CALL_SPECS: Record<
  string,
  { minArgs: number; maxArgs: number; pair?: 'a' | 'b'; deltaB?: boolean }
> = {
  to: { minArgs: 2, maxArgs: 2, pair: 'b' },
  lognormal: { minArgs: 2, maxArgs: 2, pair: 'b' },
  normal: { minArgs: 2, maxArgs: 2, pair: 'b' },
  uniform: { minArgs: 2, maxArgs: 2, pair: 'b' },
  plusminus: { minArgs: 2, maxArgs: 2, pair: 'a', deltaB: true },
  outof: { minArgs: 2, maxArgs: 2 },
  gamma: { minArgs: 1, maxArgs: 2 },
  percent: { minArgs: 1, maxArgs: 1 },
  db: { minArgs: 1, maxArgs: 1 },
  poisson: { minArgs: 1, maxArgs: 1 },
  exponential: { minArgs: 1, maxArgs: 1 },
  binomial: { minArgs: 2, maxArgs: 2 },
}

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
  // One frame per active user-function call. Name lookup sees the innermost
  // frame plus globals — never a caller's parameters (no dynamic scoping).
  private localScopes: Array<Map<string, Quantity>> = []

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

    // Register math functions (these take Quantity objects directly)
    for (const [name, fn] of Object.entries(mathFunctions)) {
      this.functions.set(name, fn as Function)
    }

    // Register physical constants
    this.registerPhysicalConstants()
  }

  private registerPhysicalConstants(): void {
    for (const [name, value] of Object.entries(PHYSICAL_CONSTANTS)) {
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
        // Store user-defined function. A definition produces no value, so a
        // document ending in `f(x) = ...` renders nothing rather than a stray 0.
        this.userFunctions.set(node.name, {
          params: node.params,
          body: node.body
        })
        return null

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

      case 'Date':
        return this.evaluateDate(node)

      case 'Identifier':
        const localScope = this.localScopes[this.localScopes.length - 1]
        const variable = localScope?.get(node.name) ?? this.variables.get(node.name)
        if (variable) {
          return variable
        }
        // Try to interpret as a bare unit (e.g., "mile" means "1 mile")
        try {
          return new Quantity(1, node.name)
        } catch {
          // Suggest similar variable/constant names
          const allNames = [
            ...(localScope?.keys() ?? []),
            ...this.variables.keys(),
            ...CONSTANT_NAMES,
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
        // Exponent must be a dimensionless scalar number
        if (right.isDistribution()) {
          throw new EvaluationError('Exponent cannot be a distribution', (node as any).location)
        }
        if (right.unit.toString() !== '') {
          throw new EvaluationError(
            `Exponent must be dimensionless, got ${right.unit}`,
            (node as any).location
          )
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
        return this.compareQuantities(left, right, approxEqual)
      case '!=':
        return this.compareQuantities(left, right, (a, b) => !approxEqual(a, b))

      default:
        throw new EvaluationError(`Unknown operator: ${node.op}`)
    }
  }

  private compareQuantities(
    left: Quantity,
    right: Quantity,
    compareFn: (a: number, b: number) => boolean
  ): Quantity {
    // Align the right operand to the left's unit so `5 m > 50 cm` compares
    // 5 vs 0.5, not 5 vs 50. (toParticles() returns raw stored values.)
    if (!left.unit.equalBase(right.unit)) {
      throw new EvaluationError(
        `Cannot compare quantities with incompatible units: ${left.unit} and ${right.unit}`
      )
    }
    const leftUnitStr = left.unit.toString()
    const rightUnitStr = right.unit.toString()
    if (leftUnitStr !== '') {
      if (rightUnitStr !== leftUnitStr) right = right.to(leftUnitStr)
    } else if (rightUnitStr !== '') {
      // Left is bare dimensionless but right carries a value-bearing unit
      // (dozen, feet/mm): collapse it so `10 > 1 dozen` compares 10 vs 12.
      right = right.toSI()
    }

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

    // Bind into the innermost call frame when one is active so the let can
    // shadow a function parameter (`f(x) = let x = 2 in x`); otherwise bind
    // globally as before. Restore the previous value on exit either way.
    const target = this.localScopes[this.localScopes.length - 1] ?? this.variables
    const hadPrevious = target.has(node.name)
    const previousValue = target.get(node.name)

    target.set(node.name, boundValue)

    try {
      // Evaluate the body with the binding in scope
      const result = this.evaluate(node.body)
      if (!result) {
        throw new EvaluationError('Let binding body evaluated to null')
      }
      return result
    } finally {
      // Restore the previous value (or delete if there wasn't one)
      if (hadPrevious) {
        target.set(node.name, previousValue!)
      } else {
        target.delete(node.name)
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
    let elseResult = this.evaluate(node.elseBranch)
    if (!thenResult || !elseResult) {
      throw new EvaluationError('If branch evaluated to null')
    }

    // Align the else branch to the then branch's unit when both carry one, so
    // `if c then 1 m else 50 cm` yields metres throughout instead of mixing
    // raw 1 with raw 50. Incompatible dimensions are an error.
    const thenUnitStr = thenResult.unit.toString()
    const elseUnitStr = elseResult.unit.toString()
    if (thenUnitStr !== '' && elseUnitStr !== '') {
      if (!thenResult.unit.equalBase(elseResult.unit)) {
        throw new EvaluationError(
          `Cannot combine if-branches with incompatible units: ${thenResult.unit} and ${elseResult.unit}`
        )
      }
      if (elseUnitStr !== thenUnitStr) elseResult = elseResult.to(thenUnitStr)
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

    // Result is in the then branch's unit (or the else branch's if then is dimensionless)
    const unitStr = thenUnitStr || elseUnitStr
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

    // "100 to 200 million [UNIT]": the scale word attaches to the right bound
    // but the user means it for both. Scale the left; right already has it
    // applied. Skip when the left has its own multiplier ("100 thousand to 1
    // million") to avoid double-applying.
    const rightMultiplier = this.getNumberNodeMultiplier(node.right)
    const leftMultiplier = this.getNumberNodeMultiplier(node.left)
    if (!leftHasUnit && leftMultiplier === null && rightMultiplier !== null) {
      const scaledLeft = leftVal * rightMultiplier
      if (rightHasUnit) {
        return distributions.to(scaledLeft, rightVal, right.unit.toString())
      }
      return distributions.to(scaledLeft, rightVal)
    }

    // Trailing token on a Range AST (e.g. `1 to 10 million`) is parsed as a
    // unit node. If it's actually a scale word, apply it to both bounds.
    let trailingMultiplier: number | null = null
    if (node.unit && node.unit.name && !node.unit.custom) {
      trailingMultiplier = SCALE_WORDS[node.unit.name] ?? null
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

    // A converted bound may itself be a distribution — collapse to its mean
    // (matching how leftVal/rightVal were extracted), never pass `.value` raw:
    // an array would flow into Math.log() and yield an all-NaN distribution.
    const scalarOf = (q: Quantity) => (q.isScalar() ? (q.value as number) : q.mean())

    // Rule 2: Trailing unit with explicit conversion (operands may have units)
    if (trailingUnit && (leftHasUnit || rightHasUnit)) {
      const leftConverted = leftHasUnit ? left.to(trailingUnit) : new Quantity(leftVal, trailingUnit)
      const rightConverted = rightHasUnit
        ? right.to(trailingUnit)
        : new Quantity(rightVal, trailingUnit)
      return distributions.to(scalarOf(leftConverted), scalarOf(rightConverted), trailingUnit)
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
      return distributions.to(scalarOf(leftConverted), rightVal, right.unit.toString())
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

  /**
   * Shared handling for two-operand distribution forms with an optional
   * trailing unit (`a .. b [unit]`, `a ± b [unit]`). Steps:
   *  1. evaluate both operand nodes;
   *  2. if a scale word bound to only the second operand (`1 .. 2 million m`),
   *     apply it to the first operand too;
   *  3. require a common dimensional base when both operands carry units;
   *  4. resolve the output unit — trailing wins, otherwise the operand named
   *     by `prefer` (the bounds of `..` prefer the right bound; `±` prefers
   *     the mean over the sigma);
   *  5. convert both operands into that unit so mixed compatible units
   *     (`normal(1 m, 100 cm)`) compute as `1 ± 1`, not `1 ± 100`.
   * Returns the two operands as plain numbers (distributions collapse to their
   * mean) plus the resolved unit string. `label` names the form for errors.
   */
  private resolveBinaryDistArgs(
    aNode: ASTNode,
    bNode: ASTNode,
    trailingUnit: UnitNode | null | undefined,
    label: string,
    prefer: 'a' | 'b',
    location?: SourceLocation,
    deltaB = false,
  ): { a: number; b: number; unitStr: string | undefined } {
    let a = this.evaluate(aNode)
    let b = this.evaluate(bNode)
    if (!a || !b) {
      throw new EvaluationError(`${label} parameters evaluated to null`, location)
    }

    const aMult = this.getNumberNodeMultiplier(aNode)
    const bMult = this.getNumberNodeMultiplier(bNode)
    if (a.unit.toString() === '' && aMult === null && bMult !== null) {
      // Collapse distributions to their mean — a raw array times a number is NaN.
      const aVal = a.isScalar() ? (a.value as number) : a.mean()
      a = new Quantity(aVal * bMult, b.unit.toString() || undefined)
    }

    const trailingUnitStr = trailingUnit ? this.evaluateUnit(trailingUnit) : undefined
    return this.alignDistPair(a, b, trailingUnitStr, label, prefer, location, deltaB)
  }

  /**
   * Steps 3-5 of resolveBinaryDistArgs, on already-evaluated Quantities —
   * shared with the function-call forms (`uniform(1 m, 200 cm)`) so they get
   * the same unit alignment as the infix operators.
   */
  private alignDistPair(
    a: Quantity,
    b: Quantity,
    trailingUnitStr: string | undefined,
    label: string,
    prefer: 'a' | 'b',
    location?: SourceLocation,
    deltaB = false,
  ): { a: number; b: number; unitStr: string | undefined } {
    const aUnit = a.unit.toString()
    const bUnit = b.unit.toString()
    if (aUnit !== '' && bUnit !== '' && !a.unit.equalBase(b.unit)) {
      throw new EvaluationError(`Incompatible units in ${label}: ${a.unit} and ${b.unit}`, location)
    }

    const [firstUnit, secondUnit] = prefer === 'a' ? [aUnit, bUnit] : [bUnit, aUnit]
    let unitStr: string | undefined
    if (trailingUnitStr) unitStr = trailingUnitStr
    else if (firstUnit !== '') unitStr = firstUnit
    else if (secondUnit !== '') unitStr = secondUnit

    if (unitStr) {
      if (aUnit !== '' && aUnit !== unitStr) a = a.to(unitStr)
      if (bUnit !== '' && bUnit !== unitStr) {
        b = deltaB ? this.convertDelta(b, unitStr) : b.to(unitStr)
      }
    }

    const scalar = (q: Quantity) => (q.isScalar() ? (q.value as number) : q.mean())
    return { a: scalar(a), b: scalar(b), unitStr }
  }

  /**
   * Convert `q` as a *difference* rather than an absolute value: affine
   * offsets cancel in differences, so a sigma of 5 degC is a spread of
   * 9 degF, not 41 degF. For purely linear units this equals `q.to()`.
   */
  private convertDelta(q: Quantity, targetUnit: string): Quantity {
    const converted = q.to(targetUnit)
    const offset = new Quantity(0, q.unit.toString()).to(targetUnit).value as number
    if (offset === 0) return converted
    const shifted = converted.toParticles().map((v) => v - offset)
    return new Quantity(shifted.length === 1 ? shifted[0] : shifted, targetUnit)
  }

  private evaluateUniform(node: ASTNode & { type: 'Uniform' }): Quantity {
    const { a, b, unitStr } = this.resolveBinaryDistArgs(
      node.left, node.right, node.unit, 'uniform()', 'b', (node as any).location,
    )
    return distributions.uniform(a, b, unitStr)
  }

  private evaluateNormal(node: ASTNode & { type: 'Normal' }): Quantity {
    const { a: mean, b: sigma, unitStr } = this.resolveBinaryDistArgs(
      node.mean, node.sigma, node.unit, 'normal()', 'a', (node as any).location, true,
    )
    // `mean ± sigma` is the 68% CI: 16th percentile = mean - sigma, 84th = mean + sigma.
    return distributions.normal(mean - sigma, mean + sigma, unitStr)
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

    // Converting INTO a defined custom unit (`30 kg as 'widget` after
    // `1 'widget = 5 kg`): divide by the definition and relabel.
    if (node.unit.custom && node.unit.name) {
      const customUnitDef = this.customUnits.get(node.unit.name)
      if (customUnitDef) {
        const ratio = value.divide(customUnitDef)
        if (ratio.unit.toString() !== '') {
          throw new EvaluationError(
            `Cannot convert ${value.unit} to '${node.unit.name} (= ${customUnitDef.toString().trim()}): incompatible dimensions`,
            (node as any).location
          )
        }
        ensureLabelUnitRegistered(node.unit.name)
        return new Quantity(ratio.value, node.unit.name)
      }
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
      if (MATH_FUNCTION_NAMES.has(node.name)) {
        return func(...args) as Quantity
      }

      // Distribution constructors take raw numbers and have a fixed arity
      // from the language (their unitString/p/n parameters aren't reachable).
      const spec = DIST_CALL_SPECS[node.name]
      if (spec && (args.length < spec.minArgs || args.length > spec.maxArgs)) {
        const want =
          spec.minArgs === spec.maxArgs ? `${spec.minArgs}` : `${spec.minArgs}-${spec.maxArgs}`
        throw new EvaluationError(
          `${node.name}() expects ${want} argument${spec.maxArgs === 1 ? '' : 's'}, got ${args.length}`,
          (node as any).location
        )
      }

      // The two-argument same-dimension families get unit-aligned, so
      // `uniform(1 m, 200 cm)` means [100 cm, 200 cm], not [1, 200] unitless.
      if (spec?.pair) {
        const { a, b, unitStr } = this.alignDistPair(
          args[0], args[1], undefined, `${node.name}()`, spec.pair, (node as any).location,
          spec.deltaB ?? false,
        )
        return func(a, b, unitStr) as Quantity
      }

      // The remaining constructors take dimensionless parameters — stripping
      // a unit silently would corrupt the estimate. Units can be attached to
      // the result instead: `poisson(10) per hour`.
      if (spec) {
        for (const arg of args) {
          if (arg.unit.toString() !== '') {
            throw new EvaluationError(
              `${node.name}() takes dimensionless arguments, got ${arg.unit}. ` +
                `Attach units to the result instead, e.g. \`${node.name}(...) ${arg.unit}\``,
              (node as any).location
            )
          }
        }
      }

      const rawArgs = args.map((arg) => {
        if (arg.isScalar()) {
          return arg.value
        }
        // For distributions, pass the mean
        return arg.mean()
      })

      return func(...rawArgs) as Quantity
    } catch (error) {
      // A nested EvaluationError already carries its own message and location —
      // re-wrapping would double-append " at line N, column M".
      if (error instanceof EvaluationError) throw error
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

    // Bind arguments into a fresh call frame. Binding into the shared
    // variables map would leak parameters into callees (dynamic scoping):
    // `g(y) = w + y; f(w) = g(1)` must not let g read f's `w`.
    const frame = new Map<string, Quantity>()
    for (let i = 0; i < func.params.length; i++) {
      frame.set(func.params[i], argValues[i])
    }

    this.localScopes.push(frame)
    try {
      const result = this.evaluate(func.body)
      if (!result) {
        throw new EvaluationError('Function body evaluated to null')
      }
      return result
    } finally {
      this.localScopes.pop()
    }
  }

  private evaluateNumber(node: ASTNode & { type: 'Number' }): Quantity {
    const scaleFactor = node.scaleWord ? SCALE_WORDS[node.scaleWord] : 1
    const scaledValue = node.value * scaleFactor

    if (node.unit?.custom && node.unit?.name) {
      const customUnitDef = this.customUnits.get(node.unit.name)
      if (customUnitDef) {
        return customUnitDef.multiply(new Quantity(scaledValue))
      }
      ensureLabelUnitRegistered(node.unit.name)
      return new Quantity(scaledValue, node.unit.name)
    }

    // Power-wrapped custom unit (`3 'widget^2`): expand a definition if one
    // exists — falling through would silently treat it as a bare label.
    if (node.unit?.type === 'power' && node.unit.unit?.custom && node.unit.unit.name) {
      const customUnitDef = this.customUnits.get(node.unit.unit.name)
      if (customUnitDef) {
        return customUnitDef.pow(node.unit.power!).multiply(new Quantity(scaledValue))
      }
    }

    // Short-form scale words (K/M/B/T) parse as identifiers and land here.
    // Only applies when no long-form scaleWord was captured.
    if (!node.scaleWord && node.unit && node.unit.name && !node.unit.custom) {
      const multiplier = SCALE_WORDS[node.unit.name]
      if (multiplier !== undefined) {
        return new Quantity(node.value * multiplier)
      }
    }

    const unitStr = node.unit ? this.evaluateUnit(node.unit) : undefined
    return new Quantity(scaledValue, unitStr)
  }

  /**
   * If the node is a Number literal with a scale word (as either its own
   * grammar slot or a bare identifier in the unit slot), return that
   * multiplier. Returns null for any other node shape.
   */
  private getNumberNodeMultiplier(node: ASTNode): number | null {
    if (node.type !== 'Number') return null
    if (node.scaleWord) return SCALE_WORDS[node.scaleWord]
    if (!node.unit?.name || node.unit.custom) return null
    return SCALE_WORDS[node.unit.name] ?? null
  }

  private evaluateDate(node: ASTNode & { type: 'Date' }): Quantity {
    // JS parses `YYYY-MM-DD` as UTC midnight but `YYYY-MM-DDThh:mm` (no
    // offset) as *local* time — mixing the two in subtraction would be off by
    // the local UTC offset. Pin the time-bearing form to UTC by appending `Z`.
    const iso = node.hasTime ? node.iso + 'Z' : node.iso
    const ms = Date.parse(iso)
    if (Number.isNaN(ms)) {
      throw new EvaluationError(`Invalid date literal: #${node.iso}#`)
    }
    // Store dates as days-since-epoch in unit `day`. Date subtraction then
    // reduces to ordinary Quantity subtraction (days − days → duration in days).
    return new Quantity(ms / 86_400_000, 'day')
  }

  private evaluateSigFigNumber(node: ASTNode & { type: 'SigFigNumber' }): Quantity {
    const unitStr = node.unit ? this.evaluateUnit(node.unit) : undefined
    const { value, uncertainty } = parseSigFigs(node.raw)
    // Represent the implied precision as a uniform on [value ± uncertainty].
    return distributions.uniform(value - uncertainty, value + uncertainty, unitStr)
  }

  private evaluateUnit(unitNode: UnitNode): string {
    // Custom unit with tick - register as label unit if not defined
    if (unitNode.custom && unitNode.name) {
      ensureLabelUnitRegistered(unitNode.name)
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
    const builtInNames = new Set(CONSTANT_NAMES)
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
