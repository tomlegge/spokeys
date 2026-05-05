/**
 * Loads a GPX or KML file from the public/ folder and extracts:
 *  - the list of points (lat/lng/ele/time)
 *  - bounds for fitting the map
 *  - stats (distance, elevation gain/loss, duration)
 *  - an elevation profile series for charting
 *
 * No third-party parser — both formats are simple enough to read directly with
 * the browser's built-in DOMParser. That keeps dependencies small and the
 * behaviour predictable.
 */

export type LatLngEle = {
  lat: number;
  lng: number;
  ele?: number; // meters
  time?: string; // ISO timestamp if present
};

export type RouteData = {
  name?: string;
  points: LatLngEle[];
  bounds: [[number, number], [number, number]]; // [[south, west], [north, east]]
  stats: RouteStats;
  elevationSeries: { distanceKm: number; ele: number }[];
};

export type RouteStats = {
  distanceKm: number;
  elevationGainM: number;
  elevationLossM: number;
  minEleM: number;
  maxEleM: number;
  durationSec?: number; // only if timestamps present
  avgSpeedKmh?: number; // only if timestamps present
};

const EARTH_RADIUS_KM = 6371;

function haversineKm(a: LatLngEle, b: LatLngEle): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export async function loadRoute(fileUrl: string): Promise<RouteData> {
  const res = await fetch(fileUrl);
  if (!res.ok) {
    throw new Error(`Failed to load route file ${fileUrl}: ${res.status}`);
  }
  const text = await res.text();
  const dom = new DOMParser().parseFromString(text, "application/xml");

  const parserError = dom.querySelector("parsererror");
  if (parserError) {
    throw new Error(`XML parse error in ${fileUrl}: ${parserError.textContent}`);
  }

  const lower = fileUrl.toLowerCase();
  let points: LatLngEle[];
  let name: string | undefined;
  if (lower.endsWith(".gpx")) {
    ({ points, name } = parseGpx(dom));
  } else if (lower.endsWith(".kml")) {
    ({ points, name } = parseKml(dom));
  } else {
    throw new Error(`Unsupported file type: ${fileUrl}`);
  }

  if (points.length < 2) {
    throw new Error(`Route at ${fileUrl} has fewer than 2 points`);
  }

  return {
    name,
    points,
    bounds: computeBounds(points),
    stats: computeStats(points),
    elevationSeries: buildElevationSeries(points),
  };
}

// ---------------------------------------------------------------------------
// GPX
// ---------------------------------------------------------------------------

/**
 * GPX structure we care about:
 *   <trk>
 *     <name>...</name>
 *     <trkseg>
 *       <trkpt lat="..." lon="...">
 *         <ele>...</ele>
 *         <time>...</time>
 *       </trkpt>
 *     </trkseg>
 *   </trk>
 *
 * Some files use <rte>/<rtept> instead of <trk>/<trkpt> — we read both.
 */
function parseGpx(dom: Document): { points: LatLngEle[]; name?: string } {
  const points: LatLngEle[] = [];

  const collectFrom = (selector: string) => {
    const nodes = dom.querySelectorAll(selector);
    nodes.forEach((node) => {
      const lat = parseFloat(node.getAttribute("lat") ?? "");
      const lng = parseFloat(node.getAttribute("lon") ?? "");
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const eleText = node.querySelector("ele")?.textContent;
      const timeText = node.querySelector("time")?.textContent;
      const ele = eleText ? parseFloat(eleText) : undefined;
      points.push({
        lat,
        lng,
        ele: Number.isFinite(ele as number) ? (ele as number) : undefined,
        time: timeText ?? undefined,
      });
    });
  };

  collectFrom("trkpt");
  if (points.length === 0) collectFrom("rtept");

  const name =
    dom.querySelector("trk > name")?.textContent ??
    dom.querySelector("rte > name")?.textContent ??
    dom.querySelector("gpx > metadata > name")?.textContent ??
    undefined;

  return { points, name: name?.trim() || undefined };
}

// ---------------------------------------------------------------------------
// KML
// ---------------------------------------------------------------------------

/**
 * KML structure we handle:
 *   - <LineString><coordinates>lng,lat,ele lng,lat,ele ...</coordinates></LineString>
 *   - <gx:Track><when>...</when>... <gx:coord>lng lat ele</gx:coord>...</gx:Track>
 *
 * Google Earth typically exports paths as a single <LineString>, which is the
 * easy case. Newer "tracks" with timestamps use the gx:Track form.
 */
function parseKml(dom: Document): { points: LatLngEle[]; name?: string } {
  const points: LatLngEle[] = [];

  // Form 1: <LineString><coordinates>...</coordinates></LineString>
  dom.querySelectorAll("LineString").forEach((ls) => {
    const coordsText = ls.querySelector("coordinates")?.textContent;
    if (!coordsText) return;
    parseKmlCoordsBlob(coordsText).forEach((p) => points.push(p));
  });

  // Form 2: <gx:Track> with parallel <when> / <gx:coord> children. The "gx"
  // prefix is namespaced, so use namespace-agnostic getElementsByTagNameNS.
  // We pair whens with coords by index — the KML spec requires equal counts.
  const trackEls = Array.from(dom.getElementsByTagNameNS("*", "Track"));
  for (const track of trackEls) {
    const whens = Array.from(
      track.getElementsByTagNameNS("*", "when"),
    ).map((n) => n.textContent ?? "");
    const coords = Array.from(
      track.getElementsByTagNameNS("*", "coord"),
    ).map((n) => n.textContent ?? "");
    coords.forEach((line, i) => {
      const parts = line.trim().split(/\s+/).map(Number);
      if (parts.length < 2) return;
      const [lng, lat, ele] = parts;
      points.push({
        lat,
        lng,
        ele: Number.isFinite(ele) ? ele : undefined,
        time: whens[i] || undefined,
      });
    });
  }

  const name =
    dom.querySelector("Document > name")?.textContent ??
    dom.querySelector("Folder > name")?.textContent ??
    dom.querySelector("Placemark > name")?.textContent ??
    undefined;

  return { points, name: name?.trim() || undefined };
}

function parseKmlCoordsBlob(blob: string): LatLngEle[] {
  // KML coordinates: whitespace-separated tuples of "lng,lat[,ele]"
  return blob
    .trim()
    .split(/\s+/)
    .map((tuple) => {
      const [lng, lat, ele] = tuple.split(",").map(Number);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return {
        lat,
        lng,
        ele: Number.isFinite(ele) ? ele : undefined,
      } as LatLngEle;
    })
    .filter((p): p is LatLngEle => p !== null);
}

// ---------------------------------------------------------------------------
// Geometry & stats
// ---------------------------------------------------------------------------

function computeBounds(
  points: LatLngEle[],
): [[number, number], [number, number]] {
  let minLat = Infinity,
    minLng = Infinity,
    maxLat = -Infinity,
    maxLng = -Infinity;
  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng > maxLng) maxLng = p.lng;
  }
  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ];
}

/**
 * Walk the points once, accumulating distance, elevation gain/loss,
 * and (if every point has a timestamp) duration.
 *
 * Elevation gain uses a small smoothing threshold (13m) so GPS jitter doesn't
 * inflate the climbing total — this matches what most route platforms do.
 */
function computeStats(points: LatLngEle[]): RouteStats {
  const ELE_NOISE_M = 13;
  let distance = 0;
  let gain = 0;
  let loss = 0;
  let minEle = Infinity;
  let maxEle = -Infinity;
  let lastSignificantEle: number | undefined;

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (i > 0) distance += haversineKm(points[i - 1], p);
    if (typeof p.ele === "number") {
      if (p.ele < minEle) minEle = p.ele;
      if (p.ele > maxEle) maxEle = p.ele;
      if (lastSignificantEle === undefined) {
        lastSignificantEle = p.ele;
      } else {
        const delta = p.ele - lastSignificantEle;
        if (Math.abs(delta) >= ELE_NOISE_M) {
          if (delta > 0) gain += delta;
          else loss += -delta;
          lastSignificantEle = p.ele;
        }
      }
    }
  }

  const firstTime = points[0]?.time;
  const lastTime = points[points.length - 1]?.time;
  let durationSec: number | undefined;
  let avgSpeedKmh: number | undefined;
  if (firstTime && lastTime) {
    const start = Date.parse(firstTime);
    const end = Date.parse(lastTime);
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      durationSec = (end - start) / 1000;
      avgSpeedKmh = distance / (durationSec / 3600);
    }
  }

  return {
    distanceKm: distance,
    elevationGainM: gain,
    elevationLossM: loss,
    minEleM: minEle === Infinity ? 0 : minEle,
    maxEleM: maxEle === -Infinity ? 0 : maxEle,
    durationSec,
    avgSpeedKmh,
  };
}

function buildElevationSeries(
  points: LatLngEle[],
): { distanceKm: number; ele: number }[] {
  const series: { distanceKm: number; ele: number }[] = [];
  let cumKm = 0;
  for (let i = 0; i < points.length; i++) {
    if (i > 0) cumKm += haversineKm(points[i - 1], points[i]);
    if (typeof points[i].ele === "number") {
      series.push({ distanceKm: cumKm, ele: points[i].ele as number });
    }
  }
  // Downsample for chart performance on long rides.
  const TARGET = 400;
  if (series.length > TARGET) {
    const stride = Math.ceil(series.length / TARGET);
    return series.filter((_, i) => i % stride === 0 || i === series.length - 1);
  }
  return series;
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

export function formatDuration(sec?: number): string {
  if (!sec || !Number.isFinite(sec)) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function formatKm(km: number): string {
  return `${km.toFixed(1)} km`;
}

export function formatM(m: number): string {
  return `${Math.round(m)} m`;
}
