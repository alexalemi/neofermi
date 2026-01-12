/**
 * Abstract Syntax Tree node types for NeoFermi
 */

export type ASTNode =
  | ProgramNode
  | AssignmentNode
  | BinaryOpNode
  | UnaryOpNode
  | RangeNode
  | ConversionNode
  | FunctionCallNode
  | NumberNode
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

export interface BinaryOpNode {
  type: 'BinaryOp'
  op: '+' | '-' | '*' | '/' | '^'
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

export interface IdentifierNode {
  type: 'Identifier'
  name: string
}

export interface UnitNode {
  type: 'Unit'
  name?: string
  custom?: boolean
  // For compound units like kg/m^3
  numerator?: UnitNode
  denominator?: UnitNode
  // For powered units like m^2
  unit?: UnitNode
  power?: number
}
