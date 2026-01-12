# NeoFermi Language Specification v1.0

## Design Decisions (Finalized)

Based on mobile-first requirements and natural syntax goals:

1. ✅ **Distribution syntax**: `1 to 10 m` (no brackets needed!)
2. ✅ **Unit syntax**: Bare identifiers for built-ins, `'custom` for custom units
3. ✅ **Conversion**: Both `as` (easy to type) and `->` (concise)
4. ✅ **Comments**: `#` Python-style
5. ✅ **Mobile alternatives**: `**` for `^`, `+/-` for `±`, etc.

---

## Grammar (EBNF)

```ebnf
Program     = Statement*

Statement   = Assignment | Expression

Assignment  = Identifier '=' Expression

Expression  = Range

Range       = Additive ('to' Additive)? UnitSuffix?

Additive    = Multiplicative (('+' | '-') Multiplicative)*

Multiplicative = Power (('*' | '/') Power)*

Power       = Unary (('^' | '**') Unary)*

Unary       = ('-')? Postfix

Postfix     = Primary Conversion*

Primary     = Number UnitSuffix?
            | Identifier
            | FunctionCall
            | '(' Expression ')'

UnitSuffix  = Unit

Unit        = Identifier                    # built-in: meters, kg, seconds
            | '\'' Identifier               # custom: 'pianos, 'widgets
            | Unit '/' Unit                 # compound: kg/m^3
            | Unit ('^' | '**') Number      # power: m^2, m**2

Conversion  = ('as' | '->') Unit

FunctionCall = Identifier '(' ArgList ')'

ArgList     = (Expression (',' Expression)*)?

Identifier  = Letter (Letter | Digit | '_')*

Number      = Digit+ ('.' Digit+)? (('e'|'E') ('+'|'-')? Digit+)?

Comment     = '#' [^\n]* '\n'
```

---

## Precedence (High to Low)

1. **Primary** - Numbers, identifiers, parentheses
2. **Unit application** - `10 meters`
3. **Power** - `^` or `**` (right-associative)
4. **Multiplicative** - `*` `/`
5. **Additive** - `+` `-`
6. **Range** - `to`
7. **Assignment** - `=`

---

## Semantics

### Range Operator `to`

The `to` operator creates a distribution between two values.

**Trailing unit applies to BOTH bounds:**
```
1 to 10 m        # to(1, 10, 'meters')
0 to 100         # to(0, 100) - unitless
-10 to 10 celsius # to(-10, 10, 'celsius')
```

**Individual units in ranges NOT allowed (for simplicity):**
```
1 m to 10 m      # SYNTAX ERROR - use: 1 to 10 m
```

**Rationale:** Matches the API `to(low, high, unit?)` and avoids ambiguity.

### Units

**Built-in units** (no quotes):
```
100 meters
5 kg
10 m/s
9.8 m/s^2
```

**Custom units** (with tick `'`):
```
50 'pianos
1000 'widgets
7 'hot_dogs
```

**Tick must be followed by space:**
```
50 'pianos       # ✓ Correct
50'pianos        # ✗ Error (ambiguous with string)
```

**Note:** The parser checks if a bare identifier is a known unit. If not found and no tick, it's treated as a variable.

### Conversion

Both syntaxes are equivalent:
```
distance as km       # Easy to type on mobile
distance -> km       # Concise

speed as mph
speed -> 'miles_per_hour
```

### Function Calls

Standard function syntax:
```
lognormal(1, 100, 'kg')
normal(-10, 10, 'celsius')
outof(7, 10)
gamma(5, 1)
```

### Mobile-Friendly Alternatives

**Exponentiation:**
```
x^2       # Standard
x**2      # Alternative (easier on some keyboards)
```

**Plusminus:**
```
100 ± 10         # If you have ± symbol
100 +/- 10       # Alternative (easier to type)
```

Both parse to `plusminus(100, 10)`.

---

## Example Programs

### Simple Estimate
```python
# Party planning
guests = 50 to 100
hotdogs_per_guest = 1 to 3
total = guests * hotdogs_per_guest
```

### With Units
```python
# Speed calculation
distance = 100 to 200 m
time = 10 to 20 seconds
speed = distance / time as mph
```

### Custom Units
```python
# Piano tuner problem
population = 300000000
people_per_household = 2.5
pianos_per_household = 0.01 to 0.05

total_pianos = population / people_per_household * pianos_per_household
tunings_per_year = 0.5 to 2

# Custom unit for clarity
total_tunings = total_pianos * tunings_per_year 'tunings
tunings_per_tuner = 200 to 500 'tunings
tuners = total_tunings / tunings_per_tuner
```

### Unit Conversion
```python
height_feet = 5 to 6
height_cm = height_feet * 12 * 2.54
# or
height_cm = height_feet as cm
```

### Complex Expression
```python
# Compound units
density = 1 to 2 kg/m^3
volume = 10 to 20 m**3
mass = density * volume as pounds
```

---

## Operator Precedence Examples

```python
# Precedence is intuitive
x = 2 + 3 * 4        # 2 + (3*4) = 14
x = 2 * 3^4          # 2 * (3^4) = 162
x = 10 m / 5 s       # (10m) / (5s) = 2 m/s

# Range has low precedence
x = 1 + 2 to 10      # (1+2) to 10 = 3 to 10
x = 2 * 5 to 3 * 10  # (2*5) to (3*10) = 10 to 30

# Unit applies to range
x = 1 to 10 kg       # Range from 1kg to 10kg
x = 2*5 to 3*10 m    # Range from 10m to 30m
```

---

## Reserved Words

The following are reserved and cannot be used as variable names:

- `to` - Range operator
- `as` - Conversion operator
- `outof` - Beta distribution operator (future)

Functions are not reserved (they're just identifiers that happen to be functions).

---

## Parser Implementation Notes

### Lexer Tokens

```
NUMBER      - [0-9]+ ('.' [0-9]+)? ([eE][+-]?[0-9]+)?
IDENTIFIER  - [a-zA-Z_][a-zA-Z0-9_]*
TICK        - '
STRING      - " [^"]* " | ' [^']* '  (for function args only)
COMMENT     - # [^\n]* \n

OPERATORS:
  + - * / ^ ** = ->

KEYWORDS:
  to as outof

DELIMITERS:
  ( ) , #
```

### Distinguishing Units from Variables

When parser sees `NUMBER IDENTIFIER`:
1. Check if IDENTIFIER is in known units list (from mathjs)
2. If yes → parse as unit
3. If no and starts with `'` → parse as custom unit
4. If no → ERROR: "Unknown unit: X. Did you mean 'X for a custom unit?"

### Unit Lookup

Use mathjs built-in unit system:
```typescript
import { unit } from 'mathjs'

function isKnownUnit(name: string): boolean {
  try {
    unit(1, name)
    return true
  } catch {
    return false
  }
}
```

---

## Ambiguities and Edge Cases

### 1. Negative numbers vs subtraction
```
x = -5       # Unary minus (negative five)
x = y - 5    # Binary minus (y minus five)
```

**Resolution:** Standard parsing - check if `-` follows an operator or start of expression.

### 2. Division vs unit separator
```
x = 10 / 5       # Division: 2
x = 10 kg/m      # Unit: kilograms per meter
```

**Resolution:**
- After NUMBER UNIT, `/` starts compound unit
- Otherwise, `/` is division operator

### 3. Function call vs multiplication
```
x = sqrt(4)      # Function call
x = y(4)         # ERROR: y is not a function
```

**Resolution:** Check if identifier before `(` is a known function.

### 4. Range vs variable named 'to'
```
x = 1 to 10      # Range operator
to = 5           # ERROR: 'to' is reserved
```

**Resolution:** `to` is a reserved keyword.

---

## Type System (Informal)

All values are `Quantity` objects with:
- Value: scalar or distribution (20k particles)
- Unit: from mathjs (or custom)

**Arithmetic rules:**
- Addition/Subtraction: units must be compatible
- Multiplication: units multiply
- Division: units divide
- Power: unitless exponent, units raised to power

**Distribution propagation:**
- All operations work element-wise on particles
- Scalars broadcast to distributions

---

## Future Extensions (Phase 3+)

**Special operators:**
```
x = 7 outof 10           # Beta distribution
x = 100 ± 10%            # Percentage error
x = 1000 ± 1 dB          # Order of magnitude
```

**Let bindings (shadowing):**
```
let x = 10 in x + 5      # Scoped binding
```

**Functions (maybe?):**
```
f(x) = x^2 + 1
y = f(5)
```

But for Phase 2, we'll start with the core grammar above!

---

## Implementation Plan

**Phase 2.1: Basic Parser**
1. Lexer (tokenize)
2. Parser (build AST)
3. Numbers, operators, parentheses
4. Variables and assignment

**Phase 2.2: Units**
1. Unit suffix parsing
2. mathjs integration
3. Custom units with tick

**Phase 2.3: Range**
1. `to` operator
2. Range expression with unit suffix

**Phase 2.4: Conversion**
1. `as` and `->` operators
2. Unit conversion via mathjs

**Phase 2.5: Integration**
1. REPL integration
2. Error messages
3. Multi-line support

---

*This spec finalizes the language design. Ready to implement the parser!*
