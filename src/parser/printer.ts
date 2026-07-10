/**
 * AST pretty-printer
 *
 * Re-emits a parsed expression in canonical NeoFermi syntax, so the REPL can
 * echo back its interpretation of the input (qalc-style). The optional
 * decorate hook wraps semantic parts (numbers, units, variables) — e.g. with
 * ANSI colors — mirroring the decorate option of formatQuantityConcise.
 */

import type { ASTNode, UnitNode } from './ast.js'

export type PrintPart = 'scalar' | 'unit' | 'variable'
type Decorate = (part: PrintPart, text: string) => string

const plain: Decorate = (_part, text) => text

// Binding strength, mirroring the grammar's expression hierarchy
// (grammar.peggy): comparisons are loosest, `to`-family ranges bind tighter
// than * and /, and power binds tightest. Higher = tighter.
const PREC = {
  statement: 0,
  comparison: 1,
  conversion: 2,
  additive: 3,
  multiplicative: 4,
  range: 5,
  unary: 6,
  power: 7,
  atom: 10,
} as const

const BINARY_PREC: Record<string, number> = {
  '+': PREC.additive,
  '-': PREC.additive,
  '*': PREC.multiplicative,
  '/': PREC.multiplicative,
  '^': PREC.power,
  '>': PREC.comparison,
  '<': PREC.comparison,
  '>=': PREC.comparison,
  '<=': PREC.comparison,
  '==': PREC.comparison,
  '!=': PREC.comparison,
}

export function printAST(node: ASTNode, decorate: Decorate = plain): string {
  return print(node, PREC.statement, decorate)
}

function printUnit(unit: UnitNode): string {
  switch (unit.type) {
    case 'reciprocal':
      return `/${printUnit(unit.denominator!)}`
    case 'compound':
      return `${printUnit(unit.numerator!)}/${printUnit(unit.denominator!)}`
    case 'power':
      return `${printUnit(unit.unit!)}^${unit.power}`
    default:
      return unit.custom ? `'${unit.name}` : (unit.name ?? '')
  }
}

/** Trailing ` unit` suffix (decorated), or '' when the node carries no unit. */
function unitSuffix(unit: UnitNode | null | undefined, d: Decorate): string {
  return unit ? ` ${d('unit', printUnit(unit))}` : ''
}

function print(node: ASTNode, ctx: number, d: Decorate): string {
  const paren = (text: string, prec: number) => (prec < ctx ? `(${text})` : text)

  switch (node.type) {
    case 'Program':
      return node.statements.map((s) => print(s, PREC.statement, d)).join('; ')

    case 'Assignment':
      return `${d('variable', node.name)} = ${print(node.value, PREC.statement, d)}`

    case 'UnitDef':
      return `1 ${d('unit', `'${node.unitName}`)} = ${print(node.value, PREC.statement, d)}`

    case 'FunctionDef':
      return `${d('variable', node.name)}(${node.params.map((p) => d('variable', p)).join(', ')}) = ${print(node.body, PREC.statement, d)}`

    case 'LetBinding':
      return paren(
        `let ${d('variable', node.name)} = ${print(node.value, PREC.statement, d)} in ${print(node.body, PREC.statement, d)}`,
        PREC.statement
      )

    case 'IfExpr':
      return paren(
        `if ${print(node.condition, PREC.statement, d)} then ${print(node.thenBranch, PREC.statement, d)} else ${print(node.elseBranch, PREC.statement, d)}`,
        PREC.statement
      )

    case 'BinaryOp': {
      // The grammar desugars suffix units on calls and parens (`sqrt(4) m`,
      // `(1 + 2) kg`) into `expr * 1 unit`; print them back as suffixes.
      // A suffix binds at atom level, so the left side must be an atom that
      // legally takes a suffix or get parenthesized (atoms that don't, like
      // identifiers and dates, keep the explicit `* 1 unit` form).
      if (
        node.op === '*' &&
        node.right.type === 'Number' &&
        node.right.value === 1 &&
        (node.right.unit || node.right.scaleWord) &&
        !['Identifier', 'Date', 'PercentTwiddle', 'DbTwiddle'].includes(node.left.type)
      ) {
        const scale = node.right.scaleWord ? ` ${d('scalar', node.right.scaleWord)}` : ''
        return `${print(node.left, PREC.atom, d)}${scale}${unitSuffix(node.right.unit, d)}`
      }
      const prec = BINARY_PREC[node.op] ?? PREC.additive
      // ^ is right-associative; everything else is left-associative
      const [leftCtx, rightCtx] = node.op === '^' ? [prec + 1, prec] : [prec, prec + 1]
      return paren(`${print(node.left, leftCtx, d)} ${node.op} ${print(node.right, rightCtx, d)}`, prec)
    }

    case 'UnaryOp':
      return paren(`${node.op}${print(node.value, PREC.unary, d)}`, PREC.unary)

    case 'Range':
      return paren(
        `${print(node.left, PREC.unary, d)} to ${print(node.right, PREC.unary, d)}${unitSuffix(node.unit, d)}`,
        PREC.range
      )

    case 'Uniform':
      return paren(
        `${print(node.left, PREC.unary, d)} .. ${print(node.right, PREC.unary, d)}${unitSuffix(node.unit, d)}`,
        PREC.range
      )

    case 'Normal':
      return paren(
        `${print(node.mean, PREC.unary, d)} +/- ${print(node.sigma, PREC.unary, d)}${unitSuffix(node.unit, d)}`,
        PREC.range
      )

    case 'BetaOf':
      return paren(`${print(node.successes, PREC.unary, d)} of ${print(node.total, PREC.unary, d)}`, PREC.range)

    case 'BetaAgainst':
      return paren(
        `${print(node.successes, PREC.unary, d)} against ${print(node.failures, PREC.unary, d)}`,
        PREC.range
      )

    case 'WeightedSet': {
      const entries = node.entries
        .map((e) => (e.weight === 1 ? d('scalar', String(e.value)) : `${d('scalar', String(e.value))}: ${d('scalar', String(e.weight))}`))
        .join(', ')
      return `{${entries}}${unitSuffix(node.unit, d)}`
    }

    case 'PercentTwiddle':
      return d('scalar', `${node.value}%`)

    case 'DbTwiddle':
      return d('scalar', `${node.value} db`)

    case 'Conversion':
      return paren(
        `${print(node.value, PREC.conversion, d)} as ${d('unit', printUnit(node.unit))}`,
        PREC.conversion
      )

    case 'FunctionCall':
      return `${d('variable', node.name)}(${node.args.map((a) => print(a, PREC.statement, d)).join(', ')})`

    case 'Number': {
      const scale = node.scaleWord ? ` ${d('scalar', node.scaleWord)}` : ''
      return `${d('scalar', String(node.value))}${scale}${unitSuffix(node.unit, d)}`
    }

    case 'SigFigNumber':
      return `${d('scalar', `'${node.raw}`)}${unitSuffix(node.unit, d)}`

    case 'Date':
      return d('scalar', `#${node.iso}#`)

    case 'Identifier':
      return d('variable', node.name)

    default:
      // Unreachable for well-formed ASTs; callers treat a throw as "skip echo".
      throw new Error(`printAST: unhandled node type ${(node as ASTNode).type}`)
  }
}
