# neofermi

A Monte Carlo calculator for Fermi estimation with uncertainty propagation and dimensional analysis.

Think: **[Frink](https://frinklang.org/) + [Squiggle](https://www.squiggle-language.com/)** in your browser.

## Features

- **Probability distributions** - lognormal, normal, uniform, beta, gamma, poisson, exponential, binomial
- **Unit-aware arithmetic** - dimensional analysis with automatic conversion
- **Monte Carlo sampling** - 20,000 samples for accurate uncertainty propagation
- **Live visualization** - dotplots and histograms for distributions
- **Web notebook** - interactive cells with real-time evaluation
- **CLI tool** - render markdown notebooks to HTML

## Quick Start

### Web REPL

Try it online or run locally:

```bash
bun install
bun dev
```

### As a Library

```bash
npm install neofermi
```

```typescript
import { lognormal, to, parse } from 'neofermi'

// Create distributions
const estimate = lognormal(1e6, 1e8)  // 1M to 100M (90% CI)
console.log(estimate.mean())           // ~10M
console.log(estimate.ci(0.9))          // [1M, 100M]

// Parse DSL expressions
const result = parse('10 to 100 * 5 kg')
console.log(result.toString())         // "250 kg (90% CI: 50 - 500)"
```

### CLI

```bash
# Render a markdown notebook to HTML
npx neoferminb notebook.md --output notebook.html

# Interactive REPL
npx neoferminb --repl
```

## DSL Syntax

### Distributions

```
10 to 100           # lognormal, 90% CI from 10 to 100
50 +/- 10           # normal, mean 50, std 10
uniform(0, 1)       # uniform between 0 and 1
3 out of 10         # beta distribution (3 successes, 7 failures)
poisson(5)          # poisson with lambda=5
exponential(0.1)    # exponential with rate=0.1
binomial(10, 0.5)   # 10 trials, 50% success rate
```

### Units

```
speed = 100 km/hr
time = 2 hours
distance = speed * time    # 200 km

energy = 10 J
power = energy / 5 s       # 2 W
```

### Variables and Functions

```
x = 10 to 100
y = x * 2
f(a, b) = a + b * 2
result = f(x, 5)
```

### Custom Units

```
1 'widget = 5 kg
10 'widget              # 50 kg
```

## Keyboard Shortcuts (Web REPL)

| Shortcut | Action |
|----------|--------|
| Ctrl+Enter | Run all cells |
| Ctrl+S | Export notebook |
| Ctrl+O | Import notebook |
| Ctrl+N | Add new cell |
| Escape | Blur current cell |

## Physical Constants

Access 100+ built-in constants:

```
c                    # speed of light
G                    # gravitational constant
M_earth              # Earth mass
AU                   # astronomical unit
world_population     # ~8.2 billion
us_gdp               # US GDP with uncertainty
```

## Building

```bash
bun install          # install dependencies
bun dev              # development server
bun build            # build for production
bun test             # run tests
make package          # create npm tarball
```

## Related Projects

- [SimpleFermi](https://github.com/alexalemi/simplefermi) - Python implementation
- [Squiggle](https://www.squiggle-language.com/) - Inspiration for DSL design
- [Frink](https://frinklang.org/) - Inspiration for unit handling

## License

MIT
