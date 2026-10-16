#!/usr/bin/env -S npx tsx
// scripts/build-route-summaries.ts
//
// Pre-computes a small summary of every route file in public/rides/ so the
// Map and Stats pages don't have to download and parse every GPX (~9 MB and
// growing) on each visit. Writes public/route-summaries.json:
//
//   {
//     "version": 1,
//     "files": {
//       "rides/Spokeys2025.gpx": {
//         "stats":  { distanceKm, elevationGainM, ... },  // this file only
//         "bounds": [[south, west], [north, east]],
//         "line":   [[lat, lng], ...]                     // simplified
//       }, ...
//     }
//   }
//
// Stats are per FILE. The browser combines them per ride (and drops transfer
// files) with the same combineStats() the ride page uses, so the numbers are
// identical to a full GPX load. Parsing also reuses src/utils/routeLoader.ts;
// linkedom stands in for the browser's DOMParser.
//
// Runs automatically before `npm run dev` and `npm run build`. The output is
// generated, so it's gitignored. If a file is missing from the summary (e.g.
// you added a GPX while the dev server was running) the site falls back to
// loading that ride's GPX directly — restart `npm run dev` to refresh.
//
// Usage: npm run route-summaries

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DOMParser as LinkedomDOMParser } from "linkedom";
import {
  computeBounds,
  computeStats,
  parseRouteText,
  type LatLngEle,
} from "../src/utils/routeLoader";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const RIDES_DIR = path.join(PUBLIC_DIR, "rides");
const OUT_FILE = path.join(PUBLIC_DIR, "route-summaries.json");

// Simplification tolerance in degrees of latitude (~5.5 m). Plenty for the
// overview map; the ride page still draws the full-resolution track.
const TOLERANCE_DEG = 0.00005;
const COORD_DECIMALS = 5; // ~1 m

// The route parser calls `new DOMParser()`; give it an XML-capable one.
(globalThis as any).DOMParser = class {
  parseFromString(text: string) {
    return new LinkedomDOMParser().parseFromString(text, "text/xml");
  }
};

async function listRouteFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await listRouteFiles(full)));
    else if (/\.(gpx|kml)$/i.test(entry.name)) out.push(full);
  }
  return out.sort();
}

/** Iterative Douglas–Peucker on lat/lng, with longitude scaled by cos(lat). */
function simplify(points: LatLngEle[], tolerance: number): LatLngEle[] {
  if (points.length <= 2) return points;
  const kx = Math.cos((points[0].lat * Math.PI) / 180);
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  const tol2 = tolerance * tolerance;
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const ax = points[a].lng * kx, ay = points[a].lat;
    const dx = points[b].lng * kx - ax, dy = points[b].lat - ay;
    const len2 = dx * dx + dy * dy;
    let maxD = -1, idx = -1;
    for (let i = a + 1; i < b; i++) {
      const px = points[i].lng * kx - ax, py = points[i].lat - ay;
      let t = len2 > 0 ? (px * dx + py * dy) / len2 : 0;
      t = Math.max(0, Math.min(1, t));
      const ex = px - t * dx, ey = py - t * dy;
      const d = ex * ex + ey * ey;
      if (d > maxD) { maxD = d; idx = i; }
    }
    if (maxD > tol2) {
      keep[idx] = 1;
      stack.push([a, idx], [idx, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

const round = (n: number) => Number(n.toFixed(COORD_DECIMALS));

async function main() {
  const files = await listRouteFiles(RIDES_DIR);
  const summaries: Record<string, unknown> = {};
  let failed = 0;
  for (const file of files) {
    const key = path.relative(PUBLIC_DIR, file).split(path.sep).join("/");
    try {
      const text = await fs.readFile(file, "utf8");
      const { points } = parseRouteText(text, file);
      summaries[key] = {
        stats: computeStats(points),
        bounds: computeBounds(points),
        line: simplify(points, TOLERANCE_DEG).map((p) => [round(p.lat), round(p.lng)]),
      };
    } catch (err) {
      // Leave it out — the site will fall back to loading this file directly
      // and show the same error the ride page would.
      failed++;
      console.warn(`[route-summaries] skipped ${key}: ${(err as Error).message}`);
    }
  }
  const json = JSON.stringify({ version: 1, files: summaries });
  await fs.writeFile(OUT_FILE, json);
  console.log(
    `[route-summaries] ${Object.keys(summaries).length} file(s)` +
      (failed ? `, ${failed} skipped` : "") +
      ` → public/route-summaries.json (${(json.length / 1024).toFixed(0)} KB)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
