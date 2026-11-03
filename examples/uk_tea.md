# How many cups of tea do Britons drink a day?

A mixture describes one person who might drink no tea, a little or a lot; `mean()` turns that into a national total. Then the heat capacity of water says what all that kettle-boiling costs.

## One person

Britons split into rough groups: some never drink tea (many children and coffee drinkers), some have a cup or two, and some get through a pot's worth a day. A mixture says exactly that, with a weight for each group.

```
cups_per_person = {0 per day: 40%, 1 to 2 per day: 30%, 3 to 6 per day: 30%}
```

That distribution describes one randomly chosen Briton, which is why its plot has a spike at zero.

## Everyone

Multiplying that distribution by the population would treat all 68 million people as making the same choice, so the answer would swing between "nobody drinks tea" and "everybody drinks a pot". The national total depends only on the average person, which `mean()` gives.

```
population = 68 million
cups = population * mean(cups_per_person)
cups as million per day
```

## What the kettles cost

A cup is about 250 mL, but people fill the kettle well past what they need. Boiling raises water from about 15 °C to 100 °C, at 4.18 kJ per kilogram per kelvin, and an electric kettle puts 80% to 90% of its energy into the water.

```
cup = 250 mL
overfill = 1.5 to 2.5
c_water = 4.18 kJ/(kg*K)
per_cup = cup * overfill * 1 kg/L * c_water * 85 K / (80% to 90%)
per_cup as kWh
```

Averaged over the whole day, the country's kettles draw about a third of a large power station's output:

```
kettle_power = cups * per_cup as MW
kettle_power * 1 year as TWh
```

The UK uses about 300 TWh of electricity a year, so tea takes the better part of a percent of it.

## How close is it?

The UK Tea and Infusions Association puts the figure at **over 100 million cups a day** ([UKTIA, 2023](https://tea.co.uk/news/article/tea-loved-by-brits-and-5-billion-cups-of-tea-are-drunk-globally-each-day)). The estimate of ${cups as million per day} agrees.
