# Human Power and Metabolism

How much power does a human generate? Can you power your home by exercising?

## Basal Metabolism

Even at rest, your body burns energy to keep you alive:

```
daily_basal_energy = human_basal_power * day
```

At rest, you use about **${daily_basal_energy}** per day.

In food calories (kcal):

```
daily_basal_kcal = daily_basal_energy / calorie
```

That's roughly **${daily_basal_kcal}** kcal/day - your minimum to survive.

## Exercise Power

During vigorous exercise, power output increases significantly:

```
exercise_power = human_active_power
power_increase = human_active_power / human_basal_power
```

During exercise, you output **${exercise_power}**, which is **${power_increase}x** your resting rate.

## Could You Power Your Home?

A typical US household uses about 30 kWh per day:

```
home_daily_energy = 30 kWh
```

How long would you need to exercise at peak output?

```
exercise_time = home_daily_energy / human_active_power
```

You'd need to exercise for **${exercise_time}** at peak output - clearly not feasible!

## Human vs. Light Bulb

A human at rest outputs about the same power as:

```
equivalent_bulb = human_basal_power
```

You're basically an **${equivalent_bulb}** light bulb!

## Blood as Fuel Transport

Your blood carries oxygen and nutrients to power this metabolism:

```
blood_cycles_per_day = (human_blood_volume * 1440) / human_blood_volume
cardiac_output_estimate = human_blood_volume * 70 / minute
```

Your heart pumps your entire blood volume roughly once per minute during rest.

## Lifetime Energy

Over a lifetime, how much total energy does a human consume?

```
lifetime_energy = human_basal_power * human_lifespan
lifetime_energy_gwh = lifetime_energy as GWh
```

A human consumes roughly **${lifetime_energy_gwh}** over their lifetime - equivalent to:

```
gasoline_equivalent = lifetime_energy / energy_density_gasoline
```

About **${gasoline_equivalent}** of gasoline worth of chemical energy!
