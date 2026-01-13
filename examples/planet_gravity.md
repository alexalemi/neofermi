# Surface Gravity on Different Planets

How much would you weigh on other planets? Let's calculate surface gravity using planetary masses and radii.

## The Physics

Surface gravity is given by Newton's law: g = GM/R^2

## Earth (baseline)

```
g_earth = G * M_earth / R_earth^2
```

Earth's surface gravity: **${g_earth}**

## Mars

Mars is smaller and less massive:

```
g_mars = G * M_mars / R_mars^2
mars_weight_ratio = g_mars / g_earth
```

On Mars, you'd weigh **${mars_weight_ratio}** of your Earth weight.

## Jupiter

The gas giant is massive but also very large:

```
g_jupiter = G * M_jupiter / R_jupiter^2
jupiter_weight_ratio = g_jupiter / g_earth
```

On Jupiter's "surface" (cloud tops), you'd weigh **${jupiter_weight_ratio}** of your Earth weight.

## The Moon

```
g_moon = G * M_moon / R_moon^2
moon_weight_ratio = g_moon / g_earth
```

On the Moon, you'd weigh only **${moon_weight_ratio}** of your Earth weight - that's why astronauts could hop around!

## Summary

| Body | Surface Gravity | Weight Ratio |
|------|-----------------|--------------|
| Earth | ${g_earth} | 1.0 |
| Mars | ${g_mars} | ${mars_weight_ratio} |
| Moon | ${g_moon} | ${moon_weight_ratio} |
| Jupiter | ${g_jupiter} | ${jupiter_weight_ratio} |

## Escape Velocity Bonus

How fast do you need to go to escape each body?

```
v_escape_earth = sqrt(2 * G * M_earth / R_earth) as km/s
v_escape_mars = sqrt(2 * G * M_mars / R_mars) as km/s
v_escape_moon = sqrt(2 * G * M_moon / R_moon) as km/s
```

- Earth: **${v_escape_earth}**
- Mars: **${v_escape_mars}**
- Moon: **${v_escape_moon}**
