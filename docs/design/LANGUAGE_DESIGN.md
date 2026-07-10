# NeoFermi Language Design

This document explores syntax options for the NeoFermi DSL. The goal is to make Fermi estimation natural, concise, and mobile-friendly.

## Design Principles

1. **Mobile-first** - Easy to type on phone keyboards
2. **Natural** - Reads like mathematical notation or plain English
3. **Concise** - Minimal boilerplate for quick estimates
4. **Clear** - Uncertainty and units are explicit
5. **Familiar** - Borrows from Python, JavaScript, and other calculators

## Core Features to Support

- Literal values with units
- Distributions (uncertainty)
- Arithmetic operations
- Variables and references
- Unit conversion
- Comments
- Multi-line calculations

---

## Option A: Squiggle-inspired (Functional)

Based on Squiggle's approach, using function calls and `->` for pipes.

### Examples

```squiggle
# Simple scalar
distance = 100 meters

# Distribution
height = lognormal(1.5, 2.0) meters

# Range syntax (smart choice)
population = 10 to 1000

# Arithmetic
speed = distance / time

# Unit conversion
speed_mph = speed -> mph

# With uncertainty everywhere
estimate = [10 to 100] meters * [2 to 5] seconds

# Comments
# This is my Fermi estimate for...
answer = population * [0.01 to 0.1]
```

**Pros:**
- Clean, minimal syntax
- `to` keyword is very readable
- `->` for conversion is concise
- Works well with existing implementation

**Cons:**
- `lognormal(a, b) meters` feels a bit redundant
- Need to decide: `[10 to 100]` or `10 to 100`?
- More typing than pure infix

---

## Option B: Frink-inspired (Calculator-style)

Based on Frink, more like a traditional calculator with implicit multiplication.

### Examples

```frink
# Simple scalar
distance = 100 meters

# Distribution with explicit function
height = lognormal[1.5 meters, 2.0 meters]

# Or with brackets for ranges (like Squiggle)
height = [1.5 to 2.0] meters

# Implicit multiplication (no * needed)
energy = mass c^2

# Per-unit syntax
speed = 100 meters/second
density = 5 kg/m^3

# Conversion with arrow or 'in'
speed -> mph
speed in mph

# Chaining
result = (10 people) * (5 kg/person) -> pounds
```

**Pros:**
- Very compact (implicit multiplication)
- Natural unit syntax (`kg/m^3`)
- `->` or `in` for conversion both work
- Reads like physics notation

**Cons:**
- Implicit multiplication can be ambiguous
- Harder to parse (need careful precedence)
- May confuse variables with units

---

## Option C: Python-inspired (Explicit)

Most explicit, closest to our current TypeScript API.

### Examples

```python
# Simple scalar
distance = 100 * meters

# Distribution
height = lognormal(1.5, 2.0, 'meters')

# Or with units after
height = lognormal(1.5, 2.0) * meters

# Range helper
population = to(10, 1000)

# Explicit operators
speed = distance / time

# Method-based conversion
speed_mph = speed.to('mph')

# Statistical methods
mean_speed = speed.mean()
```

**Pros:**
- Very clear and unambiguous
- Familiar to programmers
- Easy to parse
- No magic syntax

**Cons:**
- More verbose
- Quotes around units feel heavy
- `.to()` method less natural than `in` or `->`

---

## Option D: Hybrid (Best of All)

Combine the best aspects of each.

### Examples

```hybrid
# Scalars - simple and clean
distance = 100 meters
time = 10 seconds

# Distributions - bracket syntax for ranges
population = [10 to 1000]
height = [1.5 to 2.0] meters

# Or explicit functions when needed
samples = lognormal(1, 100, 'kg')

# Arithmetic - standard operators
speed = distance / time

# Unit conversion - multiple syntaxes supported
speed in mph           # Natural English
speed -> mph           # Arrow (short)
speed.to('mph')        # Method (explicit)

# Proportions - very readable
success_rate = 7 outof 10
margin = 5%

# Order of magnitude
rough = 1000 ± 1 dB    # ±1 order of magnitude

# Variables work naturally
people = [100 to 1000]
consumption = [2 to 5] kg/person
total = people * consumption

# Comments
# How many hot dogs for the party?
guests = [50 to 100]
dogs_per_guest = [1 to 3]
total_dogs = guests * dogs_per_guest

# Statistical queries
mean(total_dogs)
total_dogs.percentile(0.95)
```

**Pros:**
- Flexible - multiple ways to express things
- Natural for different use cases
- Readable and concise
- Mobile-friendly

**Cons:**
- More to implement
- Multiple syntaxes for same thing (could confuse)
- Need to decide what's canonical

---

## Specific Syntax Decisions

### 1. Distribution Literals

**Option 1a: Brackets with 'to'**
```
[10 to 100] meters
[1 to 1000]
```

**Option 1b: Bare 'to' (no brackets)**
```
10 to 100 meters
1 to 1000
```

**Option 1c: Function calls**
```
lognormal(10, 100, 'meters')
to(10, 100, 'meters')
```

**Recommendation:** Support both 1a and 1c
- `[10 to 100]` for inline ranges (concise, visual)
- `lognormal(...)` when you need specific distribution type

---

### 2. Units

**Option 2a: Bare identifiers**
```
100 meters
5 kg/m^3
```

**Option 2b: Quoted strings**
```
100 'meters'
5 'kg/m^3'
```

**Option 2c: Multiplication**
```
100 * meters
5 * kg/m^3
```

**Recommendation:** 2a (bare identifiers)
- Most natural and concise
- Frink/Rink style
- Parser can distinguish units from variables

---

### 3. Unit Conversion

**Option 3a: `in` keyword**
```
speed in mph
distance in kilometers
```

**Option 3b: Arrow `->` or `=>`**
```
speed -> mph
speed => mph
```

**Option 3c: Method call**
```
speed.to('mph')
speed.to(mph)
```

**Recommendation:** Support 3a and 3b
- `in` reads naturally ("speed in mph")
- `->` is concise for chaining
- Method call `.to()` for compatibility with JS API

---

### 4. Comments

**Option 4a: `#` Python/shell style**
```
# This is a comment
x = 10 meters  # inline comment
```

**Option 4b: `//` JavaScript style**
```
// This is a comment
x = 10 meters  // inline comment
```

**Option 4c: Both**

**Recommendation:** 4a (`#` only)
- Easier to type on mobile (no Shift needed)
- One character vs two
- Familiar from Python/shell/Ruby

---

### 5. Operators and Precedence

Standard mathematical precedence:
1. `^` - Exponentiation (right-associative)
2. `*` `/` - Multiplication, Division
3. `+` `-` - Addition, Subtraction

Special operators:
- `outof` - Beta distribution: `7 outof 10`
- `to` - Range: `10 to 100`
- `±` or `+/-` - Plusminus: `100 ± 10`
- `%` - Percent: `5%` (multiplicative)

**Questions:**
- Should `outof` bind tighter than arithmetic?
- Should `to` be lowest precedence?

---

### 6. Variable Assignment

**Option 6a: `=` only**
```
x = 10 meters
```

**Option 6b: `=` and `:=`**
```
x = 10 meters      # assignment
y := x + 5 meters  # explicit assignment
```

**Recommendation:** 6a (`=` only)
- Simpler
- One way to do things
- Familiar from most languages

---

## Proposed Grammar (EBNF-style)

```ebnf
Program    = Statement*

Statement  = Assignment | Expression

Assignment = Identifier '=' Expression

Expression = Additive

Additive   = Multiplicative (('+'|'-') Multiplicative)*

Multiplicative = Power (('*'|'/') Power)*

Power      = Unary ('^' Unary)*

Unary      = ('-')? Postfix

Postfix    = Primary (('in' | '->') UnitExpr)?
           | Primary '.' Method

Primary    = Number UnitExpr?
           | Distribution
           | '(' Expression ')'
           | Identifier
           | FunctionCall

Distribution = '[' Expression 'to' Expression ']' UnitExpr?

FunctionCall = Identifier '(' ArgList ')'

ArgList    = (Expression (',' Expression)*)?

UnitExpr   = Identifier ('/' Identifier)? ('^' Number)?

Method     = 'mean' '(' ')'
           | 'median' '(' ')'
           | 'std' '(' ')'
           | 'percentile' '(' Expression ')'
           | 'to' '(' String ')'

Number     = Digit+ ('.' Digit+)? (('e'|'E') ('+'|'-')? Digit+)?

Identifier = Letter (Letter | Digit | '_')*

String     = '"' Char* '"' | "'" Char* "'"

Comment    = '#' Char* Newline
```

---

## Example Programs

### Simple calculation
```
# Party planning
guests = [50 to 100]
hotdogs_per_guest = [1 to 3]
total = guests * hotdogs_per_guest
```

### Unit conversion
```
height = [5 to 6] feet
height_cm = height in cm
```

### Complex estimate
```
# World piano tuners (classic Fermi)
population = 300000000
people_per_household = 2.5
pianos_per_household = [0.01 to 0.05]
tunings_per_year = [0.5 to 2]

total_pianos = population / people_per_household * pianos_per_household
tunings_needed = total_pianos * tunings_per_year

# How many tuners?
tunings_per_tuner = [200 to 500] / year
tuners = tunings_needed / tunings_per_tuner
```

### With statistics
```
estimate = [1000 to 10000] kg
mean(estimate)
estimate.percentile(0.95)
```

---

## Mobile Typing Considerations

**Easy on mobile:**
- Numbers and basic operators: `+ - * / ( )`
- Letters for variable names and units
- `#` for comments (no Shift)
- `=` for assignment

**Harder on mobile:**
- `^` requires Shift or symbol keyboard
- `[]` brackets need symbol keyboard
- `->` needs symbol keyboard
- `±` not on standard keyboard

**Suggestions:**
- Support `**` as alternative to `^` for power
- Support both `->` and `in` for conversion (keyboard dependent)
- Support `+/-` as alternative to `±`
- Make `[]` optional where possible

---

## Questions for Discussion

1. **Brackets for ranges?**
   - `[10 to 100]` or `10 to 100`?
   - Makes parsing easier, but more typing

2. **Implicit multiplication?**
   - `2 meters` vs `2 * meters`
   - Natural but harder to parse

3. **Unit syntax?**
   - Bare: `meters`
   - Quoted: `'meters'`
   - Multiplicative: `* meters`

4. **Multiple conversion syntaxes?**
   - Support both `in` and `->`?
   - Or pick one?

5. **Special operators priority?**
   - Where does `outof` fit in precedence?
   - Where does `to` fit?

6. **Percent notation?**
   - `5%` as literal?
   - Or require `percent(5)`?

7. **Multi-line support?**
   - Implicit semicolons (like JavaScript)?
   - Or require explicit terminators?

---

## Recommendations Summary

**Start with:**
1. ✅ Brackets for ranges: `[10 to 100] meters`
2. ✅ Bare identifiers for units: `100 meters`
3. ✅ Both `in` and `->` for conversion
4. ✅ `#` for comments
5. ✅ `=` for assignment
6. ✅ Standard operator precedence
7. ✅ Newline-terminated statements

**Later additions:**
- Implicit multiplication (Phase 2.5)
- Special operators (`outof`, `%`, `±`)
- Percent literals
- More distribution syntaxes

**Implementation order:**
1. Numbers, operators, parentheses
2. Variables and assignment
3. Units (bare identifiers)
4. Distribution brackets `[a to b]`
5. Function calls
6. Unit conversion
7. Methods (`.mean()`, etc.)
8. Comments

This gives us a minimal viable language that's natural to use and straightforward to implement!

---

*What do you think? Which syntax options feel most natural for your Fermi estimation workflow?*
