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
    slug: "spokeys-2024-devon-c2c",
    title: "Spokeys 2024 - Devon Coast to Coast",
    date: "2024-05-30",
    file: `${base}rides/Spokeys2024.gpx`,
    riders: ["Tom", "Darren", "Anita"],
    description:
      "The coast-to-coast ride between Plymouth and Ilfracombe.",
    photos: [
    `${base}photos/spokeys-2024-devon-c2c/spokeys_2024_1.jpg`,
    `${base}photos/spokeys-2024-devon-c2c/spokeys_2024_2.jpg`,
    `${base}photos/spokeys-2024-devon-c2c/spokeys_2024_3.jpg`,
    `${base}photos/spokeys-2024-devon-c2c/spokeys_2024_4.jpg`,
    `${base}photos/spokeys-2024-devon-c2c/spokeys_2024_5.jpg`,
    `${base}photos/spokeys-2024-devon-c2c/spokeys_2024_6.jpg`,
    `${base}photos/spokeys-2024-devon-c2c/spokeys_2024_7.jpg`,
    `${base}photos/spokeys-2024-devon-c2c/spokeys_2024_8.jpg`,
    `${base}photos/spokeys-2024-devon-c2c/spokeys_2024_9.jpg`,
    `${base}photos/spokeys-2024-devon-c2c/spokeys_2024_10.jpg`,
    `${base}photos/spokeys-2024-devon-c2c/spokeys_2024_11.jpg`,
    `${base}photos/spokeys-2024-devon-c2c/spokeys_2024_12.jpg`,
    `${base}photos/spokeys-2024-devon-c2c/spokeys_2024_13.jpg`,
    `${base}photos/spokeys-2024-devon-c2c/spokeys_2024_14.jpg`,
    `${base}photos/spokeys-2024-devon-c2c/spokeys_2024_15.jpg`,
    `${base}photos/spokeys-2024-devon-c2c/spokeys_2024_16.jpg`,
    `${base}photos/spokeys-2024-devon-c2c/spokeys_2024_17.jpg`,
    `${base}photos/spokeys-2024-devon-c2c/spokeys_2024_18.jpg`,
    `${base}photos/spokeys-2024-devon-c2c/spokeys_2024_19.jpg`,
    `${base}photos/spokeys-2024-devon-c2c/spokeys_2024_20.jpg`,
    `${base}photos/spokeys-2024-devon-c2c/spokeys_2024_21.jpg`,
    ],
    color: "#e63946",
  },
  {
    slug: "spokeys-2025-wiltshire-way",
    title: "Spokeys 2025 - Wiltshire Way",
    date: "2025-05-30",
    file: `${base}rides/Spokeys2025.kml`,
    riders: ["Tom", "Charlie", "Anita"],
    description:
      "The Wiltshire Way ride with some scenic views, good food and no rain.",
    photos: [
    ],
    color: "#26cd3a",
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
    `${base}photos/spokeys-2026-bristol-to-yatton/spokeys_2026_4.jpeg`,
    `${base}photos/spokeys-2026-bristol-to-yatton/spokeys_2026_5.jpeg`,
    `${base}photos/spokeys-2026-bristol-to-yatton/spokeys_2026_6.jpeg`,
    `${base}photos/spokeys-2026-bristol-to-yatton/spokeys_2026_7.jpeg`,
    `${base}photos/spokeys-2026-bristol-to-yatton/spokeys_2026_8.jpeg`,
    `${base}photos/spokeys-2026-bristol-to-yatton/spokeys_2026_9.jpeg`,
    `${base}photos/spokeys-2026-bristol-to-yatton/spokeys_2026_10.jpeg`,
    `${base}photos/spokeys-2026-bristol-to-yatton/spokeys_2026_11.jpeg`,
    `${base}photos/spokeys-2026-bristol-to-yatton/spokeys_2026_12.jpeg`,
    `${base}photos/spokeys-2026-bristol-to-yatton/spokeys_2026_13.jpeg`,
    `${base}photos/spokeys-2026-bristol-to-yatton/spokeys_2026_14.jpeg`,
    `${base}photos/spokeys-2026-bristol-to-yatton/spokeys_2026_15.jpeg`,
    `${base}photos/spokeys-2026-bristol-to-yatton/spokeys_2026_16.jpeg`,
    `${base}photos/spokeys-2026-bristol-to-yatton/spokeys_2026_17.jpeg`,
    `${base}photos/spokeys-2026-bristol-to-yatton/spokeys_2026_18.jpeg`,
    `${base}photos/spokeys-2026-bristol-to-yatton/spokeys_2026_19.jpeg`,
    `${base}photos/spokeys-2026-bristol-to-yatton/spokeys_2026_20.jpeg`,
    `${base}photos/spokeys-2026-bristol-to-yatton/spokeys_2026_21.jpeg`,
    `${base}photos/spokeys-2026-bristol-to-yatton/spokeys_2026_22.jpeg`,
    `${base}photos/spokeys-2026-bristol-to-yatton/spokeys_2026_23.jpeg`,
    `${base}photos/spokeys-2026-bristol-to-yatton/spokeys_2026_24.jpeg`,
    `${base}photos/spokeys-2026-bristol-to-yatton/spokeys_2026_25.jpeg`,
    `${base}photos/spokeys-2026-bristol-to-yatton/spokeys_2026_26.jpeg`,
    `${base}photos/spokeys-2026-bristol-to-yatton/spokeys_2026_27.jpeg`,
    `${base}photos/spokeys-2026-bristol-to-yatton/spokeys_2026_28.jpeg`,
    `${base}photos/spokeys-2026-bristol-to-yatton/spokeys_2026_29.jpeg`,
    `${base}photos/spokeys-2026-bristol-to-yatton/spokeys_2026_30.jpeg`,
  ],
  color: "#2a9d8f",
}
];
