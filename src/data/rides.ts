/**
 * The single source of truth for rides.
 *
 * To add a new ride:
 *   1. Drop your GPX or KML file into `public/rides/`
 *   2. Drop any photos into `public/photos/<slug>/`
 *   3. Append a new entry to the array below
 *   4. Commit & push — GitHub Actions deploys it
 *
 * `slug` becomes the URL: /rides/<slug>
 * `file` is relative to public/, so prefix is `/rides/...`
 *
 * Use import.meta.env.BASE_URL so paths work in dev (`/`) AND on
 * GitHub Pages (`/spokeys/`). Don't hardcode the prefix.
 */

const base = import.meta.env.BASE_URL;

export type Ride = {
  slug: string;
  title: string;
  date: string; // ISO date "YYYY-MM-DD"
  file: string; // path under public/, relative to BASE_URL
  riders: string[];
  description: string;
  photos?: string[]; // paths under public/, relative to BASE_URL
  color?: string; // route line color on the overview map
};

export const RIDES: Ride[] = [
  {
    slug: "richmond-park-loop",
    title: "Richmond Park Loop",
    date: "2026-04-12",
    file: `${base}rides/richmond-park-loop.gpx`,
    riders: ["Tom", "Sam", "Priya", "Jordan"],
    description:
      "Classic Sunday loop around Richmond Park. Sunny morning, light wind, three laps before coffee at Roehampton Gate.",
    photos: [
      // Add photos to public/photos/richmond-park-loop/ and list them here:
      // `${base}photos/richmond-park-loop/cafe-stop.jpg`,
    ],
    color: "#e63946",
  },
  {
  slug: "spokeys-2026-bristol-to-yatton",
  title: "Spokeys 2026 - Bristol to Yatton",
  date: "2026-05-01",
  file: `${base}rides/Spokeys2026.gpx`,
  riders: ["Tom", "Anita", "Darren", "Charlie"],
  description: "Annual spokeys ride for 2026.",
  photos: [
    `${base}photos/spokeys-2026-bristol-to-yatton/PXL_20260503_133025574.jpg`,
  ],
  color: "#2a9d8f",
}
];
