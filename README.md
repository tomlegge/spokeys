# Spokeys

Interactive maps of bike rides for the Spokeys cycling group.

A static React + Leaflet site. Drop a GPX (or KML) file into `public/rides/`, append a row to `src/data/rides.ts`, push — your route shows up on the map with stats, an elevation profile, and a photo gallery.

## Stack

- **Vite + React + TypeScript** — fast dev server, clean static build
- **Leaflet + react-leaflet** — interactive map with OpenStreetMap tiles (no API key needed)
- **@tmcw/togeojson** — parses GPX and KML in the browser
- **Chart.js / react-chartjs-2** — elevation profile chart
- **GitHub Pages** — free hosting via GitHub Actions

I picked Vite over full Next.js because every interactive bit here is client-side (Leaflet doesn't run on the server), and Vite's build is one folder of static files that drops onto GitHub Pages with zero ceremony.

## One-time setup

You'll need [Node.js 20+](https://nodejs.org/) installed.

```bash
# Install dependencies
npm install

# Run locally at http://localhost:5173
npm run dev

# Build the static site into ./dist
npm run build
```

## Deploying to GitHub Pages

1. Create a new GitHub repo — for example `spokeys`.
2. From inside this folder:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/spokeys.git
   git push -u origin main
   ```
3. On GitHub, go to **Settings → Pages**. Under "Build and deployment", set **Source** to **GitHub Actions**.
4. The workflow in `.github/workflows/deploy.yml` runs automatically on every push to `main`. Within ~1 minute your site is live at:
   ```
   https://<your-username>.github.io/spokeys/
   ```
5. **If your repo is named something other than `spokeys`**, open `vite.config.ts` and change the `base` field to match — for example `base: "/my-rides/"`. The trailing slash matters.

### Custom domain (optional)

If you want `rides.example.com`:
- Add a `CNAME` file inside `public/` with the domain on a single line.
- Set `base: "/"` in `vite.config.ts`.
- Configure DNS as described in [GitHub's custom domain docs](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site).

## Adding a new ride

1. **Get the route file**
   - From a GPS computer or Strava: export as GPX.
   - From Google Earth: right-click your path → "Save Place As..." → KML.
2. **Save it** to `public/rides/`. Pick a tidy filename like `chiltern-loop-2026-05-01.gpx`.
3. **Add photos (optional)**: drop them in `public/photos/<slug>/`.
4. **Edit `src/data/rides.ts`** and add an entry:
   ```ts
   {
     slug: "chiltern-loop",
     title: "Chiltern Loop",
     date: "2026-05-01",
     file: `${base}rides/chiltern-loop-2026-05-01.gpx`,
     riders: ["Tom", "Sam"],
     description: "Cake stop at Marlow.",
     photos: [
       `${base}photos/chiltern-loop/marlow.jpg`,
     ],
     color: "#2a9d8f",
   },
   ```
5. **Test locally**: `npm run dev`, open http://localhost:5173, confirm the route shows up.
6. **Push**: `git add . && git commit -m "Add Chiltern Loop" && git push`. GitHub Actions builds and publishes within a minute.

## Project layout

```
.
├── public/
│   ├── rides/          ← GPX / KML files (committed)
│   ├── photos/         ← photos per ride
│   └── favicon.svg
├── src/
│   ├── pages/
│   │   ├── HomePage.tsx        ← overview map + ride list
│   │   ├── RideDetailPage.tsx  ← per-ride detail
│   │   └── AboutPage.tsx
│   ├── components/
│   │   ├── ElevationChart.tsx
│   │   └── PhotoGallery.tsx
│   ├── utils/
│   │   └── routeLoader.ts      ← parses GPX/KML, computes stats
│   ├── data/
│   │   └── rides.ts            ← edit me to add rides
│   ├── App.tsx
│   ├── main.tsx
│   └── styles.css
├── .github/workflows/deploy.yml
├── vite.config.ts
└── package.json
```

## Caveats

- Stats are computed from the GPX/KML in the browser. If your file has no elevation data, gain/loss/highest will be zero. If it has no `<time>` stamps, duration and avg speed are hidden.
- The OSM tile servers used here are fine for personal use. If your site gets hammered, switch to a tile provider like [Stadia Maps](https://stadiamaps.com/) (still free up to ~200k requests/month) — you only need to change the `url` and `attribution` props on `<TileLayer>`.
- KML support assumes a `<LineString>` or `<gx:Track>` inside your file. Multi-feature KMLs from Google Earth work fine; complex placemark trees may need a quick re-export as a single path.
