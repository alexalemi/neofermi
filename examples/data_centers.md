# How Much Power Do Data Centers Use?

Estimating global data center energy consumption.

## Number of Data Centers

```
# Major hyperscale data centers (Google, Amazon, Microsoft, etc.)
hyperscale_centers = 500 to 800

# Smaller enterprise data centers
enterprise_centers = 5000 to 10000

# Power per hyperscale center (MW)
hyperscale_power = 50 to 200 MW

# Power per enterprise center (MW)
enterprise_power = 1 to 10 MW
```

## Calculation

```
# Total hyperscale power
hyperscale_total = hyperscale_centers * hyperscale_power

# Total enterprise power
enterprise_total = enterprise_centers * enterprise_power

# Total data center power
total_power = hyperscale_total + enterprise_total
```

## Annual Energy

```
# Hours per year
hours_in_year = seconds_per_year / seconds_per_hour

# Annual energy consumption
annual_energy = total_power * hours_in_year
annual_energy_twh = annual_energy as GW hour
```

## Result

Global data centers consume approximately **${total_power}** of power.

That's roughly ${annual_energy_twh} per year!

For context, this is about 1-2% of global electricity consumption.
