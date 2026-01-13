# Estimating the Earth's Circumference

A classic Fermi estimation using what we know about time zones and the United States.

## What We Know

The Earth has 24 time zones (one for each hour). The continental US spans about 4 of these time zones (Eastern, Central, Mountain, Pacific). And we roughly know how wide the US is.

## The Estimation

### US Width

The continental US is roughly 2000-3000 miles wide:

```
us_width = 2000 to 3000 mile
```

### Time Zone Width

The US spans about 4 time zones, so each time zone is:

```
us_timezones = 3 to 5
timezone_width = us_width / us_timezones
```

### Earth's Circumference

With 24 time zones around the Earth:

```
num_timezones = 24
earth_circumference = timezone_width * num_timezones
```

### Convert to Kilometers

```
earth_circumference as km
```

## Result

The Earth's circumference is approximately **${earth_circumference}** or **${earth_circumference_km}**.

The actual value is about 24,901 miles (40,075 km) - let's see how close our estimate is!
