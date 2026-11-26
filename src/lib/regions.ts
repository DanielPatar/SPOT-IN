/**
 * Search regions offered on the home search bar ("Di mana?"). A region matches every
 * property city that contains its name, so "Jakarta" covers Jakarta Selatan, Jakarta Barat, …
 */
export const REGIONS = ["Jakarta", "Bogor", "Depok", "Tangerang", "Bekasi"] as const;

export function regionOf(city: string | undefined | null): string | null {
  if (!city) return null;
  return REGIONS.find((r) => r.toLowerCase() === city.trim().toLowerCase()) ?? null;
}

/** Cities that no region already covers (shown as extra choices). */
export function citiesOutsideRegions(cities: string[]): string[] {
  return cities.filter((c) => !REGIONS.some((r) => c.toLowerCase().includes(r.toLowerCase())));
}
