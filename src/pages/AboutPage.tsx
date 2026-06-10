import { Link } from "react-router-dom";

export default function AboutPage() {
  return (
    <div className="about-page">
      <h1>About the Spokeys</h1>
      <p>
        We're a group of friends who ride bikes together. This site is a
        living archive of the routes we've taken — every ride gets an
        interactive map, an elevation profile, stats, a photo gallery and,
        where we've written one, a blog post.
      </p>
      <p>
        Want to see who's racked up the most miles? Head to the{" "}
        <Link to="/stats">stats page</Link>. The rest of this page explains how
        the site is put together and how to add new rides.
      </p>

      {/* ─────────────────────────── Architecture ─────────────────────────── */}
      <h2>How the site is built</h2>
      <p>
        It's a static <strong>Vite + React + TypeScript</strong> site — there's
        no backend, no database and no server-side code. Everything runs in the
        browser, and the whole thing builds down to a folder of plain HTML, JS
        and CSS that's hosted for free on <strong>GitHub Pages</strong>.
      </p>
      <p>The main pieces:</p>
      <ul>
        <li>
          <strong>Leaflet + react-leaflet</strong> draw the interactive maps,
          using OpenStreetMap tiles (no API key needed).
        </li>
        <li>
          <strong>Chart.js</strong> renders the elevation profiles.
        </li>
        <li>
          <strong>React Router</strong> handles the pages — Map, Photos, Stats,
          About, each ride's detail page, and each ride's blog.
        </li>
        <li>
          <strong>GitHub Actions</strong> rebuilds and republishes the site
          automatically on every push to <code>main</code>, so deploying is just{" "}
          <code>git push</code>.
        </li>
      </ul>
      <p>
        We use Vite rather than something like Next.js because every interactive
        part here is client-side (Leaflet doesn't run on a server), so there's
        nothing to gain from server rendering — and a folder of static files
        drops onto GitHub Pages with zero fuss.
      </p>

      {/* ─────────────────────── Single source of truth ───────────────────── */}
      <h3>One list to rule them all</h3>
      <p>
        Every ride is a single entry in <code>src/data/rides.ts</code>. That one
        file is the source of truth for the whole site: the map markers, the
        ride list, the stats leaderboard, the photo galleries and the blog links
        are all generated from it. A ride entry holds its title and date, the
        route file(s), who rode, a short description, and optional photos, photo
        tags and blog links.
      </p>

      {/* ─────────────────────────── Maps & routes ────────────────────────── */}
      <h2>Maps and route files</h2>
      <p>
        Routes are stored as <code>GPX</code> (or <code>KML</code>) files in{" "}
        <code>public/rides/</code>. When you open a ride, the browser fetches the
        file and parses it on the fly — no pre-processing step — pulling out the
        track points, then computing distance, elevation gain/loss, highest
        point and (if the file has timestamps) moving time and average speed.
      </p>
      <p>
        A ride can be a single file or several. Multi-file rides are handy for
        tours where each day is its own track, and any segment can be flagged as
        a <strong>transfer</strong> — a ferry, train or lift you didn't pedal.
        Transfers are drawn as a dotted line on the map but are left out of every
        stat and out of the rider leaderboard, so a ferry crossing adds zero
        distance and zero climbing.
      </p>

      {/* ───────────────────────────── Elevation ──────────────────────────── */}
      <h2>Elevation data</h2>
      <p>
        Lots of phone trackers and route planners export GPX{" "}
        <em>without</em> elevation, which would leave the elevation chart and the
        gain/loss stats empty. To fix that there's a small script,{" "}
        <code>scripts/add-elevation.mjs</code>, that reads each track point's
        coordinates and looks up the ground height from the free{" "}
        <a
          href="https://open-meteo.com/en/docs/elevation-api"
          target="_blank"
          rel="noopener noreferrer"
        >
          Open-Meteo elevation API
        </a>{" "}
        (no API key, ~30m resolution), then writes the <code>&lt;ele&gt;</code>{" "}
        tags back into the file. Run it with:
      </p>
      <pre>
        <code>npm run add-elevation -- public/rides/your-ride.gpx</code>
      </pre>
      <p>
        It only fills in missing elevations by default; add <code>--force</code>{" "}
        to overwrite existing ones. It batches the lookups and paces itself so it
        plays nicely with the shared, free API.
      </p>
      <h3>The elevation profile</h3>
      <p>
        Once a route has elevation, each ride page shows a profile chart of
        height against distance pedalled. On multi-day rides the days are
        stitched into one continuous profile, transfers don't push the distance
        axis forward, and very long rides are automatically down-sampled so the
        chart stays snappy. A little smoothing is applied to the climbing total
        so GPS jitter doesn't inflate the elevation gain.
      </p>

      {/* ───────────────────────────── Blogs ──────────────────────────────── */}
      <h2>Blogs — hosted and linked</h2>
      <p>There are two ways a ride can have a write-up, and they can coexist:</p>
      <ul>
        <li>
          <strong>Hosted on this site.</strong> Drop a Markdown file at{" "}
          <code>public/blogs/&lt;slug&gt;.md</code> and set{" "}
          <code>hasBlog: true</code> on the ride. The ride page adds a "Read the
          blog" button that opens the post at <code>/rides/&lt;slug&gt;/blog</code>
          . The Markdown is fetched and rendered at runtime, so you can edit a
          post and re-deploy without touching any code. Images can live alongside
          the post in <code>public/blogs/&lt;slug&gt;/</code>.
        </li>
        <li>
          <strong>Linked elsewhere.</strong> If someone blogged about the ride on
          their own site, add a <code>blogUrl</code> to the ride entry. You can
          give it a name (e.g. "Anita's blog"), and you can list several — each
          becomes its own button that opens in a new tab. Useful when more than
          one person wrote the ride up.
        </li>
      </ul>

      {/* ───────────────────────── Photos & tagging ───────────────────────── */}
      <h2>Photos</h2>
      <p>
        Photos for a ride live in <code>public/photos/&lt;slug&gt;/</code> and
        show up both in that ride's gallery and on the site-wide{" "}
        <Link to="/photos">Photos page</Link>. A helper script,{" "}
        <code>scripts/generate-thumbnails.mjs</code>, makes small thumbnails so
        the grids load quickly while the full-size image is only fetched when you
        open it.
      </p>
      <h3>The photo tagging page</h3>
      <p>
        Recording who's in each photo would be tedious to do by hand in code, so
        there's a dedicated tagging tool at <code>/tag</code>. You pick a ride,
        click a photo, tick the riders who appear in it, and repeat. When you're
        done it generates a ready-made <code>photoTags</code> block that you copy
        with one button and paste straight into that ride's entry in{" "}
        <code>rides.ts</code>. It pre-loads any tags the ride already has, so you
        can come back and edit without losing your earlier work. Once tagged,
        photos can be filtered by rider on the Photos page and the names show up
        when you open a photo.
      </p>

      {/* ──────────────────────────── Fullscreen ──────────────────────────── */}
      <h2>Fullscreen maps</h2>
      <p>
        Each map has a fullscreen button. On a Mac (and any desktop browser, plus
        Android) it uses the browser's native Fullscreen API — the map fills the
        whole screen and pressing <kbd>Esc</kbd> or the exit button brings it
        back. iPhones and iPads are the exception: Safari on iOS blocks that API
        entirely, so there the site falls back to a CSS-based "simulated"
        fullscreen — a full-viewport overlay that locks page scrolling — which
        looks and behaves the same to you. After the map resizes, Leaflet is told
        to recalculate so the tiles always line up correctly.
      </p>

      {/* ─────────────────────────── Adding a ride ────────────────────────── */}
      <h2>Adding a new ride</h2>
      <p>The full flow, start to finish:</p>
      <ol>
        <li>
          <strong>Get the route file.</strong> Export your ride as GPX (from a
          GPS computer, Strava, etc.) or save a path from Google Earth as KML,
          and drop it into <code>public/rides/</code>.
        </li>
        <li>
          <strong>Fill in elevation if it's missing.</strong> Run{" "}
          <code>npm run add-elevation -- public/rides/your-ride.gpx</code> so the
          chart and climbing stats work.
        </li>
        <li>
          <strong>Add photos (optional).</strong> Put them in{" "}
          <code>public/photos/&lt;slug&gt;/</code> and run the thumbnail script.
        </li>
        <li>
          <strong>Write a blog post (optional).</strong> Add{" "}
          <code>public/blogs/&lt;slug&gt;.md</code> and set{" "}
          <code>hasBlog: true</code>, and/or add external <code>blogUrl</code>{" "}
          links.
        </li>
        <li>
          <strong>Add the ride entry.</strong> Append a new object to{" "}
          <code>src/data/rides.ts</code> with the slug, title, date, route
          file(s), riders, description and colour.
        </li>
        <li>
          <strong>Tag the photos (optional).</strong> Visit <code>/tag</code>,
          tag who's in each photo, and paste the generated{" "}
          <code>photoTags</code> block back into the ride entry.
        </li>
        <li>
          <strong>Check it locally.</strong> Run <code>npm run dev</code> and
          confirm the route, stats, chart, photos and blog all look right.
        </li>
        <li>
          <strong>Push.</strong> <code>git add . &amp;&amp; git commit &amp;&amp; git push</code>
          {" "}— GitHub Actions builds and publishes the site within a minute or
          so.
        </li>
      </ol>
    </div>
  );
}
