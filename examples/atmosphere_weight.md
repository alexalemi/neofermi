# How Much Does Earth's Atmosphere Weigh?

A classic physics Fermi problem combining pressure, area, and mass.

## The Key Insight

Atmospheric pressure is the weight of air per unit area. So:
- Pressure = Weight / Area
- Weight = Pressure × Area

```
# Sea level atmospheric pressure
pressure = atm

# Earth's surface area
area = earth_surface_area
```

## Calculation

```
# Total weight (force) of atmosphere
atmosphere_weight = pressure * area

# Convert to mass using g = 9.81 m/s²
atmosphere_mass = atmosphere_weight / g
```

## Result

The atmosphere weighs approximately **${atmosphere_mass}** (as a mass).

That's about 5 × 10^18 kg, or about 5 quintillion kilograms!

## Sanity Check

```
# Mass per square meter at surface
mass_per_sqm = atmosphere_mass / area
```

The mass per square meter is ${mass_per_sqm}, which makes sense - roughly 10 tonnes pressing down on every square meter.
