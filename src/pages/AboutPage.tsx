import { useMemo } from "react";
import { formatKm } from "../utils/routeLoader";
import { useRideRoutes } from "../utils/useRideRoutes";
import { displayName, isNonRider } from "../utils/riders";

type RiderTotals = {
  name: string;
  rides: number;
  totalKm: number;
};

export default function AboutPage() {
  const loaded = useRideRoutes();

  const isLoading = loaded.some((lr) => lr.status === "loading");

  const riderTotals = useMemo<RiderTotals[]>(() => {
    const map = new Map<string, RiderTotals>();
    for (const lr of loaded) {
      if (lr.status !== "ready" || !lr.data) continue;
      const km = lr.data.stats.distanceKm;
      // De-dupe within a single ride in case the same name appears twice.
      const seen = new Set<string>();
      for (const raw of lr.ride.riders) {
        if (isNonRider(raw)) continue;
        const name = displayName(raw);
        if (!name) continue;
        if (seen.has(name)) continue;
        seen.add(name);
        const existing = map.get(name);
        if (existing) {
          existing.rides += 1;
          existing.totalKm += km;
        } else {
          map.set(name, { name, rides: 1, totalKm: km });
        }
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => b.totalKm - a.totalKm || b.rides - a.rides || a.name.localeCompare(b.name),
    );
  }, [loaded]);

  return (
    <div className="about-page">
      <h1>About the Spokeys</h1>
      <p>
        We're a group of friends who ride bikes together. This site is a
        living archive of the routes we've taken.
      </p>

      <h2>Rider leaderboard</h2>
      <p className="rider-table-note">
        Total distance each rider has covered across all Spokeys rides with a
        recorded GPX track. Rides without a GPX file aren't counted.
        {isLoading && " Still loading routes…"}
      </p>
      {riderTotals.length === 0 ? (
        <p>No rider stats available yet.</p>
      ) : (
        <table className="rider-table">
          <thead>
            <tr>
              <th scope="col">Rider</th>
              <th scope="col" className="num">
                Rides
              </th>
              <th scope="col" className="num">
                Total distance
              </th>
            </tr>
          </thead>
          <tbody>
            {riderTotals.map((r) => (
              <tr key={r.name}>
                <td>{r.name}</td>
                <td className="num">{r.rides}</td>
                <td className="num">{formatKm(r.totalKm)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
