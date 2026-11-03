# How much electricity does an American home use?

Nobody knows their fridge's wattage, but you can work it out from foam insulation and a heat pump. Building up a home's use from physics, one appliance at a time.

The average US household has about 2.5 people. Most of a home's electricity goes to moving heat around: out of the fridge, into the hot water, into or out of the house. Each of those is a small physics problem.

## The fridge

A fridge is an insulated box with a heat pump bolted on. Heat leaks in through the walls at a rate set by the foam's conductivity, its thickness, the box's surface area and the temperature difference. Fridge foam is 4 to 6 cm of polyurethane, one of the best insulators you can buy.

```
box_area = 5 to 7 m^2
foam = 4 to 6 cm
k_foam = 0.022 to 0.03 W/(m*K)
colder_than_room = 20 to 30 K
heat_leak = k_foam * box_area * colder_than_room / foam
```

The fresh-food compartment sits about 17 K below room temperature and the freezer about 40 K below, hence 20 to 30 K on average. Door gaskets, door openings and warm leftovers add to the conducted heat. The compressor moves 1.5 to 2.5 joules of heat for each joule of electricity it uses; that ratio is its coefficient of performance (COP).

```
extra_heat = 1.3 to 2
fridge_cop = 1.5 to 2.5
fridge = heat_leak * extra_heat / fridge_cop
fridge as kWh/year
```

## Hot water

Heating water takes 4.18 kJ per kilogram per kelvin. Showers dominate: a shower head runs at 7 to 9.5 liters a minute. Sinks, the dishwasher and the washing machine add another half again.

```
people = 2.5
shower = 7 to 9.5 L/minute * 6 to 10 minute
other_uses = 1.3 to 1.8
hot_water_volume = people * shower * other_uses * 1 per day
temperature_rise = 25 to 35 K
c_water = 4.18 kJ/(kg*K)
hot_water_heat = hot_water_volume * 1 kg/L * c_water * temperature_rise
```

Tank heaters lose some heat through their walls while they wait. Only about half of US homes heat water with electricity; the rest use gas.

```
tank_efficiency = 85% to 95%
electric_water_share = 45% to 50%
hot_water = electric_water_share * hot_water_heat / tank_efficiency
hot_water as kWh/year
```

## Heating and cooling

A house loses heat the same way the fridge gains it, through the walls, roof, windows and floor. The envelope of a 180 m² house is 300 to 450 m² of surface. Its average U-value (conductivity over thickness, already worked out) is 0.4 to 0.8 W/(m²·K) once you average insulated walls with leaky windows. Drafts add another 20% to 60%.

```
envelope = 300 to 450 m^2
u_value = 0.4 to 0.8 W/(m^2*K)
drafts = 1.2 to 1.6
heat_loss = envelope * u_value * drafts
```

That's a heat-loss rate in watts per kelvin. A heating degree-day is one day spent one kelvin below about 18 °C, so the year's heat need is that rate times the degree-days. Weighted by where people live, the US has about 4,200 °F-days a year, roughly 2,300 K·day.

The "a year" matters. Leave the `/year` off and `heat_needed` is a one-off amount of energy, which can't be added to the fridge's watts. NeoFermi stops at the sum with "Cannot add quantities with incompatible units: watt and watt day". That's how the first draft of this page failed.

```
heating_degree_days = 2000 to 2600 K*day/year
heat_needed = heat_loss * heating_degree_days
```

About 40% of homes heat with electricity, but they're concentrated in the South, where winters are roughly half as cold. Some use heat pumps (COP 2 to 3), others resistance heaters (COP 1).

```
electric_heat_share = 38% to 42%
southern_winters = 0.4 to 0.6
heater_cop = 1.3 to 2.2
heating = electric_heat_share * southern_winters * heat_needed / heater_cop
heating as kWh/year
```

Cooling uses the same heat-loss rate with cooling degree-days, about 750 K·day a year nationally. Sunlight through windows and heat from people and appliances add to the load. Nearly 90% of homes have air conditioning, at a COP of 3 to 4.

```
cooling_degree_days = 600 to 900 K*day/year
sun_and_appliances = 1.2 to 1.8
ac_share = 85% to 92%
ac_cop = 3 to 4
cooling = ac_share * heat_loss * cooling_degree_days * sun_and_appliances / ac_cop
cooling as kWh/year
```

## The dryer

A dryer's job is to evaporate water, which takes 2.26 MJ per kilogram. After the spin cycle a load still holds 2 to 3 kg of water, and a dryer loses much of its heat out the vent.

```
loads = 5 to 8 per week
water_per_load = 2 to 3 kg
latent_heat = 2.26 MJ/kg
dryer_efficiency = 50% to 70%
electric_dryer_share = 70% to 80%
dryer = electric_dryer_share * loads * water_per_load * latent_heat / dryer_efficiency
dryer as kWh/year
```

## Everything that just draws power

These are easier to guess directly: watts times hours. Standby loads (router, cable box, chargers, the TV waiting for its remote) run all day.

```
lighting = 30 to 50 * 8 to 12 W * 1.5 to 3 hour/day
screens = 2 to 3 * 50 to 120 W * 3 to 5 hour/day
standby = 10 to 20 * 3 to 8 W
cooking = 55% to 65% * 1 to 2 kWh/day
dishwasher = 3 to 5 per week * 1 to 1.5 kWh
everything_else = 300 to 900 kWh/year
small_loads = lighting + screens + standby + cooking + dishwasher + everything_else
small_loads as kWh/year
```

## The total

```
total = fridge + hot_water + heating + cooling + dryer + small_loads as kWh/year
```

The lines above were in watts, kJ per day, MJ per week and kWh per year, and they add without any manual conversion.

Which of these guesses is worth checking first?

```
sensitivity(total)
```

The house, not the appliances. The U-value and envelope area set the heat-loss rate, which feeds both heating and cooling, so they carry about half the uncertainty. Thirty-odd other guesses barely register. For your own home, the insulation is the thing to look up, or a past year's heating bill.

## How close is it?

The average US home used **10,791 kWh** of electricity in 2022 ([EIA](https://www.eia.gov/tools/faqs/faq.php?id=97&t=3)). The estimate of ${total} is close. The EIA's breakdown puts space cooling and space heating at the top, as here.
