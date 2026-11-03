# How much does Earth's atmosphere weigh?

Air pressure is the weight of the air overhead, so pressure times area gives a force. The units won't let you call that force a mass, and a second pass with the scale height of the atmosphere gets within 1% of the measured value.

## First pass: pressure times area

Sea-level pressure and Earth's surface area are built in as `atm` and `earth_surface_area`.

```
pressure = atm
area = earth_surface_area
force = pressure * area
force as N
```

Pascals times square meters is newtons, a force. It's tempting to stop here and call this the atmosphere's mass, but `force as kg` fails with "Cannot convert Pa m^2 to kg: incompatible dimensions". To turn a weight into a mass, divide by the gravitational acceleration `g`.

```
first_pass = force / g as kg
```

## Second pass: the ground isn't at sea level

`atm` is the pressure at sea level, but 29% of Earth's surface is land, averaging 0.6 to 1 km above the sea. Less air sits above high ground. How much less depends on how quickly pressure falls with height.

Pressure falls by a factor of *e* every scale height, which is set by how hard gravity pulls air down against its thermal motion: *H = RT / (Mg)*. Air's molar mass is 29 g/mol, and the lower atmosphere averages 250 to 290 K.

```
air_molar_mass = 29 g/mol
air_temperature = 250 to 290 K
scale_height = R * air_temperature / (air_molar_mass * g) as km
```

That's ${scale_height}, about the height of Everest. Over land, the pressure is lower by a factor of *e*<sup>−h/H</sup>.

```
land = 29%
land_height = 0.6 to 1 km
pressure_factor = (1 - land) + land * exp(-land_height / scale_height)
mass = first_pass * pressure_factor
```

## How close is it?

Trenberth and Smith put the atmosphere's mass at **5.148 × 10<sup>18</sup> kg** ([Journal of Climate, 2005](https://journals.ametsoc.org/view/journals/clim/18/6/jcli-3299.1.xml)). The first pass gave ${first_pass}, 2% high. With the land correction it's ${mass}.
