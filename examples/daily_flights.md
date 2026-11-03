# How many airline flights take off each day?

How many flights a plane makes in a day comes from distance, cruising speed and how long it sits at the gate. Multiply by the fleet and the hours cancel, leaving flights per day.

## One airliner's day

A typical flight is shorter than you'd guess: most departures are domestic and regional hops, so the average trip is 1,200 to 2,000 km. Jets cruise at about 800 km/h, and taxiing, climbing and descending add half an hour.

```
trip = 1200 to 2000 km
cruise = 750 to 850 km/hour
taxi_and_climb = 0.4 to 0.7 hour
flight_time = trip / cruise + taxi_and_climb
```

Between flights, the plane sits at the gate while passengers get off, it's cleaned and refueled, and the next load boards: 35 to 60 minutes for a narrowbody. Airlines fly their planes from early morning until near midnight.

```
turnaround = 35 to 60 minute
operating_day = 15 to 18 hour/day
flights_per_plane = operating_day / (flight_time + turnaround)
flights_per_plane as 1/day
```

## The whole fleet

There are about 28,000 airliners in the world. On a given day some are in maintenance or parked for lack of demand.

```
fleet = 25000 to 32000
in_service = 80% to 90%
flights = fleet * in_service * flights_per_plane
flights as thousand per day
```

Hours per day divided by hours per flight is flights per day. Without the `as`, NeoFermi shows the same rate per hour, the time unit it simplified to.

## How close is it?

ICAO counted **37.4 million** scheduled departures in 2024 ([ICAO Annual Report](https://www.icao.int/about-icao/AnnualReport2024/world-air-transport-2024)), about 102,000 a day. The estimate of ${flights as thousand per day} is close.
