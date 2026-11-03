# How many piano tuners work in Chicago?

Fermi's own question, worked from both ends (how many pianos need tuning, how many one tuner can handle) and then asking `sensitivity()` which guess to research next.

## Demand: pianos that need tuning

The Chicago metro area has about 9.4 million people, in households of about 2.5.

```
people = 9.2 to 9.6 million
household_size = 2.4 to 2.7
households = people / household_size
```

What fraction of homes have a piano? Think of the homes you've been in: it's more than one in a hundred and fewer than one in ten. Schools, churches, bars and concert halls add more, perhaps a quarter again as many.

```
have_piano = 3% to 10%
institutional = 1.1 to 1.5
pianos = households * have_piano * institutional
```

Piano technicians recommend tuning once or twice a year. Many home pianos go years without one, though, while a concert piano gets tuned before every performance. Averaged over all of them, somewhere between once every three years and a bit more than once a year.

```
tunings = 0.3 to 1.5 per year
demand = pianos * tunings
```

## Supply: what one tuner can do

A tuning takes one to two hours, and getting to the next client takes another half hour to an hour. A self-employed tuner spends part of each day on scheduling, invoicing and repairs rather than with clients, and takes some weeks off.

```
tuning_time = 1 to 2 hour
travel = 0.5 to 1 hour
client_hours = 6 to 8 hour/day
working_days = 200 to 240 day/year
capacity = client_hours * working_days / (tuning_time + travel) as 1/year
```

Hours per day times days per year, divided by hours per tuning, leaves tunings per year: about ${capacity}.

```
tuners = demand / capacity
```

Tunings per year divided by tunings per tuner-year leaves a count of tuners, about ${tuners}. The range is wide: nearly a factor of eight from end to end.

## Where the uncertainty comes from

Most of that spread comes from one or two guesses. `sensitivity` ranks the inputs by how much of the answer's variance each explains.

```
sensitivity(tuners)
```

Population and household size barely matter; they're the inputs we know well. How often pianos get tuned and how many homes have one carry nearly everything. To tighten the estimate, call a piano tuner and ask how often their clients book, rather than refining the census figures.

## How close is it?

The Bureau of Labor Statistics counts **150** musical instrument repairers and tuners in the Chicago–Naperville–Elgin metro area ([OEWS, May 2025](https://www.bls.gov/oes/current/oes499063.htm)). That figure counts every instrument, not just pianos, and leaves out the self-employed, which many piano tuners are. Both effects are a factor of two or so, in opposite directions, so the estimate is consistent.
