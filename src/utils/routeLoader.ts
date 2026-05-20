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

export type RouteSegment = {
  name?: string;
  points: LatLngEle[];
  /**
   * True for non-cycled portions (ferry crossings, train transfers, lifts…).
   * Transfer segments are still drawn on the map (as dotted lines) but are
   * EXCLUDED from distance / elevation / duration stats and from the
   * elevation profile.
   */
  transfer?: boolean;
};

/**
 * Input shape for {@link loadRoutes}. A bare string is treated as a normal
 * cycled GPX/KML file; the object form lets callers flag a file as a
 * non-cycled transfer. Mirrors `RouteFile` in src/data/rides.ts but kept here
 * so this module has no dependency on the rides data file.
 */
export type RouteFileInput = string | { url: string; transfer?: boolean };

function normaliseInput(input: RouteFileInput): { url: string; transfer: boolean } {
  if (typeof input === "string") return { url: input, transfer: false };
  return { url: input.url, transfer: !!input.transfer };
}

export type RouteData = {
  name?: string;
  /**
   * One entry per source file. For a single-file ride this has length 1.
   * Render one polyline per segment so disconnected segments don't get
   * joined by a fake line.
   */
  segments: RouteSegment[];
  /** All points across all segments, concatenated in segment order. */
  points: LatLngEle[];
  bounds: [[number, number], [number, number]]; // [[south, west], [north, east]]
  /** Stats aggregated across segments — gaps between segments are NOT counted. */
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

/** Load a single GPX/KML file and parse it into a one-segment RouteData. */
export async function loadRoute(fileUrl: string): Promise<RouteData> {
  const segment = await loadSegment({ url: fileUrl, transfer: false });
  return combineSegments([segment]);
}

/**
 * Load multiple GPX/KML files and combine them into a single RouteData with
 * one segment per file. Use this for rides made up of several disconnected
 * tracks (e.g. a tour where you trained between two stages, or where each
 * day's track is a separate file).
 *
 * Accepts either bare path strings or `{ url, transfer }` objects. When a
 * file is flagged `transfer: true` (e.g. a ferry crossing), its segment is
 * still drawn on the map but is excluded from distance, elevation, duration,
 * and the elevation profile.
 *
 * The segments are concatenated in the order given. Distance, elevation
 * gain/loss, and duration are summed PER NON-TRANSFER SEGMENT — the jumps
 * between segments don't count toward any total either.
 */
export async function loadRoutes(files: RouteFileInput[]): Promise<RouteData> {
  if (files.length === 0) {
    throw new Error("loadRoutes called with no file URLs");
  }
  const normalised = files.map(normaliseInput);
  const segments = await Promise.all(normalised.map(loadSegment));
  return combineSegments(segments);
}

async function loadSegment(
  file: { url: string; transfer: boolean },
): Promise<RouteSegment> {
  const { url: fileUrl, transfer } = file;
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

  return { name, points, transfer };
}

/**
 * Stitch one or more segments into a single RouteData. The combined `points`
 * array is the concatenation of every segment's points (including transfers
 * — so the map can still draw them and fit to their bounds). Stats and the
 * elevation profile, however, IGNORE transfer segments entirely — a ferry
 * crossing or train hop adds zero distance and zero climbing.
 */
function combineSegments(segments: RouteSegment[]): RouteData {
  const allPoints: LatLngEle[] = [];
  for (const seg of segments) allPoints.push(...seg.points);

  // Per-segment stats, summed. Transfer segments contribute nothing.
  let distanceKm = 0;
  let elevationGainM = 0;
  let elevationLossM = 0;
  let minEleM = Infinity;
  let maxEleM = -Infinity;
  let durationSec: number | undefined = undefined;
  let anyMissingDuration = false;
  for (const seg of segments) {
    if (seg.transfer) continue;
    const s = computeStats(seg.points);
    distanceKm += s.distanceKm;
    elevationGainM += s.elevationGainM;
    elevationLossM += s.elevationLossM;
    if (Number.isFinite(s.minEleM) && s.minEleM < minEleM) minEleM = s.minEleM;
    if (Number.isFinite(s.maxEleM) && s.maxEleM > maxEleM) maxEleM = s.maxEleM;
    if (s.durationSec != null) {
      durationSec = (durationSec ?? 0) + s.durationSec;
    } else {
      anyMissingDuration = true;
    }
  }
  // Only report duration if EVERY non-transfer segment had timestamps —
  // otherwise the partial number would be misleading.
  if (anyMissingDuration) durationSec = undefined;
  const avgSpeedKmh =
    durationSec && durationSec > 0 ? distanceKm / (durationSec / 3600) : undefined;

  // Elevation series: each NON-TRANSFER segment starts from the running
  // cumulative km of previous non-transfer segments. The chart's x-axis is
  // "kilometres pedalled" — ferries don't move the axis forward, and they
  // don't show up as a flat line either.
  const elevationSeries: { distanceKm: number; ele: number }[] = [];
  let cumulativeKm = 0;
  for (const seg of segments) {
    if (seg.transfer) continue;
    const segSeries = buildElevationSeries(seg.points);
    for (const pt of segSeries) {
      elevationSeries.push({ distanceKm: cumulativeKm + pt.distanceKm, ele: pt.ele });
    }
    cumulativeKm += computeStats(seg.points).distanceKm;
  }
  // Downsample combined series so very long multi-file rides stay snappy.
  const TARGET = 400;
  const downsampledSeries =
    elevationSeries.length > TARGET
      ? elevationSeries.filter(
          (_, i) =>
            i % Math.ceil(elevationSeries.length / TARGET) === 0 ||
            i === elevationSeries.length - 1,
        )
      : elevationSeries;

  return {
    name: segments[0]?.name,
    segments,
    points: allPoints,
    bounds: computeBounds(allPoints),
    stats: {
      distanceKm,
      elevationGainM,
      elevationLossM,
      minEleM: minEleM === Infinity ? 0 : minEleM,
      maxEleM: maxEleM === -Infinity ? 0 : maxEleM,
      durationSec,
      avgSpeedKmh,
    },
    elevationSeries: downsampledSeries,
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
 * Elevation gain uses a small smoothing threshold (5m) so GPS jitter doesn't
 * inflate the climbing total — this matches what most route platforms do.
 */
function computeStats(points: LatLngEle[]): RouteStats {
  const ELE_NOISE_M = 5;
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
