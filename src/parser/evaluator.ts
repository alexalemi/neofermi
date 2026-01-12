/**
 * Evaluator for NeoFermi AST
 *
 * Takes an AST and evaluates it to Quantity objects
 */

import type { ASTNode, UnitNode } from './ast.js'
import { Quantity } from '../core/Quantity.js'
import * as distributions from '../distributions/index.js'
import { unit as createUnit } from 'mathjs'

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

      case 'Conversion':
        return this.evaluateConversion(node)

      case 'FunctionCall':
        return this.evaluateFunctionCall(node)

      case 'Number':
        return this.evaluateNumber(node)

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

    // Determine result unit based on spec rules
    const trailingUnit = node.unit ? this.evaluateUnit(node.unit) : null

    // Rule 1: Explicit trailing conversion
    if (trailingUnit) {
      const leftConverted = left.unit ? left.to(trailingUnit) : new Quantity(leftVal, trailingUnit)
      const rightConverted = right.unit
        ? right.to(trailingUnit)
        : new Quantity(rightVal, trailingUnit)
      return distributions.to(
        leftConverted.value as number,
        rightConverted.value as number,
        trailingUnit
      )
    }

    // Rule 2: Both have units - prefer right
    if (left.unit.toString() && right.unit.toString()) {
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

    // Rule 3: Only left has unit
    if (left.unit.toString() && !right.unit.toString()) {
      throw new EvaluationError(
        'Cannot mix units and unitless in range. Use trailing unit: "1 to 10 m" not "1 m to 10"'
      )
    }

    // Rule 4: Only right has unit
    if (!left.unit.toString() && right.unit.toString()) {
      throw new EvaluationError(
        'Cannot mix unitless and units in range. Use trailing unit: "1 to 10 m" not "1 to 10 m"'
      )
    }

    // Rule 5: Both unitless
    return distributions.to(leftVal, rightVal)
  }

  private evaluateConversion(node: ASTNode & { type: 'Conversion' }): Quantity {
    const value = this.evaluate(node.value)
    if (!value) {
      throw new EvaluationError('Conversion value evaluated to null')
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
}
