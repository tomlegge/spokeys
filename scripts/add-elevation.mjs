#!/usr/bin/env node
// scripts/add-elevation.mjs
// Fill in <ele> tags in a GPX file using the free Open-Meteo elevation API.
// No API key required. Source data: Copernicus DEM 2021 (~30m resolution).
//
// Usage:
//   node scripts/add-elevation.mjs public/rides/my-ride.gpx
//   node scripts/add-elevation.mjs --force public/rides/my-ride.gpx
//   npm run add-elevation -- public/rides/my-ride.gpx
//
// Flags:
//   -f, --force   Overwrite existing <ele> values (default: only fill in missing).
//   -h, --help    Show this help.

import { readFile, writeFile } from "node:fs/promises";
import { argv, exit } from "node:process";

const API = "https://api.open-meteo.com/v1/elevation";
const BATCH_SIZE = 100;       // Open-Meteo allows up to 100 coords per request.
const BATCH_DELAY_MS = 80000;  // Pace ourselves between batches on shared IPs.
const MAX_RETRIES = 6;        // Total attempts per batch on transient failures.

function parseArgs(argv) {
  const args = { force: false, files: [], help: false };
  for (const a of argv.slice(2)) {
    if (a === "--force" || a === "-f") args.force = true;
    else if (a === "--help" || a === "-h") args.help = true;
    else args.files.push(a);
  }
  return args;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithRetry(url) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    let res;
    try {
      res = await fetch(url);
    } catch (err) {
      lastError = err;
      const waitMs = Math.min(60000, 1000 * 2 ** (attempt - 1));
      console.log(`  network error (${err.message || err}), waiting ${Math.round(waitMs / 1000)}s before retry ${attempt}/${MAX_RETRIES}...`);
      await sleep(waitMs);
      continue;
    }

    if (res.ok) return res;

    if (res.status === 429 || res.status >= 500) {
      const retryAfter = res.headers.get("retry-after");
      let waitMs;
      if (retryAfter) {
        const n = parseInt(retryAfter, 10);
        waitMs = Number.isFinite(n) ? n * 1000 : 60000;
      } else if (res.status === 429) {
        waitMs = 12000 + Math.floor(Math.random() * 5000);
      } else {
        waitMs = Math.min(60000, 1000 * 2 ** (attempt - 1));
      }
      const body = (await res.text()).slice(0, 200);
      console.log(`  ${res.status} from Open-Meteo, waiting ${Math.round(waitMs / 1000)}s before retry ${attempt}/${MAX_RETRIES}... (${body})`);
      lastError = new Error(`Open-Meteo returned ${res.status}: ${body}`);
      await sleep(waitMs);
      continue;
    }

    throw new Error(`Open-Meteo returned ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  throw lastError || new Error("Open-Meteo: retries exhausted");
}

async function fetchElevations(coords) {
  const out = new Array(coords.length);
  const totalBatches = Math.ceil(coords.length / BATCH_SIZE);
  for (let i = 0; i < coords.length; i += BATCH_SIZE) {
    const batchNum = i / BATCH_SIZE + 1;
    const batch = coords.slice(i, i + BATCH_SIZE);
    const lats = batch.map((c) => c.lat).join(",");
    const lons = batch.map((c) => c.lon).join(",");
    const url = `${API}?latitude=${lats}&longitude=${lons}`;

    if (totalBatches > 1) {
      console.log(`  batch ${batchNum}/${totalBatches} (${batch.length} pts)`);
    }

    const res = await fetchWithRetry(url);
    const data = await res.json();
    if (!Array.isArray(data.elevation) || data.elevation.length !== batch.length) {
      throw new Error(`Unexpected response: ${JSON.stringify(data).slice(0, 200)}`);
    }
    for (let j = 0; j < batch.length; j++) out[i + j] = data.elevation[j];

    if (i + BATCH_SIZE < coords.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }
  return out;
}

async function processFile(path, { force }) {
  const original = await readFile(path, "utf8");
  const trkptRe = /<trkpt\b([^>]*?)\s*(\/>|>([\s\S]*?)<\/trkpt>)/g;

  const tasks = [];
  let m;
  while ((m = trkptRe.exec(original)) !== null) {
    const attrs = m[1];
    const isSelfClose = m[2] === "/>";
    const inner = isSelfClose ? "" : m[3] || "";
    const latMatch = attrs.match(/\blat\s*=\s*"([^"]+)"/);
    const lonMatch = attrs.match(/\blon\s*=\s*"([^"]+)"/);
    if (!latMatch || !lonMatch) continue;
    const lat = parseFloat(latMatch[1]);
    const lon = parseFloat(lonMatch[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const hasEle = /<ele>[^<]*<\/ele>/.test(inner);
    tasks.push({
      start: m.index,
      end: m.index + m[0].length,
      attrs, isSelfClose, inner, lat, lon, hasEle,
      needsFill: !hasEle || force,
    });
  }

  if (tasks.length === 0) {
    console.log(`${path}: no <trkpt> elements found, skipping.`);
    return;
  }

  const toFetch = tasks.filter((t) => t.needsFill).map((t) => ({ lat: t.lat, lon: t.lon }));
  console.log(`${path}: ${tasks.length} trkpts, ${toFetch.length} need elevation${force ? " (force overwrite)" : ""}`);
  if (toFetch.length === 0) return;

  const elevations = await fetchElevations(toFetch);

  let updated = original;
  let fetchIdx = toFetch.length - 1;
  for (let i = tasks.length - 1; i >= 0; i--) {
    const t = tasks[i];
    if (!t.needsFill) continue;
    const ele = elevations[fetchIdx--];
    if (ele == null || !Number.isFinite(ele)) continue;
    const eleStr = Number(ele).toFixed(1);

    let replacement;
    if (t.isSelfClose) {
      replacement = `<trkpt${t.attrs}><ele>${eleStr}</ele></trkpt>`;
    } else if (t.hasEle) {
      const newInner = t.inner.replace(/<ele>[^<]*<\/ele>/, `<ele>${eleStr}</ele>`);
      replacement = `<trkpt${t.attrs}>${newInner}</trkpt>`;
    } else {
      replacement = `<trkpt${t.attrs}><ele>${eleStr}</ele>${t.inner}</trkpt>`;
    }
    updated = updated.slice(0, t.start) + replacement + updated.slice(t.end);
  }

  await writeFile(path, updated, "utf8");
  console.log(`  -> wrote ${path}`);
}

async function main() {
  const args = parseArgs(argv);
  if (args.help || args.files.length === 0) {
    console.log(
      "Usage: node scripts/add-elevation.mjs [--force] <file.gpx> [file2.gpx ...]\n\n" +
      "Fills in missing <ele> tags in GPX trackpoints using the free\n" +
      "Open-Meteo elevation API (no API key required).\n\n" +
      "Options:\n" +
      "  -f, --force   Overwrite existing elevation values too.\n" +
      "  -h, --help    Show this help.\n"
    );
    exit(args.help ? 0 : 1);
  }
  for (const f of args.files) {
    try {
      await processFile(f, { force: args.force });
    } catch (err) {
      console.error(`Failed on ${f}:`, err.message || err);
      exit(1);
    }
  }
}

main().catch((err) => {
  console.error("Error:", err.message || err);
  exit(1);
});
