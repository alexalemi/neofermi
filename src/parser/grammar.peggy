/*
 * NeoFermi Grammar
 *
 * A grammar for order-of-magnitude calculations with uncertainty and units
 */

{
  // Helper to create AST nodes
  function node(type, props) {
    return { type, ...props }
  }
}

// Entry point
Program
  = _ statements:StatementList _ { return node('Program', { statements }) }

StatementList
  = head:Statement tail:(_ Statement)* {
      return [head, ...tail.map(t => t[1])]
    }
  / _ { return [] }

Statement
  = Assignment
  / Expression

Assignment
  = name:IdentifierName _ "=" _ value:Expression {
      return node('Assignment', { name, value })
    }

// Expressions with precedence

Expression
  = Range

// Range: lowest precedence (1 to 10)
Range
  = left:Additive _ "to" _ right:Additive unit:(_ Unit)? {
      return node('Range', {
        left,
        right,
        unit: unit ? unit[1] : null
      })
    }
  / Additive

// Addition and Subtraction
Additive
  = head:Multiplicative tail:(_ ("+" / "-") _ Multiplicative)* {
      return tail.reduce((left, [, op, , right]) => {
        return node('BinaryOp', { op, left, right })
      }, head)
    }

// Multiplication and Division
Multiplicative
  = head:Power tail:(_ ("*" / "/") _ Power)* {
      return tail.reduce((left, [, op, , right]) => {
        return node('BinaryOp', { op, left, right })
      }, head)
    }

// Power (exponentiation) - right associative
Power
  = base:Unary _ op:("**" / "^") _ exp:Power {
      return node('BinaryOp', { op: '^', left: base, right: exp })
    }
  / Unary

// Unary operations
Unary
  = "-" _ value:Unary {
      return node('UnaryOp', { op: '-', value })
    }
  / Postfix

// Postfix operations (conversion, method calls)
Postfix
  = value:Primary conversions:(_ Conversion)* {
      return conversions.reduce((val, [, conv]) => {
        return node('Conversion', { value: val, unit: conv })
      }, value)
    }

Conversion
  = ("as" / "->") _ unit:Unit { return unit }

// Primary expressions
Primary
  = Number
  / FunctionCall
  / Identifier
  / "(" _ expr:Expression _ ")" { return expr }

// Function calls
FunctionCall
  = name:IdentifierName _ "(" _ args:ArgumentList _ ")" {
      return node('FunctionCall', { name, args })
    }

ArgumentList
  = head:Expression tail:(_ "," _ Expression)* {
      return [head, ...tail.map(t => t[3])]
    }
  / _ { return [] }

// Numbers with optional units
Number
  = value:NumericLiteral unit:(_ Unit)? {
      return node('Number', {
        value: parseFloat(value),
        unit: unit ? unit[1] : null
      })
    }

NumericLiteral
  = [0-9]+ ("." [0-9]+)? ([eE] [+-]? [0-9]+)? {
      return text()
    }

// Units
Unit
  = CustomUnit
  / CompoundUnit
  / SimpleUnit

CustomUnit
  = "'" name:IdentifierName {
      return node('Unit', { name, custom: true })
    }

CompoundUnit
  = numerator:SimpleUnit _ "/" _ denominator:UnitWithPower {
      return node('Unit', {
        type: 'compound',
        numerator,
        denominator
      })
    }

UnitWithPower
  = unit:SimpleUnit power:(_ ("^" / "**") _ NumericLiteral)? {
      if (power) {
        return node('Unit', {
          type: 'power',
          unit,
          power: parseFloat(power[3])
        })
      }
      return unit
    }

SimpleUnit
  = name:IdentifierName {
      return node('Unit', { name, custom: false })
    }

// Identifiers (returns string, not node)
IdentifierName
  = !ReservedWord $([a-zA-Z_][a-zA-Z0-9_]*)

Identifier
  = name:IdentifierName {
      return node('Identifier', { name })
    }

ReservedWord
  = ("to" / "as") ![a-zA-Z0-9_]

// Whitespace and comments
_
  = (WhiteSpace / Comment)*

WhiteSpace
  = [ \t\n\r]

Comment
  = "#" [^\n]* ("\n" / !.)

// End of file
EOF
  = !.
