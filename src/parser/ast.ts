/**
 * Abstract Syntax Tree node types for NeoFermi
 */

// Source location info from peggy parser
export interface SourceLocation {
  start: { offset: number; line: number; column: number }
  end: { offset: number; line: number; column: number }
}

export type ASTNode =
  | ProgramNode
  | AssignmentNode
  | FunctionDefNode
  | LetBindingNode
  | IfExprNode
  | BinaryOpNode
  | UnaryOpNode
  | RangeNode
  | UniformNode
  | NormalNode
  | BetaOfNode
  | BetaAgainstNode
  | WeightedSetNode
  | PercentTwiddleNode
  | DbTwiddleNode
  | ConversionNode
  | FunctionCallNode
  | NumberNode
  | SigFigNumberNode
  | IdentifierNode
  | UnitNode

export interface ProgramNode {
  type: 'Program'
  statements: ASTNode[]
}

export interface AssignmentNode {
  type: 'Assignment'
  name: string
  value: ASTNode
}

export interface FunctionDefNode {
  type: 'FunctionDef'
  name: string
  params: string[]
  body: ASTNode
}

export interface LetBindingNode {
  type: 'LetBinding'
  name: string
  value: ASTNode
  body: ASTNode
}

export interface IfExprNode {
  type: 'IfExpr'
  condition: ASTNode
  thenBranch: ASTNode
  elseBranch: ASTNode
}

export interface BinaryOpNode {
  type: 'BinaryOp'
  op: '+' | '-' | '*' | '/' | '^' | '>' | '<' | '>=' | '<=' | '==' | '!='
  left: ASTNode
  right: ASTNode
}

export interface UnaryOpNode {
  type: 'UnaryOp'
  op: '-'
  value: ASTNode
}

export interface RangeNode {
  type: 'Range'
  left: ASTNode
  right: ASTNode
  unit: UnitNode | null
}

export interface UniformNode {
  type: 'Uniform'
  left: ASTNode
  right: ASTNode
  unit: UnitNode | null
}

export interface NormalNode {
  type: 'Normal'
  mean: ASTNode
  sigma: ASTNode
  unit: UnitNode | null
}

export interface BetaOfNode {
  type: 'BetaOf'
  successes: ASTNode
  total: ASTNode
}

export interface BetaAgainstNode {
  type: 'BetaAgainst'
  successes: ASTNode
  failures: ASTNode
}

export interface WeightedSetEntry {
  value: number
  weight: number
}

export interface WeightedSetNode {
  type: 'WeightedSet'
  entries: WeightedSetEntry[]
  unit: UnitNode | null
}

export interface PercentTwiddleNode {
  type: 'PercentTwiddle'
  value: number
}

export interface DbTwiddleNode {
  type: 'DbTwiddle'
  value: number
}

export interface ConversionNode {
  type: 'Conversion'
  value: ASTNode
  unit: UnitNode
}

export interface FunctionCallNode {
  type: 'FunctionCall'
  name: string
  args: ASTNode[]
}

export interface NumberNode {
  type: 'Number'
  value: number
  unit: UnitNode | null
}

export interface SigFigNumberNode {
  type: 'SigFigNumber'
  raw: string // Raw string representation for sig fig analysis
  unit: UnitNode | null
}

export interface IdentifierNode {
  type: 'Identifier'
  name: string
}

export interface UnitNode {
  type: 'Unit'
  name?: string
  custom?: boolean
  special?: boolean // For special conversions like 'SI'
  // For compound units like kg/m^3
  numerator?: UnitNode
  denominator?: UnitNode
  // For powered units like m^2
  unit?: UnitNode
  power?: number
}
