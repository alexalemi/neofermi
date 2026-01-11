# NeoFermi Implementation Plan

## Project Vision

A mobile-friendly, web-based domain-specific language for order of magnitude calculations combining:
- **Dimensional quantities** as first-class citizens (like Frink/Rink)
- **Monte Carlo uncertainty propagation** (like Julia's MonteCarloMeasurements.jl)
- **Live-updating notebook interface** (like Plaque/txtpad)
- **JavaScript-based** for maximum portability and mobile compatibility

## Research Summary

### Existing Tools Analysis

#### Your Previous Work: SimpleFermi
- Python-based using `pint` for units and custom Monte Carlo distributions
- N=200,000 samples for distributions
- Rich API for uncertainty: `plusminus()`, `lognormal()`, `to()`, `outof()`, `sigfig()`, `percent()`, `db()`
- IPython integration with quantile dotplot visualization
- CODATA physical constants with measured errors
- Started work on tree-sitter parser for custom language
- Has a notebook renderer with MathJax support

**Key Insight**: The core API design is solid and well-tested. We should port this conceptual model to JS.

#### Similar Tools

**Frink** (Java-based)
- 20+ years of development, battle-tested
- Tracks units through all calculations
- Supports interval arithmetic for error bounds
- Arbitrary precision math
- Runs on JVM, has web interface

**Rink** (Rust-based)
- Open source, MPL 2.0 licensed
- CLI and web interface (rinkcalc.app)
- Excellent dimensional analysis
- Unit factorizations

**Squiggle** (TypeScript-based)
- Probabilistic estimation language by QURI
- Hybrid Monte Carlo + symbolic approach
- Default 1000 samples (configurable)
- Uses KDE for distribution plots
- Has existing web infrastructure (Squiggle Hub)

**Guesstimate** (Web-based)
- Spreadsheet-like interface
- Every cell can be a probability distribution
- Uses [5th percentile, 95th percentile] ranges
- Excel-like formulas with Monte Carlo backend

**MonteCarloMeasurements.jl** (Julia)
- Particle-based uncertainty representation
- Handles nonlinear uncertainty propagation well
- Supports arbitrary correlations
- Better than linear error propagation for complex functions

### JavaScript Ecosystem

#### Units Libraries
1. **mathjs** - Most comprehensive, built-in unit support, expression parser
2. **js-quantities** - Dedicated units library (v1.8.0, stable)
3. **quantity-math-js** - Newer, 1.6x faster than mathjs, 3.0x faster than js-quantities
4. **safe-units** (TypeScript) - Compile-time dimensional analysis, large library
5. **uom-ts** (TypeScript) - Type-safe, custom units, no runtime overhead

#### Distribution/Statistics Libraries
1. **jStat** - Comprehensive: pdf, cdf, inverse, sampling for many distributions
2. **stdlib-js** - Scientific computing focus, actively maintained (2016-2025)
3. **Both support**: Normal, Beta, Poisson, Weibull, etc.

#### Parser Options
1. **Ohm** - PEG-based, left recursion support, separates grammar from semantics
2. **Peggy** - Fast, excellent errors, left recursion (modernized PEG.js)
3. **Nearley** - Earley algorithm, handles ambiguous grammars, good for streaming

## Architecture Design

### Core Components

```
┌─────────────────────────────────────────────────────────┐
│                    Web Frontend                          │
│  (Live-updating notebook interface like Plaque/txtpad)  │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│                  Parser & Evaluator                      │
│              (Ohm or Peggy grammar)                      │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│                 Core Engine (JS/TS)                      │
│  ┌────────────────────────────────────────────────┐     │
│  │  Quantity Class (value + unit + uncertainty)   │     │
│  └────────────────────────────────────────────────┘     │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐    │
│  │   Units     │  │ Distributions│  │  Constants  │    │
│  │  (mathjs or │  │   (jStat)    │  │   (CODATA)  │    │
│  │   uom-ts)   │  │              │  │             │    │
│  └─────────────┘  └──────────────┘  └─────────────┘    │
└─────────────────────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│           Visualization Layer                            │
│  (Quantile dotplots, histograms, summary stats)         │
└─────────────────────────────────────────────────────────┘
```

### Key Design Decisions

#### 1. TypeScript vs JavaScript
**Recommendation: TypeScript**
- Type safety helps catch unit/dimension errors at compile time
- Better IDE support for complex calculations
- `safe-units` or `uom-ts` provide compile-time dimensional analysis
- Can still compile to vanilla JS for maximum compatibility

#### 2. Units Library
**Recommendation: Start with mathjs, consider migration path**
- **Pros**: Comprehensive, built-in parser, well-maintained, 7M+ weekly downloads
- **Cons**: Larger bundle size
- **Alternative**: `quantity-math-js` for performance-critical use
- **Future**: Consider `uom-ts` for TypeScript type safety if going that route

#### 3. Distribution Strategy
**Recommendation: Custom particle-based implementation using jStat primitives**
- Similar to MonteCarloMeasurements.jl approach
- Use jStat for basic distributions (normal, beta, lognormal, etc.)
- Store N particles per uncertain value (default 1000-10000, configurable)
- Arithmetic operates on particles directly
- **Sample count trade-off**: Lower for mobile performance, higher for accuracy

#### 4. Parser
**Recommendation: Ohm**
- Clean separation of grammar and semantics
- Great for incremental development
- Interactive grammar editor (ohmjs.org/editor)
- Left recursion support (important for operators)
- Can start simple and expand

#### 5. Frontend Architecture
**Recommendation: Reactive document model**
- Similar to Observable notebooks or your Plaque project
- Real-time evaluation as user types
- Cell-based structure (like Jupyter/Guesstimate)
- Mobile-first responsive design
- CodeMirror or Monaco for code editing
- D3.js or similar for quantile dotplots

## Implementation Phases

### Phase 1: Core Engine (MVP)
**Goal**: Basic uncertainty + units calculator working in Node.js

1. **Setup project structure**
   - TypeScript project with modern build tooling (Vite/esbuild)
   - Testing framework (Vitest or Jest)
   - Linting and formatting

2. **Implement Quantity class**
   - Wraps value (scalar or particle array) + unit
   - Basic arithmetic (+, -, *, /, ^)
   - Unit conversion
   - toString/display methods

3. **Distribution functions** (port from SimpleFermi)
   - `plusminus(mean, std)` - normal distribution
   - `to(low, high)` - lognormal or normal
   - `lognormal(low, high)` - for positive quantities
   - `normal(left, right)` - for general ranges
   - `outof(part, whole)` - beta distribution
   - `sigfig(string)` - uniform based on significant figures
   - `percent(pct)` - multiplicative error
   - `db(decibels)` - decibel-based multiplicative error
   - `uniform(left, right)` - uniform distribution
   - `data(values, weights)` - bootstrap sampling

4. **Physical constants library**
   - Port CODATA constants from SimpleFermi
   - Include uncertainties
   - Common units (length, mass, time, etc.)

5. **Test suite**
   - Unit arithmetic
   - Distribution propagation
   - Edge cases

**Deliverable**: `npm` package that can be imported and used programmatically

### Phase 2: Language & Parser
**Goal**: Domain-specific syntax for natural expression of fermi estimates

1. **Grammar design** (using Ohm)
   - Literals: `3.14`, `1.0e6`, `2 +/- 0.5`
   - Units: `3 meters`, `5 kg`, `10 m/s^2`
   - Distributions: `[10 to 100]`, `sigfig("1.0")`, `7 outof 10`
   - Operators: `+`, `-`, `*`, `/`, `^`
   - Functions: `sqrt()`, `log()`, `exp()`, etc.
   - Variables: `x = 3 meters; y = x^2`
   - Unit conversions: `x to km`, `y in kg`
   - Comments: `# this is a comment`

2. **Parser implementation**
   - Ohm grammar file
   - Semantic actions for evaluation
   - Error messages and recovery

3. **REPL for testing**
   - Node.js command-line interface
   - Read-eval-print loop for interactive testing
   - History and multiline support

**Deliverable**: Working REPL that can parse and evaluate Fermi expressions

### Phase 3: Visualization
**Goal**: Beautiful, informative displays of uncertainty

1. **Quantile dotplots** (like SimpleFermi)
   - Canvas-based or SVG
   - Show distribution shape intuitively
   - Mobile-responsive

2. **Summary statistics**
   - Mean, median, mode
   - Confidence intervals (5th, 50th, 95th percentiles)
   - Standard deviation
   - Scientific notation with appropriate precision

3. **Alternative visualizations**
   - Histogram/density plot
   - CDF plot
   - Box plot option

**Deliverable**: Standalone visualization library

### Phase 4: Web Interface (MVP)
**Goal**: Mobile-friendly live notebook

1. **Basic UI framework**
   - Vanilla JS or lightweight framework (Svelte, Preact, or Vue)
   - Cell-based input (like Jupyter)
   - Each cell: code input → evaluation → visualization
   - Responsive design, mobile-first

2. **Live evaluation**
   - Debounced auto-evaluation as user types
   - Dependency tracking between cells
   - Error handling and display

3. **Local storage**
   - Save/load notebooks to browser storage
   - Export to JSON
   - Import examples

4. **Basic styling**
   - Clean, readable design
   - Syntax highlighting (CodeMirror or Monaco)
   - Dark mode support

**Deliverable**: Static web app that can be hosted anywhere

### Phase 5: Enhanced Features
**Goal**: Match and exceed SimpleFermi capabilities

1. **Extended library**
   - More physical constants
   - Common conversion factors
   - Domain-specific libraries (astronomy, chemistry, etc.)

2. **Advanced distributions**
   - Mixture distributions
   - Custom distributions from data
   - Correlation support

3. **Performance optimization**
   - Web Workers for Monte Carlo
   - Adaptive sample counts
   - Caching and memoization

4. **Export capabilities**
   - LaTeX output
   - Markdown with equations
   - CSV data export
   - Share via URL (compressed state in hash)

### Phase 6: Progressive Web App
**Goal**: True mobile-first experience

1. **PWA features**
   - Offline support
   - Install to home screen
   - Fast loading (code splitting, lazy loading)

2. **Mobile optimizations**
   - Touch-friendly UI
   - Mobile keyboard considerations
   - Reduced sample counts for faster computation

3. **Cloud sync** (optional)
   - Save notebooks to cloud
   - Share publicly or privately
   - User accounts (optional)

## Technical Specifications

### Sample Implementation Sketch

```typescript
// Core types
interface Particle {
  samples: number[];  // Monte Carlo particles
  n: number;          // Number of samples
}

type Value = number | Particle;

interface Unit {
  // Use mathjs Unit or custom implementation
}

class Quantity {
  constructor(
    public value: Value,
    public unit: Unit
  ) {}

  // Arithmetic operations
  add(other: Quantity): Quantity
  multiply(other: Quantity): Quantity
  pow(exponent: number): Quantity
  to(targetUnit: Unit): Quantity

  // Statistics
  mean(): number
  median(): number
  percentile(p: number): number

  // Display
  toString(): string
  toQuantileDotplot(): SVGElement
}

// Distribution constructors
function plusminus(mean: number, std: number, unit?: Unit, n = 10000): Quantity
function lognormal(low: number, high: number, unit?: Unit, n = 10000): Quantity
function outof(part: number, whole: number, n = 10000): Quantity
function sigfig(value: string, unit?: Unit, n = 10000): Quantity

// Constants
const CONSTANTS = {
  c: new Quantity(299792458, meter/second),  // exact
  hbar: new Quantity(plusminus(1.054571817e-34, 1.3e-43), joule*second),
  // ... more CODATA constants
}
```

### Example Grammar (Ohm syntax)

```
Fermi {
  Expr = AddExpr

  AddExpr = AddExpr ("+" | "-") MulExpr  -- binary
          | MulExpr

  MulExpr = MulExpr ("*" | "/") PowExpr  -- binary
          | PowExpr

  PowExpr = UnaryExpr "^" PowExpr  -- binary
          | UnaryExpr

  UnaryExpr = "-" UnaryExpr  -- neg
            | PrimaryExpr

  PrimaryExpr = "(" Expr ")"  -- paren
              | Distribution
              | Number Unit?
              | FunctionCall
              | identifier

  Distribution = "[" Number "to" Number "]"  -- range
               | Number "+/-" Number         -- plusminus
               | Number "outof" Number       -- outof
               | "sigfig" "(" string ")"     -- sigfig

  FunctionCall = identifier "(" ListOf<Expr, ","> ")"

  Number = digit+ ("." digit+)? (("e"|"E") ("+"|"-")? digit+)?
  Unit = identifier ("/" identifier)? ("^" Number)?

  identifier = letter (alnum | "_")*
}
```

### Bundle Size Targets

- **Core library**: < 100 KB gzipped
- **With visualization**: < 200 KB gzipped
- **Full web app**: < 500 KB gzipped initial load

Mobile performance is critical - lazy load features as needed.

### Browser Support

- Modern evergreen browsers (Chrome, Firefox, Safari, Edge)
- Mobile Safari (iOS 14+)
- Chrome on Android
- Progressive enhancement for older browsers

## Development Workflow

### Iteration Strategy

1. **Test-driven development**
   - Port SimpleFermi test cases
   - Add new tests for edge cases
   - Property-based testing for arithmetic

2. **Documentation-driven**
   - Write examples first
   - Document API as you go
   - Create tutorial notebooks

3. **Mobile-first**
   - Test on actual mobile devices early
   - Performance budgets from the start
   - Touch interactions

### Milestones & Timeline Estimate

This is a complex project. Here's a realistic breakdown:

- **Phase 1** (Core Engine): 2-3 weeks
- **Phase 2** (Parser): 1-2 weeks
- **Phase 3** (Visualization): 1-2 weeks
- **Phase 4** (Web Interface): 2-3 weeks
- **Phase 5** (Enhanced): 1-2 weeks
- **Phase 6** (PWA): 1-2 weeks

**Total**: 8-14 weeks for full-featured version

**MVP** (Phases 1-4): 6-10 weeks

### Open Questions to Resolve

1. **TypeScript or JavaScript?**
   - TS: Better DX, type safety, but adds build complexity
   - JS: Simpler, faster iteration, but less safety

2. **Sample count for Monte Carlo?**
   - Desktop: 10,000-50,000 samples
   - Mobile: 1,000-5,000 samples (adaptive?)
   - Trade-off: accuracy vs. speed

3. **Hosting & deployment?**
   - Static site (GitHub Pages, Netlify, Vercel)
   - With backend (for sync, sharing)?
   - Integrate into existing alexalemi.com infrastructure?

4. **Monetization/sustainability?**
   - Open source (MIT like SimpleFermi)?
   - Free with optional paid features?
   - Pure hobby project?

5. **Name?**
   - NeoFermi (current)
   - FermJS
   - Quanta
   - UncertaintyCalc
   - Something else?

6. **Integration with existing projects?**
   - Can this power txtpad calculations?
   - Integration with Plaque?
   - Standalone first, then integrate?

## Next Steps

### Immediate Actions

1. **Decision checkpoint**: Review this plan and make key technical decisions
   - TypeScript vs JavaScript
   - Units library choice
   - Sample count strategy
   - Hosting approach

2. **Prototype** (1-2 days):
   - Set up basic project structure
   - Implement minimal Quantity class with mathjs
   - Port 2-3 distribution functions
   - Verify Monte Carlo arithmetic works correctly

3. **Validate** (1 day):
   - Test prototype on mobile device
   - Measure performance with different sample counts
   - Ensure approach is viable before full investment

4. **Proceed with Phase 1** if prototype is successful

### Success Criteria

The project will be successful if it:
- ✓ Works reliably on mobile devices
- ✓ Handles both units and uncertainty intuitively
- ✓ Live updates feel responsive (< 200ms evaluation)
- ✓ Produces accurate results (validated against SimpleFermi)
- ✓ Is genuinely useful for on-the-go Fermi estimates
- ✓ Can be easily shared (URL-based notebook sharing)

## References & Resources

### Tools Researched

**Units & Dimensions:**
- [Frink](https://frinklang.org/) - Reference implementation for dimensional analysis
- [Rink](https://github.com/tiffany352/rink-rs) - Rust calculator with excellent units
- [mathjs](https://mathjs.org/docs/datatypes/units.html) - Comprehensive JS math library
- [js-quantities](https://github.com/gentooboontoo/js-quantities) - Dedicated JS units library
- [quantity-math-js](https://github.com/bradenmacdonald/quantity-math-js) - Fast alternative
- [safe-units](https://github.com/jscheiny/safe-units) - TypeScript type-safe units
- [uom-ts](https://github.com/mindbrave/uom-ts) - TypeScript units of measure

**Uncertainty & Probability:**
- [Squiggle](https://www.squiggle-language.com/) - Probabilistic estimation language
- [MonteCarloMeasurements.jl](https://github.com/baggepinnen/MonteCarloMeasurements.jl) - Particle-based uncertainty
- [Measurements.jl](https://github.com/JuliaPhysics/Measurements.jl) - Linear error propagation
- [Guesstimate](https://www.getguesstimate.com/) - Spreadsheet with distributions
- [jStat](https://github.com/jstat/jstat) - JS statistical library
- [stdlib-js](https://github.com/stdlib-js/stats-base-dists) - Scientific computing for JS

**Parsers:**
- [Ohm](https://ohmjs.org/) - PEG parser with grammar/semantics separation
- [Peggy](https://github.com/peggyjs/peggy) - Modern PEG parser
- [Nearley](https://github.com/kach/nearley) - Earley parser for complex grammars

**Your Previous Work:**
- [SimpleFermi](https://github.com/alexalemi/simplefermi) - Python implementation
- Plaque (blog.alexalemi.com)
- txtpad (txtpad.alexalemi.com)

### Academic References

- [GUM Supplement on the Monte Carlo Method](https://www.bipm.org/documents/20126/2071204/JCGM_101_2008_E.pdf) - Standard approach
- CODATA 2018/2022 physical constants
- Quantile dotplots ([when-ish-is-my-bus](https://github.com/mjskay/when-ish-is-my-bus/blob/master/quantile-dotplots.md))

---

## Deep Dive: Squiggle Architecture Analysis

After examining the [Squiggle repository](https://github.com/quantified-uncertainty/squiggle), here are key insights that inform our implementation:

### Squiggle's Tech Stack (Confirmed)

**Monorepo Structure:**
- **pnpm** workspaces with **Turbo** for build orchestration
- Separated into `packages/` (public), `apps/` (Next.js sites), `internal-packages/` (utilities)
- Core language: `@quri/squiggle-lang`, Components: `@quri/squiggle-components`

**Core Dependencies:**
- **Peggy** (v4.2.0) - PEG parser generator (successor to PEG.js)
- **jStat** (v1.9.6) - Statistical distributions (same library we identified!)
- **TypeScript** - 93.8% of codebase
- **React** - For visualization components
- **Immutable** - For data structures
- **d3-format** - Number formatting

### Three Distribution Formats

Squiggle uses a **hybrid approach** with three internal formats:

1. **Symbolic** - Mathematical representations (e.g., Normal(μ, σ))
   - Pros: Fast, exact, small memory footprint
   - Cons: Limited to analytically tractable operations
   - Use: Simple distributions, basic arithmetic where possible

2. **Sample Set** - Monte Carlo particles
   - Pros: Handles arbitrary operations, supports correlations
   - Cons: Slower, approximate, memory intensive
   - Use: Complex operations, default for most user-created distributions
   - **Default: 1000 samples** (configurable)

3. **Point Set** - Coordinate pairs `{xs: [...], ys: [...]}`
   - Pros: Accurate for complex shapes, can represent any distribution
   - Cons: More memory than symbolic, doesn't support correlations
   - Use: Results of numerical operations, visualization

**Key Insight**: Start with symbolic when possible, fall back to Monte Carlo when needed, convert to point set for display. This is more sophisticated than our initial plan of "always use particles."

### Parser Architecture

- **Peggy grammar** in `src/ast/peggyParser.peggy`
- Build script: `peggy --cache --format es ./src/ast/peggyParser.peggy`
- ES module output, cached for faster rebuilds
- TypeScript throughout

### What This Means for NeoFermi

**1. Distribution Strategy (REVISED)**

Instead of "always use particles," we should implement:

```typescript
type DistFormat =
  | { type: 'symbolic', dist: SymbolicDist }      // e.g., Normal(0, 1)
  | { type: 'samples', particles: number[] }       // Monte Carlo
  | { type: 'points', xs: number[], ys: number[] } // PDF coordinates

class Quantity {
  constructor(
    public value: DistFormat | number,
    public unit: Unit
  ) {}

  // Operations try to stay symbolic, fall back to sampling
  add(other: Quantity): Quantity {
    if (isSymbolic(this) && isSymbolic(other)) {
      return symbolicAdd(this, other)  // if tractable
    }
    return sampleAdd(this, other)  // fall back to MC
  }
}
```

**Benefits:**
- Fast for simple cases (most unit conversions, basic arithmetic)
- Accurate for complex nonlinear operations
- Smaller memory footprint
- Better UX (instant results for simple expressions)

**2. Parser Choice (CONFIRMED: Peggy)**

Squiggle's use of Peggy validates our parser choice. Benefits:
- Active development (vs. Ohm which is less active)
- Direct TypeScript integration
- Excellent error reporting
- Caching for fast rebuilds

**3. Monorepo Structure**

Consider organizing like Squiggle:

```
neofermi/
├── packages/
│   ├── neofermi-lang/      # Core parser & engine (like @quri/squiggle-lang)
│   ├── neofermi-components/ # React visualization (like @quri/squiggle-components)
│   └── neofermi-ui/         # Shared UI components
├── apps/
│   ├── docs/                # Documentation site
│   └── playground/          # Web interface
└── internal-packages/
    └── content/             # Examples, tutorials
```

Even if starting simple, this structure allows growth.

**4. Sample Count Strategy (REFINED)**

Follow Squiggle's approach:
- **Default: 1000 samples** (not 10,000) for reasonable speed
- Make it configurable
- Use symbolic when possible to avoid sampling entirely
- For mobile: could reduce to 500-1000 (still reasonable accuracy)

**5. Development Workflow**

Adopt Squiggle's tools:
- **pnpm** - Faster, more efficient than npm
- **Turbo** - Only if we go monorepo route
- **Changesets** - For versioning if publishing to npm

### Updated Phase 1 Implementation

Based on Squiggle analysis, Phase 1 should be:

1. **Setup** (revised)
   - TypeScript with pnpm
   - Peggy parser (not Ohm)
   - jStat for statistical primitives
   - mathjs for units

2. **Core Distribution Engine**
   - Implement 3-format system:
     - Symbolic: Normal, LogNormal, Uniform, Beta (common cases)
     - Samples: Fallback for complex operations
     - Points: For visualization and complex shapes
   - Smart operation selection (symbolic first, samples as fallback)

3. **Quantity Class** (updated)
   - Value can be scalar, symbolic dist, samples, or points
   - Unit tracking via mathjs
   - Arithmetic tries to preserve symbolic form

4. **SimpleFermi API** (same)
   - Port distribution constructors: `plusminus()`, `to()`, `lognormal()`, etc.
   - These return symbolic when possible, samples when needed

### Key Differences from Squiggle

NeoFermi should differ in these ways:

1. **Units are first-class** - Squiggle doesn't have built-in dimensional analysis
2. **Fermi-specific API** - `sigfig()`, `db()`, `percent()` not in Squiggle
3. **Physical constants** - CODATA library built-in
4. **Mobile-first** - Squiggle is desktop-focused
5. **Simpler scope** - No Bayesian inference, just forward uncertainty propagation

### Questions Answered

✓ **Parser**: Peggy (confirmed by Squiggle)
✓ **Stats library**: jStat (confirmed by Squiggle)
✓ **Sample count**: 1000 default (matches Squiggle)
✓ **Distribution strategy**: Hybrid symbolic/sampling (inspired by Squiggle)
✓ **Monorepo**: Optional, but good structure for growth

### New Questions from Squiggle Analysis

1. **ReasonML/ReScript?** Squiggle was originally ReasonML → JavaScript
   - For us: Stick with TypeScript (more accessible, better ecosystem)

2. **Web Workers?** Squiggle uses them for async computation
   - For us: Consider for Phase 5 (performance optimization)

3. **KDE for visualization?** Squiggle uses Kernel Density Estimation
   - For us: Worth considering vs. histograms for smooth curves

4. **Immutable data structures?** Squiggle uses Immutable.js
   - For us: Maybe not necessary initially, add if needed

### Recommended Reading

- [Squiggle Technical Overview](https://www.lesswrong.com/posts/Drs8XNr52Ybqa57v5/squiggle-technical-overview)
- [Three Formats of Distributions](https://www.squiggle-language.com/docs/Discussions/Three-Formats-Of-Distributions)
- [Squiggle Repo](https://github.com/quantified-uncertainty/squiggle)
- [@quri/squiggle-lang on npm](https://www.npmjs.com/package/@quri/squiggle-lang)

---

*This plan is a living document. Update as implementation progresses and new challenges/opportunities emerge.*

*Last updated: 2026-01-11 - Added Squiggle architecture deep dive*
