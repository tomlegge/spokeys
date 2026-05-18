import type { Ride } from "../data/rides";

/**
 * Rider entries in rides.ts sometimes carry parentheticals.
 *
 * Some indicate that the person didn't actually ride (e.g. "Tom (BBQ only)",
 * "Anita (not riding this year)"). Those should be excluded from per-rider
 * stats and from combined person-distance totals.
 *
 * Others are just contextual info (e.g. "Iris (child of Tania and Kostas)").
 * Those count as normal riders. The display name has any trailing parenthetical
 * stripped so "Iris (child of ...)" shows as "Iris".
 */
const NON_RIDER_MARKERS = [
  "not riding",
  "bbq only",
  "did not ride",
  "didn't ride",
  "support",
  "son",
  "daughter",
  "camping",
  "just part"
];

export function isNonRider(name: string): boolean {
  const lower = name.toLowerCase();
  return NON_RIDER_MARKERS.some((m) => lower.includes(m));
}

export function displayName(name: string): string {
  // Strip a single trailing "(...)" group so "Iris (child of X)" → "Iris".
  return name.replace(/\s*\([^)]*\)\s*$/, "").trim();
}

/**
 * Count unique riders on a ride who actually rode (excludes non-riders and
 * de-duplicates the same display name appearing twice).
 */
export function countRealRiders(ride: Ride): number {
  const seen = new Set<string>();
  for (const raw of ride.riders) {
    if (isNonRider(raw)) continue;
    const name = displayName(raw);
    if (!name) continue;
    seen.add(name);
  }
  return seen.size;
}
