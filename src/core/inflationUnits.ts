/**
 * Historical US dollar purchasing-power units (inflation-adjusted).
 *
 * Registers `dollarsYYYY` pseudo-units for every year from 1913 onward,
 * each defined as `(CPI_anchor / CPI_YYYY) USD`. The Frink-style spelling
 * `dollars_YYYY` is accepted on input via an alias in UNIT_ALIASES; the
 * canonical (mathjs-compatible, underscore-free) form appears on output.
 *
 *   100 dollars_1960 as USD   → present-day equivalent of $100 in 1960
 *   1 dollars_1980 + 1 dollars_2020 as USD  → same dimension, mixes fine
 *
 * Data source: FRED series CPIAUCNS (Consumer Price Index for All Urban
 * Consumers: All Items, Not Seasonally Adjusted), annual averages
 * computed from monthly observations. Last refresh: 2026-04-17,
 * covering data through 2026-03.
 *
 * Anchor: the most recent monthly CPI value (March 2026 = 330.213),
 * so `dollars_YYYY` represents "inflate to right now." Partial-year
 * averages are used for the current year.
 *
 * Precision: CPI values stored to 4 decimals; ratios emitted at 4
 * sig figs to match the calculator's precision model.
 */

/** Most recent monthly CPI-U value — the "present" anchor. */
export const CPI_ANCHOR = 330.213

/** Annual-average CPI-U by year, from FRED CPIAUCNS. */
export const CPI_ANNUAL: Record<number, number> = {
  1913: 9.8833,
  1914: 10.0167,
  1915: 10.1083,
  1916: 10.8833,
  1917: 12.8250,
  1918: 15.0417,
  1919: 17.3333,
  1920: 20.0417,
  1921: 17.8500,
  1922: 16.7500,
  1923: 17.0500,
  1924: 17.1250,
  1925: 17.5417,
  1926: 17.7000,
  1927: 17.3583,
  1928: 17.1583,
  1929: 17.1583,
  1930: 16.7000,
  1931: 15.2083,
  1932: 13.6417,
  1933: 12.9333,
  1934: 13.3833,
  1935: 13.7250,
  1936: 13.8667,
  1937: 14.3833,
  1938: 14.0917,
  1939: 13.9083,
  1940: 14.0083,
  1941: 14.7250,
  1942: 16.3333,
  1943: 17.3083,
  1944: 17.5917,
  1945: 17.9917,
  1946: 19.5167,
  1947: 22.3250,
  1948: 24.0417,
  1949: 23.8083,
  1950: 24.0667,
  1951: 25.9583,
  1952: 26.5500,
  1953: 26.7667,
  1954: 26.8500,
  1955: 26.7750,
  1956: 27.1833,
  1957: 28.0917,
  1958: 28.8583,
  1959: 29.1500,
  1960: 29.5750,
  1961: 29.8917,
  1962: 30.2500,
  1963: 30.6250,
  1964: 31.0167,
  1965: 31.5083,
  1966: 32.4583,
  1967: 33.3583,
  1968: 34.7833,
  1969: 36.6833,
  1970: 38.8250,
  1971: 40.4917,
  1972: 41.8167,
  1973: 44.4000,
  1974: 49.3083,
  1975: 53.8167,
  1976: 56.9083,
  1977: 60.6083,
  1978: 65.2333,
  1979: 72.5750,
  1980: 82.4083,
  1981: 90.9250,
  1982: 96.5000,
  1983: 99.6000,
  1984: 103.8833,
  1985: 107.5667,
  1986: 109.6083,
  1987: 113.6250,
  1988: 118.2583,
  1989: 123.9667,
  1990: 130.6583,
  1991: 136.1917,
  1992: 140.3167,
  1993: 144.4583,
  1994: 148.2250,
  1995: 152.3833,
  1996: 156.8500,
  1997: 160.5167,
  1998: 163.0083,
  1999: 166.5750,
  2000: 172.2000,
  2001: 177.0667,
  2002: 179.8750,
  2003: 183.9583,
  2004: 188.8833,
  2005: 195.2917,
  2006: 201.5917,
  2007: 207.3424,
  2008: 215.3025,
  2009: 214.5370,
  2010: 218.0555,
  2011: 224.9392,
  2012: 229.5939,
  2013: 232.9571,
  2014: 236.7362,
  2015: 237.0170,
  2016: 240.0072,
  2017: 245.1196,
  2018: 251.1068,
  2019: 255.6574,
  2020: 258.8112,
  2021: 270.9698,
  2022: 292.6549,
  2023: 304.7016,
  2024: 313.6888,
  2025: 321.9430,
  2026: 327.4167,
}

/**
 * Register inflation-adjusted dollar units with mathjs.
 *
 * mathjs forbids underscores in unit names, so the actual mathjs unit is
 * `dollarsYYYY` (alphanumeric). `aliases` is mutated to add the Frink-style
 * `dollars_YYYY` → `dollarsYYYY` mapping, so both spellings work when routed
 * through `normalizeUnit`.
 */
export function registerInflationUnits(
  safeCreate: (name: string, def: string) => void,
  aliases: Record<string, string>,
): void {
  for (const [yearStr, cpi] of Object.entries(CPI_ANNUAL)) {
    const ratio = CPI_ANCHOR / cpi
    const canonical = `dollars${yearStr}`
    safeCreate(canonical, `${ratio.toPrecision(4)} USD`)
    aliases[`dollars_${yearStr}`] = canonical
  }
}
