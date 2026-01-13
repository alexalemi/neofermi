# How Many Piano Tuners in Chicago?

The classic Fermi problem, originally attributed to Enrico Fermi himself.

## Assumptions

```
# Chicago population
chicago_pop = 2.5 to 3 million

# What fraction of households have a piano?
households_per_person = 0.4 to 0.5
pianos_per_household = 0.02 to 0.05

# How often does a piano need tuning?
tunings_per_year = 1 to 2

# How many pianos can one tuner service per day?
tunings_per_day = 3 to 5
workdays_per_year = 200 to 250
```

## Calculation

```
# Total pianos in Chicago
total_pianos = chicago_pop * households_per_person * pianos_per_household

# Total tunings needed per year
tunings_needed = total_pianos * tunings_per_year

# Capacity of one tuner per year
tuner_capacity = tunings_per_day * workdays_per_year

# Number of tuners needed
num_tuners = tunings_needed / tuner_capacity
```

## Result

Chicago needs approximately **${num_tuners}** piano tuners.

For comparison: A 2012 Yellow Pages search found about 80-100 piano tuners listed in Chicago.
