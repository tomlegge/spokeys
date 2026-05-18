import { useMemo } from "react";
import { Link } from "react-router-dom";
import { RIDES } from "../data/rides";
import { formatKm, formatM } from "../utils/routeLoader";
import { useRideRoutes, type LoadedRide } from "../utils/useRideRoutes";
import {
  countRealRiders,
  displayName,
  isNonRider,
} from "../utils/riders";

// Reference heights for fun comparisons in the elevation card.
const EVEREST_M = 8849;
// Equatorial circumference of the Earth in kilometres.
const EARTH_CIRCUMFERENCE_KM = 40_075;

type RiderTotals = { name: string; rides: number; totalKm: number };
type YearStats = { year: number; rides: number; distanceKm: number };

/** Narrow a LoadedRide to one that definitely has data. */
type ReadyRide = LoadedRide & { status: "ready"; data: NonNullable<LoadedRide["data"]> };

function isReady(lr: LoadedRide): lr is ReadyRide {
  return lr.status === "ready" && !!lr.data;
}

export default function StatsPage() {
  const loaded = useRideRoutes();
  const isLoading = loaded.some((lr) => lr.status === "loading");

  const ready = useMemo(() => loaded.filter(isReady), [loaded]);

  // ---------- Group summary ----------
  const totalRouteKm = useMemo(
    () => ready.reduce((s, lr) => s + lr.data.stats.distanceKm, 0),
    [ready],
  );
  const combinedRiderKm = useMemo(
    () =>
      ready.reduce(
        (s, lr) => s + lr.data.stats.distanceKm * countRealRiders(lr.ride),
        0,
      ),
    [ready],
  );
  const totalElevationM = useMemo(
    () => ready.reduce((s, lr) => s + lr.data.stats.elevationGainM, 0),
    [ready],
  );
  const yearRange = useMemo(() => {
    const years = RIDES.map((r) => new Date(r.date).getFullYear()).filter(
      (y) => !Number.isNaN(y),
    );
    if (years.length === 0) return "—";
    const min = Math.min(...years);
    const max = Math.max(...years);
    return min === max ? `${min}` : `${min} – ${max}`;
  }, []);

  const earthPercent = (combinedRiderKm / EARTH_CIRCUMFERENCE_KM) * 100;
  const everestCount = totalElevationM / EVEREST_M;

  // ---------- Notable rides ----------
  const longest = useMemo(
    () =>
      ready.reduce<ReadyRide | null>(
        (best, lr) =>
          !best || lr.data.stats.distanceKm > best.data.stats.distanceKm
            ? lr
            : best,
        null,
      ),
    [ready],
  );
  const biggestClimb = useMemo(
    () =>
      ready.reduce<ReadyRide | null>(
        (best, lr) =>
          !best ||
          lr.data.stats.elevationGainM > best.data.stats.elevationGainM
            ? lr
            : best,
        null,
      ),
    [ready],
  );
  const mostRiders = useMemo(() => {
    // Look across ALL rides (even those without a GPX) — rider count doesn't
    // depend on having a route file.
    let best: { ride: typeof RIDES[number]; count: number } | null = null;
    for (const r of RIDES) {
      const count = countRealRiders(r);
      if (!best || count > best.count) best = { ride: r, count };
    }
    return best;
  }, []);

  // ---------- Activity by year ----------
  const byYear = useMemo<YearStats[]>(() => {
    const map = new Map<number, YearStats>();
    for (const lr of ready) {
      const year = new Date(lr.ride.date).getFullYear();
      if (Number.isNaN(year)) continue;
      const km = lr.data.stats.distanceKm;
      const entry = map.get(year);
      if (entry) {
        entry.rides += 1;
        entry.distanceKm += km;
      } else {
        map.set(year, { year, rides: 1, distanceKm: km });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.year - a.year);
  }, [ready]);

  const maxYearKm = useMemo(
    () => byYear.reduce((m, y) => Math.max(m, y.distanceKm), 0),
    [byYear],
  );

  // ---------- Rider leaderboard (moved from AboutPage) ----------
  const riderTotals = useMemo<RiderTotals[]>(() => {
    const map = new Map<string, RiderTotals>();
    for (const lr of ready) {
      const km = lr.data.stats.distanceKm;
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
      (a, b) =>
        b.totalKm - a.totalKm ||
        b.rides - a.rides ||
        a.name.localeCompare(b.name),
    );
  }, [ready]);

  return (
    <div className="stats-page">
      <header className="stats-head">
        <h1>Stats</h1>
        {isLoading && (
          <p className="stats-loading">Still loading routes…</p>
        )}
      </header>

      <section className="stats-section">
        <h2>Group at a glance</h2>
        <div className="stats-cards">
          <StatCard label="Years active" value={yearRange} />
          <StatCard label="Rides logged" value={RIDES.length.toString()} />
          <StatCard
            label="Total route distance"
            value={formatKm(totalRouteKm)}
          />
          <StatCard
            label="Combined rider distance"
            value={formatKm(combinedRiderKm)}
            sub={`${formatPercent(earthPercent)} of the way around the Earth`}
          />
          <StatCard
            label="Total elevation climbed"
            value={formatM(totalElevationM)}
            sub={
              totalElevationM > 0
                ? `≈ ${everestCount.toFixed(1)} × Everest`
                : undefined
            }
          />
        </div>
      </section>

      <section className="stats-section">
        <h2>Notable rides</h2>
        <ul className="notable-list">
          {longest && (
            <li>
              <span className="notable-label">Longest ride</span>
              <span className="notable-value">
                <Link to={`/rides/${longest.ride.slug}`}>
                  {longest.ride.title}
                </Link>{" "}
                — {formatKm(longest.data.stats.distanceKm)}
              </span>
            </li>
          )}
          {biggestClimb && (
            <li>
              <span className="notable-label">Biggest climb</span>
              <span className="notable-value">
                <Link to={`/rides/${biggestClimb.ride.slug}`}>
                  {biggestClimb.ride.title}
                </Link>{" "}
                — ↑ {formatM(biggestClimb.data.stats.elevationGainM)}
              </span>
            </li>
          )}
          {mostRiders && (
            <li>
              <span className="notable-label">Most riders</span>
              <span className="notable-value">
                <Link to={`/rides/${mostRiders.ride.slug}`}>
                  {mostRiders.ride.title}
                </Link>{" "}
                — {mostRiders.count} rider
                {mostRiders.count === 1 ? "" : "s"}
              </span>
            </li>
          )}
        </ul>
      </section>

      <section className="stats-section">
        <h2>Activity by year</h2>
        {byYear.length === 0 ? (
          <p>No ride data loaded yet.</p>
        ) : (
          <table className="year-table">
            <thead>
              <tr>
                <th scope="col">Year</th>
                <th scope="col" className="num">
                  Rides
                </th>
                <th scope="col" className="num">
                  Distance
                </th>
                <th scope="col" className="year-bar-col">
                  &nbsp;
                </th>
              </tr>
            </thead>
            <tbody>
              {byYear.map((y) => (
                <tr key={y.year}>
                  <td>{y.year}</td>
                  <td className="num">{y.rides}</td>
                  <td className="num">{formatKm(y.distanceKm)}</td>
                  <td className="year-bar-col">
                    <div className="year-bar-track">
                      <div
                        className="year-bar-fill"
                        style={{
                          width:
                            maxYearKm > 0
                              ? `${(y.distanceKm / maxYearKm) * 100}%`
                              : "0%",
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="stats-section">
        <h2>Rider leaderboard</h2>
        <p className="rider-table-note">
          Total distance each rider has covered across all Spokeys rides with a
          recorded GPX track. Rides without a GPX file aren't counted.
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
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-card-label">{label}</div>
      <div className="stat-card-value">{value}</div>
      {sub && <div className="stat-card-sub">{sub}</div>}
    </div>
  );
}

function formatPercent(p: number): string {
  if (!isFinite(p) || p <= 0) return "0%";
  if (p < 1) return `${p.toFixed(2)}%`;
  if (p < 10) return `${p.toFixed(1)}%`;
  return `${Math.round(p)}%`;
}
