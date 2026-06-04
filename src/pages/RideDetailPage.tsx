import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { peopleInPhoto, RIDES, rideBlogLinks, rideFiles } from "../data/rides";
import {
  formatDuration,
  formatKm,
  formatM,
  loadRoutes,
  type RouteData,
} from "../utils/routeLoader";
import ElevationChart from "../components/ElevationChart";
import PhotoGallery from "../components/PhotoGallery";

// Default Leaflet marker icons reference image files via relative URLs that
// Vite doesn't resolve for us. Use a stable CDN copy so start/end markers show
// up out-of-the-box. Replace with your own assets later if you want.
const startIcon = L.icon({
  iconUrl:
    "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl:
    "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export default function RideDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const ride = RIDES.find((r) => r.slug === slug);

  const [route, setRoute] = useState<RouteData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mapWrapperRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = useCallback(() => {
    const el = mapWrapperRef.current;
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

  // Build a stable key from the ride's file list so the effect re-runs only
  // when the actual file set changes, not on every render. Include the
  // transfer flag so flipping a segment between cycled and transfer also
  // triggers a reload.
  const fileKey = ride
    ? rideFiles(ride)
        .map((f) => `${f.url}${f.transfer ? "*" : ""}`)
        .join("|")
    : "";

  useEffect(() => {
    if (!ride) return;
    setRoute(null);
    setError(null);
    const files = rideFiles(ride);
    if (files.length === 0) return; // no GPX yet — just skip the load
    loadRoutes(files)
      .then(setRoute)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [fileKey]);

  // One array of [lat,lng] per segment so we can draw a polyline per segment
  // (disconnected segments stay disconnected on the map).
  const segmentPositions = useMemo(
    () =>
      route?.segments.map((seg) =>
        seg.points.map((p) => [p.lat, p.lng] as [number, number]),
      ) ?? [],
    [route],
  );
  const allPositions = useMemo(
    () => route?.points.map((p) => [p.lat, p.lng] as [number, number]) ?? [],
    [route],
  );
  const hasTrack = ride ? rideFiles(ride).length > 0 : false;

  if (!ride) {
    return (
      <div className="ride-detail">
        <p>
          Ride not found. <Link to="/">Back to map</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="ride-detail">
      <div className="ride-detail-head">
        <Link to="/" className="back-link">
          ← All rides
        </Link>
        <h1>{ride.title}</h1>
        <p className="ride-meta">
          {formatDate(ride.date)} · with {ride.riders.join(", ")}
        </p>
        {ride.description && (
          <p className="ride-description">{ride.description}</p>
        )}
        <BlogLinks ride={ride} />
      </div>

      {!hasTrack && (
        <p className="ride-pending-note">
          Route map coming soon — no GPX uploaded for this ride yet.
        </p>
      )}

      {hasTrack && (
      <div className="ride-detail-grid">
        <div
          className={`ride-map${isFullscreen ? " ride-map--fullscreen" : ""}`}
          ref={mapWrapperRef}
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
            center={[51.5, -0.1]}
            zoom={12}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {segmentPositions.length > 0 && (
              <>
                {segmentPositions.map((segPositions, i) => {
                  const isTransfer = !!route?.segments[i]?.transfer;
                  return (
                    <Polyline
                      key={i}
                      positions={segPositions}
                      pathOptions={{
                        color: ride.color ?? "#0077b6",
                        weight: isTransfer ? 3 : 5,
                        opacity: isTransfer ? 0.7 : 0.9,
                        // Dotted line for non-cycled transfers (ferries,
                        // trains, lifts). Leaflet passes dashArray straight
                        // through to the underlying SVG stroke-dasharray.
                        dashArray: isTransfer ? "2 8" : undefined,
                        lineCap: isTransfer ? "round" : "butt",
                      }}
                    />
                  );
                })}
                {/* Start marker on the first point of the first segment,
                    end marker on the last point of the last segment. */}
                <Marker
                  position={segmentPositions[0][0]}
                  icon={startIcon}
                />
                <Marker
                  position={
                    segmentPositions[segmentPositions.length - 1][
                      segmentPositions[segmentPositions.length - 1].length - 1
                    ]
                  }
                  icon={startIcon}
                />
                <FitToRoute positions={allPositions} />
                <InvalidateSize trigger={isFullscreen} />
              </>
            )}
          </MapContainer>
        </div>

        <aside className="ride-stats">
          {error && <p className="ride-error">Failed to load route: {error}</p>}
          {!route && !error && <p>Loading route…</p>}
          {route && (
            <>
              <Stat label="Distance" value={formatKm(route.stats.distanceKm)} />
              <Stat
                label="Elevation gain"
                value={`↑ ${formatM(route.stats.elevationGainM)}`}
              />
              <Stat
                label="Elevation loss"
                value={`↓ ${formatM(route.stats.elevationLossM)}`}
              />
              <Stat label="Highest point" value={formatM(route.stats.maxEleM)} />
              {route.stats.durationSec != null && (
                <Stat
                  label="Moving time"
                  value={formatDuration(route.stats.durationSec)}
                />
              )}
              {route.stats.avgSpeedKmh != null && (
                <Stat
                  label="Avg speed"
                  value={`${route.stats.avgSpeedKmh.toFixed(1)} km/h`}
                />
              )}
            </>
          )}
        </aside>
      </div>
      )}

      {hasTrack && route && route.elevationSeries.length > 1 && (
        <section className="ride-section">
          <h2>Elevation profile</h2>
          <ElevationChart
            series={route.elevationSeries}
            color={ride.color ?? "#0077b6"}
          />
        </section>
      )}

      {ride.photos && ride.photos.length > 0 && (
        <section className="ride-section">
          <h2>Photos</h2>
          <PhotoGallery
            photos={ride.photos}
            tagsFor={(src) => peopleInPhoto(ride, src)}
          />
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

function InvalidateSize({ trigger }: { trigger: boolean }) {
  const map = useMap();
  useEffect(() => {
    // Small delay lets the CSS transition finish before Leaflet recalculates.
    const id = setTimeout(() => map.invalidateSize(), 150);
    return () => clearTimeout(id);
  }, [trigger, map]);
  return null;
}

function FitToRoute({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      map.fitBounds(L.latLngBounds(positions).pad(0.1));
    }
  }, [positions, map]);
  return null;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Renders the blog-link row beneath a ride's header. Each entry in
 * `ride.blogUrl` becomes one external pill (opening in a new tab); if
 * `ride.hasBlog` is true an internal pill is added on the end. Renders
 * nothing if neither is set.
 *
 * Naming rule:
 *   - If a link has an explicit `name`, that's the button label.
 *   - Otherwise, when there's only ONE link in total, fall back to the
 *     historical "Read the blog →" label so single-blog rides look the same
 *     as they always have.
 *   - When there are multiple unnamed links (unusual — really you should add
 *     names), fall back to the link's hostname so they're at least
 *     distinguishable.
 */
function BlogLinks({ ride }: { ride: import("../data/rides").Ride }) {
  const external = rideBlogLinks(ride);
  const internalCount = ride.hasBlog ? 1 : 0;
  const total = external.length + internalCount;
  if (total === 0) return null;

  const labelFor = (link: { url: string; name?: string }): string => {
    if (link.name && link.name.trim()) return link.name.trim();
    if (total === 1) return "Read the blog →";
    try {
      return new URL(link.url).hostname.replace(/^www\./, "");
    } catch {
      return "Read the blog →";
    }
  };

  return (
    <div className="ride-blog-link">
      {external.map((link) => (
        <a
          key={link.url}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {labelFor(link)} ↗
        </a>
      ))}
      {ride.hasBlog && (
        <Link to={`/rides/${ride.slug}/blog`}>
          {total === 1 ? "Read the blog →" : "Read on this site →"}
        </Link>
      )}
    </div>
  );
}
