# Comparing Energy Storage Technologies

How do different energy storage methods compare? Let's use energy density constants to explore this.

## The Problem

You want to store 1 GJ of energy. How much mass would you need for different storage methods?

## Setup

```
energy_needed = 1 GJ
```

## Calculations

### Gasoline

Gasoline has one of the highest practical energy densities:

```
gasoline_mass = energy_needed / energy_density_gasoline
```

### Lithium-Ion Batteries

Modern batteries are much less energy-dense:

```
battery_mass = energy_needed / energy_density_lithium_battery
```

### Hydrogen

Hydrogen has excellent gravimetric density but is hard to store:

```
hydrogen_mass = energy_needed / energy_density_hydrogen
```

### Uranium (Fission)

Nuclear fuel is in a completely different league:

```
uranium_mass = energy_needed / energy_density_uranium
```

## Results

To store 1 GJ of energy, you'd need:

| Fuel | Mass Required |
|------|---------------|
| Gasoline | **${gasoline_mass}** |
| Li-ion Battery | **${battery_mass}** |
| Hydrogen | **${hydrogen_mass}** |
| Uranium-235 | **${uranium_mass}** |

## Insight

This explains why electric vehicles need such large, heavy battery packs compared to a small gas tank. The ratio of battery to gasoline mass is roughly:

```
battery_to_gas_ratio = energy_density_gasoline / energy_density_lithium_battery
```

Batteries need about **${battery_to_gas_ratio}x** more mass than gasoline for the same energy!
