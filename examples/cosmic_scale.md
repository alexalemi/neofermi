# Cosmic Distances and Scale

How vast is the universe? Let's use our astronomical constants to build intuition.

## Earth to Sun

```
earth_sun_distance = AU
light_minutes_to_sun = AU / c / minute
```

Earth is **${AU}** from the Sun. Light takes about **${light_minutes_to_sun}** to reach us.

## The Nearest Star

Proxima Centauri is the closest star beyond our Sun:

```
proxima_distance = d_proxima
proxima_in_au = d_proxima / AU
light_years_to_proxima = d_proxima / ly
```

Proxima Centauri is:
- **${proxima_in_au}** AU away
- **${light_years_to_proxima}** light years away

## Travel Time at Different Speeds

How long to reach Proxima Centauri?

### Walking (5 km/h)
```
walk_speed = 5 km/hour
walk_time_proxima = d_proxima / walk_speed
walk_time_years = walk_time_proxima / year
```

Walking: **${walk_time_years}** years

### Voyager 1 Speed (~17 km/s)
```
voyager_speed = 17 km/s
voyager_time = d_proxima / voyager_speed
voyager_time_years = voyager_time / year
```

At Voyager speed: **${voyager_time_years}** years

### 10% Speed of Light
```
fast_ship = 0.1 * c
fast_time = d_proxima / fast_ship
```

At 0.1c: **${fast_time}** - much more reasonable!

## The Milky Way

Our galaxy is enormous:

```
galaxy_diameter = milky_way_diameter
galaxy_in_ly = milky_way_diameter / ly
num_stars = milky_way_stars
```

- Diameter: **${galaxy_in_ly}** light years
- Contains: **${num_stars}** stars

## Stars per Cubic Light Year

```
galaxy_volume = (4/3) * pi * (milky_way_diameter/2)^3
stars_per_ly3 = milky_way_stars / galaxy_volume * ly^3
```

There are roughly **${stars_per_ly3}** stars per cubic light year - space is mostly empty!

## If the Sun Were a Grain of Sand

Let's scale things down. If the Sun (radius ${R_sun}) were a 1mm grain of sand:

```
scale_factor = 1 mm / R_sun
scaled_earth_distance = AU * scale_factor
scaled_proxima = d_proxima * scale_factor
```

- Earth would be **${scaled_earth_distance}** away (about 10 meters)
- Proxima Centauri would be **${scaled_proxima}** away (about 270 km!)

The nearest star is like a grain of sand 270 km from another grain of sand.
