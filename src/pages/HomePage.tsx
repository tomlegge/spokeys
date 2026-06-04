import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapContainer, Polyline, TileLayer, useMap } from "react-leaflet";
import L, { LatLngBoundsExpression } from "leaflet";
import { RIDES } from "../data/rides";
import { todaysBirthdays } from "../data/birthdays";
import { formatKm, formatM } from "../utils/routeLoader";
import { useRideRoutes } from "../utils/useRideRoutes";
import { countRealRiders } from "../utils/riders";

// Equatorial circumference of the Earth in kilometres. Source: WGS 84 /
// commonly cited figure (~40,075 km).
const EARTH_CIRCUMFERENCE_KM = 40_075;

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

  // Combined "person-distance": for every loaded ride, multiply its distance
  // by the number of riders who actually rode. Excludes BBQ-only / non-riding
  // entries so the figure reflects real kilometres pedalled.
  const combinedRiderDistanceKm = useMemo(
    () =>
      loaded.reduce(
        (sum, lr) =>
          lr.status === "ready" && lr.data
            ? sum + lr.data.stats.distanceKm * countRealRiders(lr.ride)
            : sum,
        0,
      ),
    [loaded],
  );

  const earthPercent =
    (combinedRiderDistanceKm / EARTH_CIRCUMFERENCE_KM) * 100;

  // Memoised so we don't recompute on every render — the result only changes
  // when the page is open across midnight, which we don't bother handling.
  const birthdaysToday = useMemo(() => todaysBirthdays(), []);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const mapPaneRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = useCallback(() => {
    const el = mapPaneRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen().catch(console.error);
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  return (
    <div className="home">
      <aside className="ride-sidebar">
        {birthdaysToday.length > 0 && (
          <div className="birthday-banner" role="status" aria-live="polite">
            <span className="birthday-banner-cake" aria-hidden>🎂</span>
            <span className="birthday-banner-text">
              Happy birthday {formatBirthdayNames(birthdaysToday.map((b) => b.name))}!
            </span>
          </div>
        )}
        <div className="sidebar-head">
          <h1>Our rides</h1>
          <p className="sidebar-sub">
            {RIDES.length} route{RIDES.length === 1 ? "" : "s"}
            {isLoading ? " · loading…" : ""}
          </p>
          <p className="sidebar-total">
            <span className="sidebar-total-label">Total route distance</span>
            <span className="sidebar-total-value">
              {`${Math.round(totalDistanceKm)} km`}
            </span>
          </p>
          <p className="sidebar-total">
            <span className="sidebar-total-label">Combined rider distance</span>
            <span className="sidebar-total-value">
              {`${Math.round(combinedRiderDistanceKm)} km`}
            </span>
          </p>
          <p className="sidebar-earth">
            <span className="sidebar-earth-bar" aria-hidden>
              <span
                className="sidebar-earth-fill"
                style={{
                  width: `${Math.min(100, earthPercent).toFixed(2)}%`,
                }}
              />
            </span>
            <span className="sidebar-earth-text">
              {formatPercent(earthPercent)} of the way around the Earth 🌍
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
                  {lr.status === "no-route" && (
                    <span className="ride-pending">route coming soon</span>
                  )}
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

      <div
        className={`map-pane${isFullscreen ? " map-pane--fullscreen" : ""}`}
        ref={mapPaneRef}
      >
        <button
          className="ride-map-fullscreen-btn"
          onClick={toggleFullscreen}
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          {isFullscreen ? "✕ Exit" : "⤢ Fullscreen"}
        </button>
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
          {loaded.flatMap((lr) =>
            lr.status === "ready" && lr.data
              ? lr.data.segments.map((seg, segIdx) => {
                  // One polyline per segment so disconnected GPX files don't
                  // get joined by a straight line across the map. Transfer
                  // segments (ferries, train hops…) render as a dotted line.
                  const isSelected = selectedSlug === lr.ride.slug;
                  const dimmed = selectedSlug && !isSelected;
                  const baseWeight = isSelected ? 6 : 4;
                  return (
                    <Polyline
                      key={`${lr.ride.slug}#${segIdx}`}
                      positions={seg.points.map((p) => [p.lat, p.lng])}
                      pathOptions={{
                        color: lr.ride.color ?? "#0077b6",
                        weight: seg.transfer ? Math.max(2, baseWeight - 2) : baseWeight,
                        opacity: dimmed ? 0.4 : seg.transfer ? 0.75 : 0.9,
                        dashArray: seg.transfer ? "2 8" : undefined,
                        lineCap: seg.transfer ? "round" : "butt",
                      }}
                      eventHandlers={{
                        click: () => navigate(`/rides/${lr.ride.slug}`),
                        mouseover: () => setSelectedSlug(lr.ride.slug),
                        mouseout: () => setSelectedSlug(null),
                      }}
                    />
                  );
                })
              : [],
          )}
          <FitBoundsOnce bounds={initialBounds} />
          <InvalidateSize trigger={isFullscreen} />
        </MapContainer>
      </div>
    </div>
  );
}

/**
 * Fits the map to the supplied bounds the FIRST time they're available.
 * Doesn't refit later, so user pan/zoom isn't clobbered.
 */
function InvalidateSize({ trigger }: { trigger: boolean }) {
  const map = useMap();
  useEffect(() => {
    const id = setTimeout(() => map.invalidateSize(), 150);
    return () => clearTimeout(id);
  }, [trigger, map]);
  return null;
}

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

/**
 * Joins a list of names into a natural-language string:
 *   ["Tom"]                → "Tom"
 *   ["Tom", "Anita"]       → "Tom and Anita"
 *   ["Tom", "Anita", "Stu"] → "Tom, Anita and Stu"
 */
function formatBirthdayNames(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function formatPercent(p: number): string {
  if (!isFinite(p) || p <= 0) return "0%";
  // Use more precision for small numbers so we don't display "0%" for, say,
  // 0.04% — show "0.04%" instead. For values ≥ 1, one decimal is plenty.
  if (p < 1) return `${p.toFixed(2)}%`;
  if (p < 10) return `${p.toFixed(1)}%`;
  return `${Math.round(p)}%`;
}
