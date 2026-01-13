/**
 * Evaluator for NeoFermi AST
 *
 * Takes an AST and evaluates it to Quantity objects
 */

import type { ASTNode, UnitNode } from './ast.js'
import { Quantity } from '../core/Quantity.js'
import * as distributions from '../distributions/index.js'
import * as physicalConstants from '../constants/index.js'
import { createUnit } from '../core/unitUtils.js'

export class EvaluationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EvaluationError'
  }
}

export class Evaluator {
  private variables: Map<string, Quantity> = new Map()
  private functions: Map<string, Function> = new Map()

  constructor() {
    // Register built-in functions
    this.functions.set('to', distributions.to)
    this.functions.set('lognormal', distributions.lognormal)
    this.functions.set('normal', distributions.normal)
    this.functions.set('uniform', distributions.uniform)
    this.functions.set('outof', distributions.outof)
    this.functions.set('gamma', distributions.gamma)
    this.functions.set('plusminus', distributions.plusminus)
    this.functions.set('percent', distributions.percent)
    this.functions.set('db', distributions.db)

    // Register physical constants
    this.registerPhysicalConstants()
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
        if (!variable) {
          throw new EvaluationError(`Undefined variable: ${node.name}`)
        }
        return variable

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
          throw new EvaluationError('Exponent cannot be a distribution')
        }
        const exponent = typeof right.value === 'number' ? right.value : right.value[0]
        return left.pow(exponent)
      default:
        throw new EvaluationError(`Unknown operator: ${node.op}`)
    }
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

    // Determine trailing unit from the range syntax
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
          `Incompatible units in range: ${left.unit} and ${right.unit}`
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
    const func = this.functions.get(node.name)
    if (!func) {
      throw new EvaluationError(`Unknown function: ${node.name}`)
    }

    const args = node.args.map((arg) => {
      const result = this.evaluate(arg)
      if (!result) {
        throw new EvaluationError('Function argument evaluated to null')
      }
      return result
    })

    // Convert Quantity arguments to raw values for distribution functions
    const rawArgs = args.map((arg) => {
      if (arg.isScalar()) {
        return arg.value
      }
      // For distributions, pass the mean (or could pass the whole Quantity)
      return arg.mean()
    })

    try {
      return func(...rawArgs) as Quantity
    } catch (error) {
      throw new EvaluationError(
        `Error calling function ${node.name}: ${(error as Error).message}`
      )
    }
  }

  private evaluateNumber(node: ASTNode & { type: 'Number' }): Quantity {
    const unitStr = node.unit ? this.evaluateUnit(node.unit) : undefined
    return new Quantity(node.value, unitStr)
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
          throw new EvaluationError(
            `Unknown unit: ${unitNode.name}. Use '${unitNode.name} for custom units.`
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

  clearVariables(): void {
    this.variables.clear()
  }

  reset(): void {
    this.variables.clear()
    // Re-register physical constants after reset
    this.registerPhysicalConstants()
  }
}
