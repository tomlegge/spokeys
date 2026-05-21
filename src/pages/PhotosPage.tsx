import { useMemo, useState, type MouseEvent } from "react";
import { Link } from "react-router-dom";
import { peopleInPhoto, RIDES, type Ride } from "../data/rides";
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
 * A rider filter at the top of the page narrows the view to photos tagged
 * with a specific person (via `photoTags` on each ride). Untagged photos
 * disappear under any active filter — that's intentional; tagging is the
 * mechanism. Albums with zero matching photos collapse out of the view.
 *
 * Each section reuses the same PhotoGallery component used on the ride
 * detail page, so the grid layout and lightbox behaviour are identical.
 */
export default function PhotosPage() {
  const [filterRider, setFilterRider] = useState<string>("");

  // Reverse-chrono, only rides with photos. The filter is applied later so
  // the dropdown can list every tagged rider regardless of what's selected.
  const ridesWithPhotos = useMemo(
    () =>
      [...RIDES]
        .reverse()
        .filter((r) => r.photos && r.photos.length > 0),
    [],
  );

  // Every rider name that appears in ANY ride's photoTags, paired with the
  // total number of photos they're tagged in. Drives the filter dropdown.
  // We only include riders who actually have ≥1 tagged photo — otherwise
  // selecting them would just empty the page.
  const taggedRiderCounts = useMemo<Map<string, number>>(() => {
    const counts = new Map<string, number>();
    for (const ride of ridesWithPhotos) {
      if (!ride.photoTags) continue;
      for (const names of Object.values(ride.photoTags)) {
        for (const name of names) {
          counts.set(name, (counts.get(name) ?? 0) + 1);
        }
      }
    }
    return counts;
  }, [ridesWithPhotos]);

  const sortedRiders = useMemo(
    () =>
      Array.from(taggedRiderCounts.entries()).sort((a, b) =>
        a[0].localeCompare(b[0]),
      ),
    [taggedRiderCounts],
  );

  // A photo passes the filter if either no filter is set, or the active
  // rider is named in this ride's tags for the photo.
  const photoPasses = (ride: Ride, src: string): boolean => {
    if (!filterRider) return true;
    return peopleInPhoto(ride, src).includes(filterRider);
  };

  // Build the filtered view once. For each ride compute the post-filter
  // photo list and drop the ride entirely if nothing's left.
  const filteredAlbums = useMemo(() => {
    return ridesWithPhotos
      .map((ride) => {
        const photos = (ride.photos ?? []).filter((src) => photoPasses(ride, src));
        return { ride, photos };
      })
      .filter((a) => a.photos.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ridesWithPhotos, filterRider]);

  const totalPhotos = useMemo(
    () => filteredAlbums.reduce((sum, a) => sum + a.photos.length, 0),
    [filteredAlbums],
  );

  return (
    <div className="photos-page">
      <header className="photos-page-head">
        <h1>Photo album</h1>
        <p className="photos-page-sub">
          {totalPhotos.toLocaleString()} photo
          {totalPhotos === 1 ? "" : "s"} across{" "}
          {filteredAlbums.length} ride
          {filteredAlbums.length === 1 ? "" : "s"}
          {filterRider && ` · filtered to photos of ${filterRider}`}
        </p>
      </header>

      {sortedRiders.length > 0 && (
        <div className="photos-filter" role="search">
          <label className="photos-filter-label" htmlFor="rider-filter">
            Filter by rider
          </label>
          <select
            id="rider-filter"
            className="photos-filter-select"
            value={filterRider}
            onChange={(e) => setFilterRider(e.target.value)}
          >
            <option value="">All photos</option>
            {sortedRiders.map(([name, count]) => (
              <option key={name} value={name}>
                {name} ({count})
              </option>
            ))}
          </select>
          {filterRider && (
            <button
              type="button"
              className="photos-filter-clear"
              onClick={() => setFilterRider("")}
              aria-label="Clear filter"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {filteredAlbums.length > 1 && (
        <nav className="photos-index" aria-label="Jump to album">
          <h2 className="photos-index-title">Jump to album</h2>
          <ul className="photos-index-list">
            {filteredAlbums.map(({ ride, photos }) => (
              <li key={ride.slug}>
                <a
                  href={`#${ride.slug}`}
                  onClick={(e) => jumpToSlug(e, ride.slug)}
                  className="photos-index-link"
                >
                  <span className="photos-index-link-title">{ride.title}</span>
                  <span className="photos-index-link-meta">
                    {formatDate(ride.date)} · {photos.length} photo
                    {photos.length === 1 ? "" : "s"}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {filteredAlbums.length === 0 ? (
        <p>
          {filterRider
            ? `No tagged photos of ${filterRider} yet.`
            : "No photos to show yet — add some to "}
          {!filterRider && <code>public/photos/</code>}
          {!filterRider && "."}
        </p>
      ) : (
        filteredAlbums.map(({ ride, photos }) => (
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
                {formatDate(ride.date)} · {photos.length} photo
                {photos.length === 1 ? "" : "s"}
              </p>
            </div>
            <PhotoGallery
              photos={photos}
              tagsFor={(src) => peopleInPhoto(ride, src)}
            />
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
