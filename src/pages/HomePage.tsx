import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapContainer, Polyline, TileLayer, useMap } from "react-leaflet";
import L, { LatLngBoundsExpression } from "leaflet";
import { RIDES, type Ride } from "../data/rides";
import {
  formatKm,
  formatM,
  loadRoute,
  type RouteData,
} from "../utils/routeLoader";

type LoadedRide = {
  ride: Ride;
  status: "loading" | "ready" | "error";
  data?: RouteData;
  error?: string;
};

/**
 * Loads every ride's GPX/KML in parallel on first render so we can plot
 * all routes on the overview map and show stats in the sidebar.
 *
 * For a small/medium number of rides (<50) this is fine. If your library
 * grows huge, switch to lazy-loading routes only when selected.
 */
function useRideRoutes(): LoadedRide[] {
  const [state, setState] = useState<LoadedRide[]>(() =>
    RIDES.map((r) => ({ ride: r, status: "loading" })),
  );

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      RIDES.map(async (ride): Promise<LoadedRide> => {
        try {
          const data = await loadRoute(ride.file);
          return { ride, status: "ready", data };
        } catch (err) {
          return {
            ride,
            status: "error",
            error: err instanceof Error ? err.message : String(err),
          };
        }
      }),
    ).then((results) => {
      if (!cancelled) setState(results);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

export default function HomePage() {
  const loaded = useRideRoutes();
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const navigate = useNavigate();

  // Initial map view: bounds containing all routes, or fall back to UK.
  const initialBounds = useMemo<LatLngBoundsExpression | undefined>(() => {
    const allPoints: [number, number][] = [];
    for (const lr of loaded) {
      if (lr.status === "ready" && lr.data) {
        for (const p of lr.data.points) allPoints.push([p.lat, p.lng]);
      }
    }
    if (allPoints.length === 0) return undefined;
    return L.latLngBounds(allPoints).pad(0.1);
  }, [loaded]);

  const isLoading = loaded.some((lr) => lr.status === "loading");

  // Running total of distance across every successfully-loaded ride.
  // Recomputes as routes stream in.
  const totalDistanceKm = useMemo(
    () =>
      loaded.reduce(
        (sum, lr) =>
          lr.status === "ready" && lr.data
            ? sum + lr.data.stats.distanceKm
            : sum,
        0,
      ),
    [loaded],
  );

  return (
    <div className="home">
      <aside className="ride-sidebar">
        <div className="sidebar-head">
          <h1>Our rides</h1>
          <p className="sidebar-sub">
            {RIDES.length} route{RIDES.length === 1 ? "" : "s"}
            {isLoading ? " · loading…" : ""}
          </p>
          <p className="sidebar-total">
            <span className="sidebar-total-label">Total distance</span>
            <span className="sidebar-total-value">
              {formatKm(totalDistanceKm)}
            </span>
          </p>
        </div>
        <ul className="ride-list">
          {[...loaded].reverse().map((lr) => (
            <li
              key={lr.ride.slug}
              className={
                "ride-card" +
                (selectedSlug === lr.ride.slug ? " is-selected" : "")
              }
              onMouseEnter={() => setSelectedSlug(lr.ride.slug)}
              onMouseLeave={() => setSelectedSlug(null)}
              onClick={() => navigate(`/rides/${lr.ride.slug}`)}
            >
              <div
                className="ride-color"
                style={{ background: lr.ride.color ?? "#0077b6" }}
              />
              <div className="ride-card-body">
                <div className="ride-card-title">
                  <Link to={`/rides/${lr.ride.slug}`}>{lr.ride.title}</Link>
                </div>
                <div className="ride-card-meta">
                  {formatDate(lr.ride.date)} ·{" "}
                  {lr.ride.riders.length} rider
                  {lr.ride.riders.length === 1 ? "" : "s"}
                </div>
                <div className="ride-card-stats">
                  {lr.status === "ready" && lr.data && (
                    <>
                      <span>{formatKm(lr.data.stats.distanceKm)}</span>
                      <span>↑ {formatM(lr.data.stats.elevationGainM)}</span>
                    </>
                  )}
                  {lr.status === "loading" && <span>loading…</span>}
                  {lr.status === "error" && (
                    <span className="ride-error" title={lr.error}>
                      could not load route
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </aside>

      <div className="map-pane">
        <MapContainer
          center={[51.5, -0.1]} // London-ish fallback
          zoom={6}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {loaded.map((lr) =>
            lr.status === "ready" && lr.data ? (
              <Polyline
                key={lr.ride.slug}
                positions={lr.data.points.map((p) => [p.lat, p.lng])}
                pathOptions={{
                  color: lr.ride.color ?? "#0077b6",
                  weight: selectedSlug === lr.ride.slug ? 6 : 4,
                  opacity: selectedSlug && selectedSlug !== lr.ride.slug
                    ? 0.4
                    : 0.9,
                }}
                eventHandlers={{
                  click: () => navigate(`/rides/${lr.ride.slug}`),
                  mouseover: () => setSelectedSlug(lr.ride.slug),
                  mouseout: () => setSelectedSlug(null),
                }}
              />
            ) : null,
          )}
          <FitBoundsOnce bounds={initialBounds} />
        </MapContainer>
      </div>
    </div>
  );
}

/**
 * Fits the map to the supplied bounds the FIRST time they're available.
 * Doesn't refit later, so user pan/zoom isn't clobbered.
 */
function FitBoundsOnce({ bounds }: { bounds?: LatLngBoundsExpression }) {
  const map = useMap();
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!done && bounds) {
      map.fitBounds(bounds);
      setDone(true);
    }
  }, [bounds, done, map]);
  return null;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
