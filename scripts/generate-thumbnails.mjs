#!/usr/bin/env node
// scripts/generate-thumbnails.mjs
// Generates small JPEG thumbnails for every image in public/photos/<album>/
// into a sibling public/photos/<album>/thumbs/ folder.
//
// The PhotoGallery component looks for thumbs at this exact path and falls
// back to the original if a thumb is missing, so it's safe to run this
// incrementally (or not at all in dev — the page just shows originals).
//
// Usage:
//   npm run thumbnails             # incremental — only newly added photos
//   npm run thumbnails -- --force  # rebuild every thumb from scratch
//   node scripts/generate-thumbnails.mjs <album-slug> [<album-slug> ...]
//                                  # only process specific albums
//
// Output format: ~600px-wide JPEG at quality 78 (mozjpeg), EXIF orientation
// baked in. Typical size 40–90 KB vs. multi-MB originals.

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PHOTOS_DIR = path.join(ROOT, "public", "photos");

// 600px wide covers a ~300px grid cell at 2x DPR. Bump to 800 if you have a
// wider grid layout in mind.
const THUMB_WIDTH = 600;
const THUMB_QUALITY = 78;

// Anything else (mov, json, txt, …) is ignored.
const SOURCE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function parseArgs(argv) {
  const args = { force: false, albums: [] };
  for (const a of argv.slice(2)) {
    if (a === "--force" || a === "-f") args.force = true;
    else if (a === "--help" || a === "-h") {
      console.log(
        "Usage: node scripts/generate-thumbnails.mjs [--force] [<album-slug> ...]",
      );
      process.exit(0);
    } else args.albums.push(a);
  }
  return args;
}

/**
 * Build the destination filename. We always emit JPEG (smallest for photos),
 * but keep the original basename so URL derivation in the React component is
 * a simple "insert /thumbs before the filename" — no extension swapping.
 *
 * In practice almost every source is already .jpg/.jpeg. If you ever drop in
 * a PNG, the thumb will still live at thumbs/<same-name>.jpg, and the
 * component's thumbUrl() function won't find it under the .png URL — so the
 * onError fallback to the original kicks in. If that becomes common, swap
 * the component to use the .jpg URL directly.
 */
function thumbPathFor(albumDir, sourceName) {
  return path.join(albumDir, "thumbs", sourceName);
}

async function isUpToDate(srcPath, dstPath) {
  try {
    const [srcStat, dstStat] = await Promise.all([
      fs.stat(srcPath),
      fs.stat(dstPath),
    ]);
    return dstStat.mtimeMs >= srcStat.mtimeMs;
  } catch {
    return false;
  }
}

async function processAlbum(albumDir, { force }) {
  const albumName = path.basename(albumDir);
  const thumbsDir = path.join(albumDir, "thumbs");
  await fs.mkdir(thumbsDir, { recursive: true });

  const entries = await fs.readdir(albumDir, { withFileTypes: true });
  let made = 0;
  let skipped = 0;
  let errors = 0;

  for (const ent of entries) {
    if (!ent.isFile()) continue; // skip the thumbs/ subdir and anything else
    const ext = path.extname(ent.name).toLowerCase();
    if (!SOURCE_EXTENSIONS.has(ext)) continue;

    const src = path.join(albumDir, ent.name);
    const dst = thumbPathFor(albumDir, ent.name);

    if (!force && (await isUpToDate(src, dst))) {
      skipped++;
      continue;
    }

    try {
      await sharp(src)
        .rotate() // honour EXIF orientation, then strip it on output
        .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
        .jpeg({ quality: THUMB_QUALITY, mozjpeg: true })
        .toFile(dst);
      made++;
    } catch (err) {
      errors++;
      console.warn(`  ! ${ent.name}: ${err.message}`);
    }
  }

  return { albumName, made, skipped, errors };
}

async function main() {
  const args = parseArgs(process.argv);

  // Resolve which album directories to process.
  let albumDirs;
  if (args.albums.length > 0) {
    albumDirs = args.albums.map((slug) => path.join(PHOTOS_DIR, slug));
  } else {
    const entries = await fs.readdir(PHOTOS_DIR, { withFileTypes: true });
    albumDirs = entries
      .filter((e) => e.isDirectory())
      .map((e) => path.join(PHOTOS_DIR, e.name));
  }

  if (albumDirs.length === 0) {
    console.log("No albums found under public/photos/.");
    return;
  }

  const start = Date.now();
  let totalMade = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const dir of albumDirs) {
    const stat = await fs.stat(dir).catch(() => null);
    if (!stat || !stat.isDirectory()) {
      console.warn(`Skipping ${path.basename(dir)} — not a directory`);
      continue;
    }
    const result = await processAlbum(dir, { force: args.force });
    console.log(
      `${result.albumName}: ${result.made} generated, ${result.skipped} up-to-date${
        result.errors ? `, ${result.errors} errors` : ""
      }`,
    );
    totalMade += result.made;
    totalSkipped += result.skipped;
    totalErrors += result.errors;
  }

  const secs = ((Date.now() - start) / 1000).toFixed(1);
  console.log(
    `\nDone in ${secs}s: ${totalMade} thumbs generated, ${totalSkipped} skipped${
      totalErrors ? `, ${totalErrors} errors` : ""
    }.`,
  );
  if (totalErrors > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
