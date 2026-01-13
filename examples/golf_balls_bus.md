# How Many Golf Balls Fit in a School Bus?

A popular interview question that tests spatial reasoning.

## School Bus Dimensions

```
# Interior dimensions of a school bus
bus_length = 20 to 25 feet
bus_width = 6 to 7 feet
bus_height = 5 to 6 feet

# Bus interior volume
bus_volume = bus_length * bus_width * bus_height
bus_volume_m3 = bus_volume as m^3
```

## Golf Ball Size

```
# Golf ball diameter (regulation is 42.67mm minimum)
ball_diameter = 42 to 44 mm
ball_radius = ball_diameter / 2

# Volume of a sphere: (4/3)πr³
ball_volume = (4/3) * pi * ball_radius^3
```

## Packing Efficiency

Random packing of spheres achieves about 64% density.
Optimal (hexagonal close packing) is about 74%.

```
# Packing efficiency for random packing
packing_efficiency = 0.60 to 0.68
```

## Calculation

```
# Number of golf balls
num_balls = (bus_volume * packing_efficiency) / ball_volume
```

## Result

A school bus can hold approximately **${num_balls}** golf balls.

That's roughly 300,000-500,000 balls!
