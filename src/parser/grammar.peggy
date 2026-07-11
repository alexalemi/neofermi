/*
 * NeoFermi Grammar
 *
 * A grammar for order-of-magnitude calculations with uncertainty and units
 */

{
  // Helper to create AST nodes with source location
  function node(type, props) {
    return { type, location: location(), ...props }
  }
}

// Entry point
Program
  = _ statements:StatementList _ { return node('Program', { statements }) }

StatementList
  = head:Statement tail:(StatementSep Statement)* {
      return [head, ...tail.map(t => t[1])]
    }
  / _ { return [] }

// Statements are separated by newlines (or comments, which consume their own
// trailing newline) — never by plain spaces. Otherwise `(5 + 3) m` parses as
// two statements and silently evaluates to the trailing fragment (`1 m`).
StatementSep
  = [ \t]* ("\r\n" / "\n" / "\r" / Comment) _

Statement
  = UnitDef
  / FunctionDef
  / Assignment
  / Expression

// Unit definition: 1 `widget = 5 kg (defines custom unit in terms of base units)
UnitDef
  = "1" _ "`" unitName:IdentifierName _ "=" _ value:Expression {
      return node('UnitDef', { unitName, value })
    }

// Function definition: f(x) = x^2 or f(x, y) = x + y
FunctionDef
  = name:IdentifierName _ "(" _ params:ParamList _ ")" _ "=" _ body:Expression {
      return node('FunctionDef', { name, params, body })
    }

ParamList
  = head:IdentifierName tail:(_ "," _ IdentifierName)* {
      return [head, ...tail.map(t => t[3])]
    }
  / _ { return [] }

Assignment
  = name:IdentifierName _ "=" _ value:Expression {
      return node('Assignment', { name, value })
    }

// Expressions with precedence

Expression
  = LetBinding
  / IfExpr
  / Comparison

// `(...)*` with a single head parse, NOT `Additive (...)+ / Additive` — the
// ordered-choice form re-parses the whole Additive when there's no
// conversion, and that doubling compounds exponentially on nested parens.
ConversionExpr
  = value:Additive conversions:(_h Conversion)* {
      return conversions.reduce((val, [, conv]) => {
        return node('Conversion', { value: val, unit: conv })
      }, value)
    }

// Let binding: let x = 10 in x + 5
LetBinding
  = "let" _ name:IdentifierName _ "=" _ value:Expression _ "in" _ body:Expression {
      return node('LetBinding', { name, value, body })
    }

// If expression: if x > 0 then a else b
IfExpr
  = "if" _ condition:Comparison _ "then" _ thenBranch:Expression _ "else" _ elseBranch:Expression {
      return node('IfExpr', { condition, thenBranch, elseBranch })
    }

// Comparison operators. Reachable both as an if-condition and as a plain
// Expression, so `3 > 2` and `if (a > b) then ... else ...` both parse.
// Written with an OPTIONAL tail (not ordered choice) so the left side is
// parsed exactly once — peggy doesn't memoize, and a failing choice would
// re-parse the whole subexpression, going exponential on nested parens.
Comparison
  = left:ConversionExpr tail:(_h ComparisonOp _ ConversionExpr)? {
      if (!tail) return left
      return node('BinaryOp', { op: tail[1], left, right: tail[3] })
    }

ComparisonOp
  = ">=" { return ">=" }
  / "<=" { return "<=" }
  / "!=" { return "!=" }
  / "==" { return "==" }
  / ">" { return ">" }
  / "<" { return "<" }

// Addition and Subtraction
// Note: Use negative lookahead to avoid matching +- or +/- as separate operators
// The whitespace BEFORE each infix operator is horizontal-only (_h): statements
// are newline-separated, so a line starting with `-3` or `* 2` must be a new
// statement, not a continuation of the previous one (`x = 5\n-3` used to
// silently assign 2). Whitespace AFTER the operator still spans newlines, so
// a trailing operator continues onto the next line.
Additive
  = head:Multiplicative tail:(_h AddOp _ Multiplicative)* {
      return tail.reduce((left, [, op, , right]) => {
        return node('BinaryOp', { op, left, right })
      }, head)
    }

AddOp
  = "+" !"/" !"-" { return "+" }  // + but not +/ or +-
  / "-" { return "-" }

// Multiplication and Division
Multiplicative
  = head:Range tail:(_h ("*" / "/") _ Range)* {
      return tail.reduce((left, [, op, , right]) => {
        return node('BinaryOp', { op, left, right })
      }, head)
    }

// Distribution operators: bind tighter than * / + - so that
//   `3 to 4 `car * 6 to 10 feet/`car`  parses as (3 to 4 `car) * (6 to 10 feet/`car)
// and
//   `3 to 4 * 6 to 10 feet`            parses as (3 to 4) * (6 to 10 feet)
// Use parens for the old Additive-wide behavior: `(2 * 5) to (3 * 10)`.
// Keywords must be followed by non-identifier chars to avoid matching prefixes like "total".
// IMPORTANT: Use _no_newline for unit attachment to prevent "1 to 2 m\nx" being parsed as "1 to 2 mx"
// The left Unary is parsed exactly once, then the (cheap, literal-first)
// operator tails are tried. The old shape — six alternatives each starting
// `left:Unary` — re-parsed Unary per failed alternative, which compounds
// exponentially through nested parentheses.
Range
  = left:Unary tail:RangeTail? {
      if (!tail) return left
      switch (tail.kind) {
        case 'Range':
          return node('Range', { left, right: tail.right, unit: tail.unit })
        case 'Uniform':
          return node('Uniform', { left, right: tail.right, unit: tail.unit })
        case 'Normal':
          return node('Normal', { mean: left, sigma: tail.right, unit: tail.unit })
        case 'BetaOf':
          return node('BetaOf', { successes: left, total: tail.right })
        case 'BetaAgainst':
          return node('BetaAgainst', { successes: left, failures: tail.right })
      }
    }

RangeTail
  = _h "to" ![a-zA-Z0-9_] _ right:Unary unit:(_no_newline Unit)? {
      return { kind: 'Range', right, unit: unit ? unit[1] : null }
    }
  / _h (".." / "thru" ![a-zA-Z0-9_]) _ right:Unary unit:(_no_newline Unit)? {
      return { kind: 'Uniform', right, unit: unit ? unit[1] : null }
    }
  / _h ("+/-" / "+-" / "pm" ![a-zA-Z0-9_]) _ right:Unary unit:(_no_newline Unit)? {
      return { kind: 'Normal', right, unit: unit ? unit[1] : null }
    }
  / _h "of" ![a-zA-Z0-9_] _ right:Unary {
      return { kind: 'BetaOf', right }
    }
  / _h "against" ![a-zA-Z0-9_] _ right:Unary {
      return { kind: 'BetaAgainst', right }
    }

// Unary operations. Power binds tighter than unary minus so `-2^2` = `-(2^2)`
// (matching Python, Mathematica, and Frink); use `(-2)^2` for the square.
Unary
  = DbTwiddle    // Match signed db before unary minus can grab the sign
  / "-" _ value:Unary {
      return node('UnaryOp', { op: '-', value })
    }
  / Power

// Power (exponentiation) - right associative. The exponent re-enters Unary
// so `2^-3` parses. Optional tail, not ordered choice: Primary must be
// parsed exactly once (see Range).
Power
  = base:Primary tail:(_h ("**" / "^") _ Unary)? {
      if (!tail) return base
      return node('BinaryOp', { op: '^', left: base, right: tail[3] })
    }

Conversion
  = ("as" / "->") _ "SI" ![a-zA-Z0-9_] { return node('Unit', { name: 'SI', special: true }) }
  / ("as" / "->") _ unit:Unit { return unit }

// Primary expressions
// A bare custom unit (x / `beat) is an expression meaning 1 of that unit,
// mirroring how bare built-in unit names resolve (x / hour). Sig-figs use
// the ' sigil ('3.14), custom units use ` — disjoint by design.
Primary
  = DateLiteral
  / WeightedSet
  / SigFigNumber
  / unit:CustomUnitWithPower {
      return node('Number', { value: 1, scaleWord: null, unit })
    }
  / LegacyCustomUnit
  / PercentTwiddle
  / Number
  / FunctionCall
  / Identifier
  / "(" _ expr:Expression _ ")" scale:(_no_newline ScaleWord)? unit:(_no_newline SuffixUnit)? {
      // `(5 + 3) m` attaches the unit by multiplying with `1 m`, mirroring
      // the Number rule's scale-word + unit suffix.
      if (!scale && !unit) return expr
      return node('BinaryOp', {
        op: '*',
        left: expr,
        right: node('Number', {
          value: 1,
          scaleWord: scale ? scale[1] : null,
          unit: unit ? unit[1] : null
        })
      })
    }

// ISO-8601 date literal: #2026-04-16# or #2026-04-16T12:30[:45]#
// Modelled on Frink. The `#` delimiter collides with comments, so we
// gate the Comment rule on `![0-9]` to keep this unambiguous.
DateLiteral
  = "#" iso:$(DateYMD DateTimePart?) "#" {
      return node('Date', { iso, hasTime: iso.indexOf('T') >= 0 })
    }

DateYMD
  = [0-9][0-9][0-9][0-9] "-" [0-9][0-9] "-" [0-9][0-9]

DateTimePart
  = "T" [0-9][0-9] ":" [0-9][0-9] (":" [0-9][0-9])?

// Twiddle operators: 5% means percent(5), 3db means db(3)
PercentTwiddle
  = value:NumericLiteral "%" {
      return node('PercentTwiddle', { value: parseFloat(value) })
    }

// The word boundary keeps `3dbm` from matching as `3db` + stray `m`; the
// optional space makes `3 db` the twiddle rather than mathjs's deci-bit unit.
DbTwiddle
  = sign:"-"? value:NumericLiteral [ \t]* "db" ![a-zA-Z0-9_] {
      return node('DbTwiddle', { value: sign ? -parseFloat(value) : parseFloat(value) })
    }

// Weighted set notation: {365, 366} or {365: 303, 366: 97}
WeightedSet
  = "{" _ entries:WeightedEntries _ "}" unit:(_no_newline Unit)? {
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
  = value:SignedNumericLiteral _ ":" _ weight:SignedNumericLiteral {
      // Negative weights parse so weighted() can reject them with a clear
      // runtime error instead of an opaque parse error.
      return { value: parseFloat(value), weight: parseFloat(weight) }
    }
  / value:SignedNumericLiteral {
      return { value: parseFloat(value), weight: 1 }
    }

// Significant figure number: '3.14 means "about 3.14" with uncertainty from sig figs
SigFigNumber
  = "'" raw:SigFigLiteral unit:(_no_newline Unit)? {
      return node('SigFigNumber', {
        raw: raw,
        unit: unit ? unit[1] : null
      })
    }

SigFigLiteral
  = [0-9]+ "." [0-9]* ([eE] [+-]? [0-9]+)? { return text() }
  / [0-9]+ ([eE] [+-]? [0-9]+)? "."? { return text() }
  / "." [0-9]+ ([eE] [+-]? [0-9]+)? { return text() }

// Function calls — like parenthesized expressions, a trailing scale word or
// unit multiplies the result: `sqrt(4) m` = 2 m, `poisson(3) million` = 3e6.
// The gap between the name and `(` is horizontal-only: `f\n(3)` is the
// statement `f` followed by the statement `(3)`, not a call spanning lines.
FunctionCall
  = name:IdentifierName _h "(" _ args:ArgumentList _ ")" scale:(_no_newline ScaleWord)? unit:(_no_newline SuffixUnit)? {
      const call = node('FunctionCall', { name, args })
      if (!scale && !unit) return call
      return node('BinaryOp', {
        op: '*',
        left: call,
        right: node('Number', {
          value: 1,
          scaleWord: scale ? scale[1] : null,
          unit: unit ? unit[1] : null
        })
      })
    }

ArgumentList
  = head:Expression tail:(_ "," _ Expression)* {
      return [head, ...tail.map(t => t[3])]
    }
  / _ { return [] }

// Numbers with optional units
// IMPORTANT: Use _no_newline to prevent "5\ny" from being parsed as "5 y"
// Scale words (million, billion, …) may appear between value and unit:
// "1 billion USD", "3 million years". They are also still accepted in the
// unit slot for back-compat — see evaluateNumber.
Number
  = value:NumericLiteral
    scale:(_no_newline ScaleWord)?
    unit:(_no_newline UnitWithReciprocal)? {
      return node('Number', {
        value: parseFloat(value),
        scaleWord: scale ? scale[1] : null,
        unit: unit ? unit[1] : null
      })
    }

// Keep in sync with LONG_SCALE_WORDS in src/core/scaleWords.ts.
// Abbreviations (K/M/B/T) are intentionally not listed — they parse as
// identifiers and resolve via the evaluator's back-compat path.
ScaleWord "scale word"
  = name:("septillion" / "sextillion" / "quintillion" / "quadrillion" / "trillion" / "billion" / "million" / "thousand" / "hundred") ![a-zA-Z0-9_] { return name }

// Unit that can start with / or "per" for reciprocals (`5 /day`, `5 per day`).
// The `/` form must hug the denominator: `5 /day` is a reciprocal unit, but
// `100 / x` (space after the slash) stays a division, even when x collides
// with a unit name (`100 / m` used to silently become `100 m^-1` instead of
// dividing by the variable m).
// The `![a-zA-Z0-9_]` boundary keeps `per` from eating prefixes of longer
// words: `3 percent` used to fail as `per` + unknown unit `cent`.
UnitWithReciprocal
  = ("/" / "per" ![a-zA-Z0-9_] _no_newline) denominator:UnitWithPower {
      return node('Unit', {
        type: 'reciprocal',
        denominator
      })
    }
  / Unit

// Suffix unit for parenthesized expressions and function calls. Accepts
// `per day` but NOT the bare `/day` reciprocal form — a leading `/` after
// `)` must stay a division (`(a - b) / some_variable`).
SuffixUnit
  = "per" ![a-zA-Z0-9_] _ denominator:UnitWithPower {
      return node('Unit', {
        type: 'reciprocal',
        denominator
      })
    }
  / Unit

NumericLiteral
  = [0-9]+ ("." [0-9]+)? ([eE] [+-]? [0-9]+)? {
      return text()
    }

SignedNumericLiteral
  = $("-"? NumericLiteral)

// Units
// Try CompoundUnit first so that ``car/`foo` doesn't prematurely match
// the bare CustomUnit alternative and strand the `/`foo`.
Unit
  = CompoundUnit
  / UnitWithPower

CustomUnit
  = "`" name:IdentifierName {
      return node('Unit', { name, custom: true })
    }

// Compound unit like `feet/s` or `feet/`car`.
//
// Whitespace around `/` is only tolerated when the denominator is a
// custom unit (``car`). That's because `1 mm / R_sun` (where R_sun is
// a *variable* holding a Quantity) must remain a division — we can't
// greedily absorb `mm / R_sun` into a compound unit.
CompoundUnit
  = numerator:UnitWithPower [ \t]* "/" [ \t]* denominator:CustomUnitWithPower {
      return node('Unit', {
        type: 'compound',
        numerator,
        denominator
      })
    }
  / numerator:UnitWithPower "/" denominator:UnitWithPower {
      return node('Unit', {
        type: 'compound',
        numerator,
        denominator
      })
    }

CustomUnitWithPower
  = unit:CustomUnit power:(_h ("^" / "**") _ SignedNumericLiteral)? {
      if (power) {
        return node('Unit', {
          type: 'power',
          unit,
          power: parseFloat(power[3])
        })
      }
      return unit
    }

// Unit powers accept a sign so `3 m^-2` means 3 reciprocal-square-meters;
// without it the `^` fell through to the Power operator and quietly computed
// (3 m)^-2 instead.
UnitWithPower
  = unit:UnitCore power:(_h ("^" / "**") _ SignedNumericLiteral)? {
      if (power) {
        return node('Unit', {
          type: 'power',
          unit,
          power: parseFloat(power[3])
        })
      }
      return unit
    }

// Atomic unit: either a bare identifier (`feet`) or a custom unit (``car`).
// Used inside UnitWithPower so that `feet/`car` and ``car^2` parse.
UnitCore
  = CustomUnit
  / SimpleUnit
  / LegacyCustomUnit

// Migration aid: the custom-unit sigil changed from ' to ` (the apostrophe
// now exclusively means sig-fig numbers, '3.14). The apostrophe has no other
// legal use before an identifier, so failing hard with a pointer is safe.
LegacyCustomUnit
  = "'" name:IdentifierName {
      error("Custom units now use a backtick: `" + name + " (the ' sigil is reserved for sig-fig numbers like '3.14)")
    }

SimpleUnit
  // `!(_ "=" !"=")` keeps `x = 5 meter` from parsing the LHS `x` as a bare
  // unit, while still allowing a unit before `==` (e.g. `if a m == b cm ...`).
  = name:IdentifierName !(_ "=" !"=") {
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
  = ("to" / "as" / "thru" / "pm" / "of" / "against" / "let" / "in" / "if" / "then" / "else" / "per") ![a-zA-Z0-9_]

// Whitespace and comments
_
  = (WhiteSpace / Comment)*

// Whitespace without newlines (for use in statement separators)
_no_newline
  = [ \t]+

// Optional horizontal whitespace. Used before infix operators and call
// parens: since statements are newline-separated, a newline there must end
// the statement rather than continue it.
_h
  = [ \t]*

WhiteSpace
  = [ \t\n\r]

// `#` also opens a date literal (#YYYY-MM-DD#), so don't treat `#<digit>`
// as a comment — that case falls through to DateLiteral in Primary.
Comment
  = "#" ![0-9] [^\n]* ("\n" / !.)

// End of file
EOF
  = !.
