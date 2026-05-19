import { useMemo, type MouseEvent } from "react";
import { Link } from "react-router-dom";
import { RIDES } from "../data/rides";
import PhotoGallery from "../components/PhotoGallery";

/**
 * Scrolls a ride section into view by slug. We can't rely on native
 * `href="#slug"` anchor navigation because the app uses HashRouter, so
 * `#slug` would be interpreted as a route (and fail to match, showing
 * a blank page).
 */
function jumpToSlug(e: MouseEvent<HTMLAnchorElement>, slug: string) {
  e.preventDefault();
  const el = document.getElementById(slug);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

/**
 * Stand-alone photo album: every ride that has photos, grouped by ride,
 * shown in reverse-chronological order (most recent first — matches the
 * home page list).
 *
 * Rides with an empty `photos` array (or no `photos` field at all) are
 * skipped so the page doesn't show empty sections.
 *
 * Each section reuses the same PhotoGallery component used on the ride
 * detail page, so the grid layout and lightbox behaviour are identical.
 */
export default function PhotosPage() {
  const ridesWithPhotos = useMemo(
    () =>
      [...RIDES]
        .reverse()
        .filter((r) => r.photos && r.photos.length > 0),
    [],
  );

  const totalPhotos = useMemo(
    () =>
      ridesWithPhotos.reduce((sum, r) => sum + (r.photos?.length ?? 0), 0),
    [ridesWithPhotos],
  );

  return (
    <div className="photos-page">
      <header className="photos-page-head">
        <h1>Photo album</h1>
        <p className="photos-page-sub">
          {totalPhotos.toLocaleString()} photo
          {totalPhotos === 1 ? "" : "s"} across{" "}
          {ridesWithPhotos.length} ride
          {ridesWithPhotos.length === 1 ? "" : "s"}
        </p>
      </header>

      {ridesWithPhotos.length > 1 && (
        <nav className="photos-index" aria-label="Jump to album">
          <h2 className="photos-index-title">Jump to album</h2>
          <ul className="photos-index-list">
            {ridesWithPhotos.map((ride) => (
              <li key={ride.slug}>
                <a
                  href={`#${ride.slug}`}
                  onClick={(e) => jumpToSlug(e, ride.slug)}
                  className="photos-index-link"
                >
                  <span className="photos-index-link-title">{ride.title}</span>
                  <span className="photos-index-link-meta">
                    {formatDate(ride.date)} ·{" "}
                    {ride.photos?.length ?? 0} photo
                    {(ride.photos?.length ?? 0) === 1 ? "" : "s"}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {ridesWithPhotos.length === 0 ? (
        <p>No photos to show yet — add some to <code>public/photos/</code>.</p>
      ) : (
        ridesWithPhotos.map((ride) => (
          <section
            key={ride.slug}
            className="photos-ride-section"
            id={ride.slug}
          >
            <div className="photos-ride-head">
              <h2>
                <Link to={`/rides/${ride.slug}`}>{ride.title}</Link>
              </h2>
              <p className="photos-ride-meta">
                {formatDate(ride.date)} ·{" "}
                {ride.photos?.length ?? 0} photo
                {(ride.photos?.length ?? 0) === 1 ? "" : "s"}
              </p>
            </div>
            <PhotoGallery photos={ride.photos ?? []} />
          </section>
        ))
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
