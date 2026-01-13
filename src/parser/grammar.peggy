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

// Distribution operators: lowest precedence
// Includes range (to), uniform (.., thru), normal (pm, +-, +/-), beta (of, against)
Range
  = left:Additive _ "to" _ right:Additive unit:(_ Unit)? {
      return node('Range', {
        left,
        right,
        unit: unit ? unit[1] : null
      })
    }
  / left:Additive _ (".." / "thru") _ right:Additive unit:(_ Unit)? {
      return node('Uniform', {
        left,
        right,
        unit: unit ? unit[1] : null
      })
    }
  / mean:Additive _ ("+/-" / "+-" / "pm") _ sigma:Additive unit:(_ Unit)? {
      return node('Normal', {
        mean,
        sigma,
        unit: unit ? unit[1] : null
      })
    }
  / successes:Additive _ "of" _ total:Additive {
      return node('BetaOf', {
        successes,
        total
      })
    }
  / successes:Additive _ "against" _ failures:Additive {
      return node('BetaAgainst', {
        successes,
        failures
      })
    }
  / Additive

// Addition and Subtraction
// Note: Use negative lookahead to avoid matching +- or +/- as separate operators
Additive
  = head:Multiplicative tail:(_ AddOp _ Multiplicative)* {
      return tail.reduce((left, [, op, , right]) => {
        return node('BinaryOp', { op, left, right })
      }, head)
    }

AddOp
  = "+" !"/" !"-" { return "+" }  // + but not +/ or +-
  / "-" { return "-" }

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
  = DbTwiddle    // Match signed db before unary minus can grab the sign
  / "-" _ value:Unary {
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
  = ("as" / "->") _ "SI" { return node('Unit', { name: 'SI', special: true }) }
  / ("as" / "->") _ unit:Unit { return unit }

// Primary expressions
Primary
  = WeightedSet
  / SigFigNumber
  / PercentTwiddle
  / Number
  / FunctionCall
  / Identifier
  / "(" _ expr:Expression _ ")" { return expr }

// Twiddle operators: 5% means percent(5), 3db means db(3)
PercentTwiddle
  = value:NumericLiteral "%" {
      return node('PercentTwiddle', { value: parseFloat(value) })
    }

DbTwiddle
  = sign:"-"? value:NumericLiteral "db" {
      return node('DbTwiddle', { value: sign ? -parseFloat(value) : parseFloat(value) })
    }

// Weighted set notation: {365, 366} or {365: 303, 366: 97}
WeightedSet
  = "{" _ entries:WeightedEntries _ "}" unit:(_ Unit)? {
      return node('WeightedSet', {
        entries,
        unit: unit ? unit[1] : null
      })
    }

WeightedEntries
  = head:WeightedEntry tail:(_ "," _ WeightedEntry)* {
      return [head, ...tail.map(t => t[3])]
    }

WeightedEntry
  = value:NumericLiteral _ ":" _ weight:NumericLiteral {
      return { value: parseFloat(value), weight: parseFloat(weight) }
    }
  / value:NumericLiteral {
      return { value: parseFloat(value), weight: 1 }
    }

// Significant figure number: '3.14 means "about 3.14" with uncertainty from sig figs
SigFigNumber
  = "'" raw:SigFigLiteral unit:(_ Unit)? {
      return node('SigFigNumber', {
        raw: raw,
        unit: unit ? unit[1] : null
      })
    }

SigFigLiteral
  = [0-9]+ "." [0-9]* ([eE] [+-]? [0-9]+)? { return text() }
  / [0-9]+ ([eE] [+-]? [0-9]+)? "."? { return text() }
  / "." [0-9]+ ([eE] [+-]? [0-9]+)? { return text() }

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
  = !ReservedWord [a-zA-Z_][a-zA-Z0-9_]* { return text() }

Identifier
  = name:IdentifierName {
      return node('Identifier', { name })
    }

ReservedWord
  = ("to" / "as" / "thru" / "pm" / "of" / "against") ![a-zA-Z0-9_]

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
