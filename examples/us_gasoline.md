# How much gasoline does the US burn?

Two independent estimates of the same number, one from the cars on the road and one from the pumps at gas stations, reported in the barrels the EIA uses.

## From the cars

There are about 335 million Americans and about three cars or light trucks for every four people. A typical vehicle is driven 10,000 to 13,000 miles a year: about 30 to 35 miles a day.

```
people = 335 million
vehicles_per_person = 0.7 to 0.85
driven = 10000 to 13000 mile/year
```

The fleet's fuel economy is lower than new-car stickers suggest. Older cars, SUVs and pickups pull the average down to the low-to-mid twenties.

```
economy = 21 to 27 mpg
from_cars = people * vehicles_per_person * driven / economy
from_cars as million barrel/day
```

Miles per year divided by miles per gallon is gallons per year. The EIA counts fuel in 42-gallon barrels, and `as million barrel/day` converts gallons per year straight into them.

## From the gas stations

Now the other end. A town of a few thousand people supports one gas station, which puts the country at roughly 120,000 to 160,000 stations.

```
people_per_station = 2000 to 3000
stations = people / people_per_station
```

A station has 8 to 12 nozzles, open most or all of the day. A fill-up (pulling in, paying, pumping, pulling out) takes 4 to 7 minutes. Most of the time most pumps sit idle: think of a station at 2 a.m., or at 2 p.m. on a Tuesday. Say each nozzle is busy 8% to 20% of the hours it's open.

```
nozzles = 8 to 12
open_hours = 18 to 24 hour/day
busy = 8% to 20%
fill_time = 4 to 7 minute
fill_ups = nozzles * open_hours * busy / fill_time
```

Per station, that's ${fill_ups as 1/day} fill-ups. A typical fill-up is 8 to 14 gallons.

```
fill_size = 8 to 14 gallon
from_stations = stations * fill_ups * fill_size
from_stations as million barrel/day
```

The two estimates share only the population, so when they agree it's evidence that neither has gone badly wrong. If they disagreed, the next step would be finding which input is off.

## How close is it?

The US used **8.94 million barrels per day** of motor gasoline in 2023, about 376 million gallons ([EIA](https://www.eia.gov/tools/faqs/faq.php?id=23&t=10)). The car-side estimate of ${from_cars as million barrel/day} comes in a bit low, as it should: it leaves out commercial vans, motorcycles, boats and lawn equipment.
