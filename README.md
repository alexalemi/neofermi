# neofermi

A mobile-friendly, web-based domain-specific language for order of magnitude calculations with Monte Carlo uncertainty propagation and dimensional analysis.

Think: **[Frink](https://frinklang.org/) + [Squiggle](https://www.squiggle-language.com/)** running in your browser.

## Status

🚧 **Planning Phase** - See [PLAN.md](./PLAN.md) for comprehensive implementation plan.

## Vision

- **Units as first-class citizens** - Track dimensions through all calculations (like Frink/Rink)
- **Monte Carlo uncertainty** - Propagate probability distributions (like MonteCarloMeasurements.jl)
- **Live notebook interface** - Real-time evaluation and visualization (like Plaque)
- **Mobile-first** - Works on phones, tablets, and desktops
- **JavaScript-based** - Maximum portability, no installation required

## Related Projects

- [SimpleFermi](https://github.com/alexalemi/simplefermi) - Python implementation with similar goals
- [Plaque](https://blog.alexalemi.com) - Live-updating blog platform
- [txtpad](https://txtpad.alexalemi.com) - Text editor with live rendering

## Key Decisions

✅ **TypeScript** - Type safety for dimensional analysis
✅ **20,000 samples** - Better accuracy than Squiggle (1k), optimized for web
✅ **Peggy parser** - Validated by Squiggle's success
✅ **GitHub Pages** - Static hosting, no backend needed
✅ **Pure sampling** - Start simple, add symbolic optimizations later

See [DECISIONS.md](./DECISIONS.md) for full rationale.

## Next Steps

See [PLAN.md](./PLAN.md) for:
- Detailed architecture design
- Technology stack (TypeScript, mathjs, Peggy, jStat)
- 6-phase implementation roadmap
- MVP in 6-10 weeks
- Squiggle architecture analysis
