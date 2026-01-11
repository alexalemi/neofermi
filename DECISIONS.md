# Technical Decisions for NeoFermi

This document tracks the key technical decisions made during the planning and implementation of NeoFermi.

## Core Decisions (2026-01-11)

### Language & Build System
- **TypeScript** ✓ - Type safety for dimensional analysis and better DX
- **pnpm** - Package manager (faster than npm, used by Squiggle)
- **Vite** - Build tool for fast development and optimal production builds
- **Target**: ES2020+ (modern browsers, mobile Safari 14+)

### Monte Carlo Configuration
- **Sample count: 20,000** (not 1,000 like Squiggle)
  - Rationale: Prioritize accuracy over speed
  - Closer to SimpleFermi's 200k approach but optimized for web
  - May add adaptive sampling later (reduce on mobile if needed)
  - User configurable via settings

### Distribution Strategy
- **Start with sampling distributions from day 1**
  - Don't wait to add uncertainty features
  - Core use case is uncertainty propagation
  - Symbolic optimization can come later if needed
- **Implementation approach**:
  - Phase 1: Pure sampling (Monte Carlo particles)
  - Phase 5+: Consider adding symbolic optimizations for common cases
  - Keep it simple initially, optimize later

### Units Library
- **mathjs** for dimensional analysis
  - Comprehensive unit support
  - Built-in expression parser (may use for basic eval)
  - Well-maintained, 7M+ weekly downloads
  - Can swap later if needed, but good starting point

### Statistics Library
- **jStat** (v1.9.6+) for distribution primitives
  - Same as Squiggle uses
  - Provides: normal, lognormal, beta, uniform, etc.
  - PDF, CDF, inverse CDF, sampling functions
  - Lightweight and well-tested

### Parser
- **Peggy** (v4+) for grammar definition
  - Confirmed by Squiggle's success
  - PEG parser with excellent TypeScript support
  - Good error messages
  - Fast with caching
- **Alternative considered**: Ohm (decided against - less active development)

### Hosting & Deployment
- **GitHub Pages** for hosting
  - Static site only (no backend)
  - Free, reliable, git-based deployment
  - Perfect for open source project
  - Easy CI/CD with GitHub Actions
- **Static HTML/JS/CSS** output from Vite
- **Client-side only** - all computation in browser

### Project Structure
- **Start simple, not monorepo**
  - Single package initially: `neofermi`
  - Can refactor to monorepo later if needed
  - Structure:
    ```
    neofermi/
    ├── src/
    │   ├── core/          # Quantity, distributions, units
    │   ├── parser/        # Peggy grammar and evaluator
    │   ├── viz/           # Visualization components
    │   ├── app/           # Web interface
    │   └── lib/           # Constants, utilities
    ├── public/            # Static assets
    ├── dist/              # Build output (for GitHub Pages)
    └── examples/          # Example notebooks
    ```

### Visualization
- **Quantile dotplots** as primary visualization
  - Port from SimpleFermi
  - Canvas-based for performance
  - Mobile-responsive
- **Summary statistics** always shown
  - Mean, median, 5th/95th percentiles
  - Standard deviation
  - Scientific notation with appropriate precision

### Frontend Framework
- **Decide later, start with vanilla TS**
  - Can add React/Preact/Svelte later if needed
  - Keep bundle small initially
  - Focus on core functionality first
- **CodeMirror** or **Monaco** for code editing (decide during Phase 4)

## Deferred Decisions

These decisions will be made during implementation:

### Phase 1 (Core Engine)
- [ ] Exact data structure for particles (Float64Array vs number[])
- [ ] Caching strategy for expensive operations
- [ ] Error handling approach

### Phase 2 (Parser)
- [ ] Exact grammar syntax details
- [ ] Variable scoping rules
- [ ] Function definition syntax (if any)

### Phase 3 (Visualization)
- [ ] Exact dotplot algorithm (number of quantiles, layout)
- [ ] Color scheme
- [ ] Interactive features (zoom, pan, etc.)

### Phase 4 (Web Interface)
- [ ] Frontend framework choice (vanilla, React, Svelte, etc.)
- [ ] Code editor (CodeMirror vs Monaco)
- [ ] Notebook format (JSON structure)
- [ ] Local storage schema

## Rationale for Key Choices

### Why 20k samples instead of 1k?

**Decision: 20k samples**

Squiggle uses 1k, but:
- SimpleFermi uses 200k (proven to work well for Fermi estimates)
- 20k is a middle ground: better accuracy, still reasonable performance
- Modern browsers/mobile devices can handle it
- For Fermi estimates, we often multiply/divide many uncertain quantities
  - Errors compound quickly with fewer samples
  - 20k gives ~0.7% sampling error (1/√20000)
  - 1k gives ~3% sampling error (1/√1000)
- Can always add adaptive sampling later:
  - 20k on desktop
  - 5k-10k on mobile (detect via user agent or performance API)

### Why start with sampling, not symbolic?

**Decision: Pure sampling initially**

Arguments for sampling first:
- ✓ Simpler implementation (single code path)
- ✓ Handles all operations correctly (nonlinear, sign, etc.)
- ✓ Core use case is uncertainty propagation
- ✓ Can add symbolic optimization later without breaking API
- ✓ Easier to debug and test

Arguments for symbolic first:
- ✗ More complex (multiple code paths)
- ✗ Premature optimization
- ✗ Can be added incrementally in Phase 5+

### Why GitHub Pages?

**Decision: GitHub Pages**

Benefits:
- ✓ Free hosting
- ✓ Automatic deployment from git push
- ✓ HTTPS by default
- ✓ Custom domain support (could use neofermi.alexalemi.com)
- ✓ Forces us to keep it static/client-side (good constraint)
- ✓ Easy to set up CI/CD with GitHub Actions
- ✓ Good for open source projects

No backend means:
- All computation client-side (good for privacy!)
- Can't save to cloud (use localStorage + export/import)
- Can use URL hash for sharing (like many playgrounds)

### Why Peggy over Ohm?

**Decision: Peggy**

Peggy advantages:
- ✓ Validated by Squiggle's production use
- ✓ Excellent TypeScript integration
- ✓ Faster parsing with caching
- ✓ Great error messages
- ✓ Active development

Ohm advantages:
- ✗ Nice interactive editor (https://ohmjs.org/editor/)
- ✗ Separation of grammar and semantics

The interactive editor is nice, but Squiggle's success with Peggy is strong validation.

## Open Questions

These need to be answered during implementation:

1. **Adaptive sampling?**
   - Should we detect mobile and reduce sample count?
   - Use Performance API to auto-adjust?
   - Or just always use 20k and optimize performance?

2. **Web Workers?**
   - Should Monte Carlo operations run in Web Workers?
   - Would complicate implementation but improve responsiveness
   - Defer to Phase 5 performance optimization?

3. **Wasm?**
   - Could core arithmetic be faster in WebAssembly?
   - Probably not worth complexity for Phase 1
   - Revisit if performance is an issue

4. **Distribution format for storage?**
   - Store 20k particles in notebook JSON? (large)
   - Store distribution parameters + seed? (reproducible but complex)
   - Store summary statistics only? (loses distribution shape)

## Constraints & Non-Goals

**Hard Constraints:**
- Must work on mobile browsers (iOS Safari, Chrome Android)
- Must be fully client-side (no backend)
- Must work offline (after initial load)
- Must handle dimensional analysis correctly

**Non-Goals (explicitly not doing):**
- Bayesian inference
- Data analysis / fitting models to data
- General-purpose programming language
- Server-side computation
- User accounts (at least initially)
- Collaborative editing

## Performance Targets

Based on 20k samples:

- **Evaluation time**: < 500ms for typical expression on mobile
- **Visualization rendering**: < 100ms for dotplot
- **Initial page load**: < 2s on 3G
- **Bundle size**: < 500 KB gzipped total
  - Core: < 100 KB
  - Parser: < 50 KB
  - Viz: < 100 KB
  - UI: < 200 KB
  - Dependencies: < 50 KB (mathjs + jStat)

These are goals, not hard limits. Optimize after measuring.

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01-11 | TypeScript | Type safety, better DX |
| 2026-01-11 | 20k samples | Accuracy over speed, mobile can handle it |
| 2026-01-11 | Start with sampling | Simpler, can optimize later |
| 2026-01-11 | GitHub Pages hosting | Static, free, git-based |
| 2026-01-11 | Peggy parser | Validated by Squiggle |
| 2026-01-11 | mathjs for units | Comprehensive, well-maintained |
| 2026-01-11 | jStat for distributions | Same as Squiggle, proven |
| 2026-01-11 | Simple structure (not monorepo) | Start simple, refactor later |

---

*This document will be updated as implementation proceeds and new decisions are made.*
