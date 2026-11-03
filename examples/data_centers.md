# How much electricity do the world's data centers use?

Nobody publishes a count of the world's servers, but vendors report how many they ship. The installed base is shipments times lifetime, and each server's draw comes from its parts.

## How many machines

Industry trackers count about 12 million servers shipped a year. A server runs for four to six years before it's replaced, so the installed base is shipments times lifetime. It's the same reasoning as "people per year born, times lifespan, is population".

```
server_shipments = 11 to 14 million per year
server_lifetime = 4 to 6 year
servers = server_shipments * server_lifetime
```

AI accelerators are newer. Shipments have only recently reached a few million a year, so the fleet is younger and smaller than the lifetime alone would suggest.

```
accelerator_shipments = 2 to 5 million per year
accelerator_age = 2 to 4 year
accelerators = accelerator_shipments * accelerator_age
```

## How much each one draws

A typical server has two CPUs rated at 150 to 350 W each, but servers spend most of their time well below full load. Memory, disks, fans and power-supply losses add 100 to 200 W.

```
cpu_rating = 150 to 350 W
cpu_load = 30% to 60%
rest_of_server = 100 to 200 W
server_power = 2 * cpu_rating * cpu_load + rest_of_server
```

A data-center GPU is rated at 400 to 1000 W and runs much closer to its limit than a CPU does. Its share of the host server it sits in adds a bit more.

```
accelerator_rating = 400 to 1000 W
accelerator_load = 60% to 90%
host_share = 100 to 250 W
accelerator_power = accelerator_rating * accelerator_load + host_share
```

## From watts to terawatt-hours

Storage arrays and network switches add 10% to 25% on top of the servers. Cooling and power conversion add more: the ratio of a site's total power to its IT power is its power usage effectiveness (PUE), about 1.1 for the best hyperscale sites and 1.5 or more for older ones.

```
storage_and_network = 1.1 to 1.25
pue = 1.2 to 1.6
it_power = servers * server_power + accelerators * accelerator_power
energy = it_power * storage_and_network * pue * 1 year as TWh
```

The world generates roughly 27,000 to 30,000 TWh of electricity a year.

```
world = 27000 to 30000 TWh
share = energy / world as percent
```

## How close is it?

The International Energy Agency estimates data centers used **415 TWh** in 2024, about 1.5% of global electricity ([IEA, Energy and AI](https://www.iea.org/reports/energy-and-ai/executive-summary)). The estimate of ${energy}, or ${share}, brackets both figures.
