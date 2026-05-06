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
    `${base}photos/spokeys-2026-bristol-to-yatton/spokeys_2026_1.jpg`,
    `${base}photos/spokeys-2026-bristol-to-yatton/spokeys_2026_2.jpg`,
    `${base}photos/spokeys-2026-bristol-to-yatton/spokeys_2026_3.jpg`,
    `${base}photos/spokeys-2026-bristol-to-yatton/spokeys_2026_4.jpg`,
    `${base}photos/spokeys-2026-bristol-to-yatton/spokeys_2026_5.jpg`,
    `${base}photos/spokeys-2026-bristol-to-yatton/spokeys_2026_6.jpg`,
    `${base}photos/spokeys-2026-bristol-to-yatton/spokeys_2026_7.jpg`,
    `${base}photos/spokeys-2026-bristol-to-yatton/spokeys_2026_8.jpg`,
    `${base}photos/spokeys-2026-bristol-to-yatton/spokeys_2026_9.jpg`,
    `${base}photos/spokeys-2026-bristol-to-yatton/spokeys_2026_10.jpg`,
    `${base}photos/spokeys-2026-bristol-to-yatton/spokeys_2026_11.jpg`,
    `${base}photos/spokeys-2026-bristol-to-yatton/spokeys_2026_12.jpg`,
    `${base}photos/spokeys-2026-bristol-to-yatton/spokeys_2026_13.jpg`,
    `${base}photos/spokeys-2026-bristol-to-yatton/spokeys_2026_14.jpg`,
    `${base}photos/spokeys-2026-bristol-to-yatton/spokeys_2026_15.jpg`,
    `${base}photos/spokeys-2026-bristol-to-yatton/spokeys_2026_16.jpg`,
    `${base}photos/spokeys-2026-bristol-to-yatton/spokeys_2026_17.jpg`,
    `${base}photos/spokeys-2026-bristol-to-yatton/spokeys_2026_18.jpg`,
    `${base}photos/spokeys-2026-bristol-to-yatton/spokeys_2026_19.jpg`,
    `${base}photos/spokeys-2026-bristol-to-yatton/spokeys_2026_20.jpg`,
    `${base}photos/spokeys-2026-bristol-to-yatton/spokeys_2026_21.jpg`,
    `${base}photos/spokeys-2026-bristol-to-yatton/spokeys_2026_22.jpg`,
    `${base}photos/spokeys-2026-bristol-to-yatton/spokeys_2026_23.jpg`,
    `${base}photos/spokeys-2026-bristol-to-yatton/spokeys_2026_24.jpg`,
    `${base}photos/spokeys-2026-bristol-to-yatton/spokeys_2026_25.jpg`,
    `${base}photos/spokeys-2026-bristol-to-yatton/spokeys_2026_26.jpg`,
    `${base}photos/spokeys-2026-bristol-to-yatton/spokeys_2026_27.jpg`,
    `${base}photos/spokeys-2026-bristol-to-yatton/spokeys_2026_28.jpg`,
    `${base}photos/spokeys-2026-bristol-to-yatton/spokeys_2026_29.jpg`,
    `${base}photos/spokeys-2026-bristol-to-yatton/spokeys_2026_30.jpg`,
  ],
  color: "#2a9d8f",
}
];
