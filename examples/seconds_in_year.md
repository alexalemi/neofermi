# How Many Seconds in a Year?

A quick sanity check that everyone should know.

## The Quick Mental Math

```
# Approximate calculation
quick_estimate = 60 * 60 * 24 * 365
```

60 seconds × 60 minutes × 24 hours × 365 days = **${quick_estimate}** seconds

## More Precise (with leap years)

```
# Using the year distribution (accounts for leap years)
seconds_exact = year as second
```

With leap years: **${seconds_exact}**

## The Famous Approximation

A useful fact: there are approximately **π × 10^7** seconds in a year!

```
# Check the approximation
pi_approximation = pi * 10^7
error_percent = (pi_approximation - seconds_per_year) / seconds_per_year * 100
```

π × 10^7 = ${pi_approximation}

The approximation is off by only ${error_percent}%!

## Useful Conversions

```
# Milliseconds in a year
ms_per_year = seconds_per_year * 1000

# Nanoseconds in a year
ns_per_year = seconds_per_year * 1e9
```

- Milliseconds per year: ${ms_per_year}
- Nanoseconds per year: ${ns_per_year}
