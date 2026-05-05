import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { RIDES } from "../data/rides";
import {
  formatDuration,
  formatKm,
  formatM,
  loadRoute,
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

  useEffect(() => {
    if (!ride) return;
    setRoute(null);
    setError(null);
    loadRoute(ride.file)
      .then(setRoute)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [ride?.file]);

  const positions = useMemo(
    () => route?.points.map((p) => [p.lat, p.lng] as [number, number]) ?? [],
    [route],
  );

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
      </div>

      <div className="ride-detail-grid">
        <div className="ride-map">
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
            {positions.length > 0 && (
              <>
                <Polyline
                  positions={positions}
                  pathOptions={{
                    color: ride.color ?? "#0077b6",
                    weight: 5,
                    opacity: 0.9,
                  }}
                />
                <Marker position={positions[0]} icon={startIcon} />
                <Marker
                  position={positions[positions.length - 1]}
                  icon={startIcon}
                />
                <FitToRoute positions={positions} />
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

      {route && route.elevationSeries.length > 1 && (
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
          <PhotoGallery photos={ride.photos} />
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
