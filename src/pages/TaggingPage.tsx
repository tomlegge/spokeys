import { useCallback, useMemo, useRef, useState } from "react";
import { photoBasename, RIDES } from "../data/rides";
import { displayName } from "../utils/riders";

/**
 * Dev-only photo-tagging tool. Navigate to /tag to use it.
 *
 * Workflow:
 *   1. Pick a ride from the dropdown.
 *   2. Click any photo thumbnail to open the tagging modal.
 *   3. Toggle rider name chips to record who is in the photo.
 *   4. Close the modal (×, Escape, or click backdrop).
 *   5. Repeat for as many photos as you like.
 *   6. Click "Copy" in the output panel — the full `photoTags` block is now
 *      in your clipboard, ready to paste into the ride entry in rides.ts.
 *
 * The tool pre-fills tags from the ride's existing `photoTags` data, so you
 * can come back and edit tags without losing previous work (as long as you
 * paste the updated output back into rides.ts each session).
 */

/** Mirror of PhotoGallery's thumbUrl helper. */
function thumbUrl(src: string): string {
  const i = src.lastIndexOf("/");
  if (i < 0) return src;
  return `${src.slice(0, i)}/thumbs${src.slice(i)}`;
}

export default function TaggingPage() {
  // Only rides that actually have photos to tag.
  const ridesWithPhotos = useMemo(
    () => [...RIDES].filter((r) => r.photos && r.photos.length > 0),
    [],
  );

  // Default to the most-recent ride (last in the array, which is reverse-chron
  // on this site).
  const [selectedSlug, setSelectedSlug] = useState<string>(
    ridesWithPhotos.length > 0
      ? ridesWithPhotos[ridesWithPhotos.length - 1].slug
      : "",
  );

  const ride = useMemo(
    () => ridesWithPhotos.find((r) => r.slug === selectedSlug) ?? null,
    [ridesWithPhotos, selectedSlug],
  );

  // Per-session tag state, keyed by photo basename.  Initialised from the
  // ride's existing photoTags so existing tags are preserved on load.
  const [localTags, setLocalTags] = useState<Record<string, string[]>>(
    () => ride?.photoTags ?? {},
  );

  // When the user switches ride, re-initialise tags from the new ride's data.
  const lastLoadedSlugRef = useRef(selectedSlug);
  if (ride && ride.slug !== lastLoadedSlugRef.current) {
    lastLoadedSlugRef.current = ride.slug;
    setLocalTags(ride.photoTags ?? {});
  }

  // Photo currently open in the tagging modal (full URL).
  const [openPhoto, setOpenPhoto] = useState<string | null>(null);

  // "Copied!" flash state.
  const [copied, setCopied] = useState(false);

  // Sorted, de-duplicated rider display names for this ride.
  const riderNames = useMemo(
    () =>
      ride
        ? [...new Set(ride.riders.map(displayName))].filter(Boolean).sort()
        : [],
    [ride],
  );

  // ── Tag helpers ──────────────────────────────────────────────────────────

  const tagsForPhoto = useCallback(
    (photoUrl: string): string[] => localTags[photoBasename(photoUrl)] ?? [],
    [localTags],
  );

  const toggleRiderInPhoto = useCallback(
    (photoUrl: string, rider: string) => {
      const key = photoBasename(photoUrl);
      setLocalTags((prev) => {
        const current = prev[key] ?? [];
        const next = current.includes(rider)
          ? current.filter((r) => r !== rider)
          : [...current, rider];
        if (next.length === 0) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [key]: _removed, ...rest } = prev;
          return rest;
        }
        return { ...prev, [key]: next };
      });
    },
    [],
  );

  // ── Output generation ────────────────────────────────────────────────────

  const outputCode = useMemo(() => {
    const entries = Object.entries(localTags);
    if (entries.length === 0) {
      return "photoTags: {},";
    }
    const inner = entries
      .map(([file, names]) => {
        const nameStr = names.map((n) => `"${n}"`).join(", ");
        return `    "${file}": [${nameStr}],`;
      })
      .join("\n");
    return `photoTags: {\n${inner}\n  },`;
  }, [localTags]);

  const handleCopy = () => {
    navigator.clipboard.writeText(outputCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── Modal keyboard dismiss ───────────────────────────────────────────────

  const handleModalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") setOpenPhoto(null);
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="tagging-page">
      <header className="tagging-header">
        <h1>Photo tagger</h1>
        <p className="tagging-subtitle">
          Click a photo, tick the riders who appear, then copy the output and
          paste it as the <code>photoTags</code> field for this ride in{" "}
          <code>rides.ts</code>.
        </p>
      </header>

      {ridesWithPhotos.length === 0 ? (
        <p>No rides with photos found — add some photos first.</p>
      ) : (
        <>
          {/* ── Ride selector ── */}
          <div className="tagging-ride-select">
            <label htmlFor="tagging-ride-picker">Ride</label>
            <select
              id="tagging-ride-picker"
              value={selectedSlug}
              onChange={(e) => setSelectedSlug(e.target.value)}
            >
              {ridesWithPhotos.map((r) => (
                <option key={r.slug} value={r.slug}>
                  {r.title}
                </option>
              ))}
            </select>
            {ride && (
              <span className="tagging-ride-count">
                {(ride.photos ?? []).length} photo
                {(ride.photos ?? []).length === 1 ? "" : "s"}
                {Object.keys(localTags).length > 0 &&
                  ` · ${Object.keys(localTags).length} tagged`}
              </span>
            )}
          </div>

          {/* ── Photo grid ── */}
          {ride && (
            <div className="tagging-grid">
              {(ride.photos ?? []).map((src) => {
                const tags = tagsForPhoto(src);
                return (
                  <button
                    key={src}
                    className={`tagging-thumb${openPhoto === src ? " tagging-thumb--active" : ""}`}
                    onClick={() => setOpenPhoto(src)}
                    aria-label="Tag riders in this photo"
                    title={
                      tags.length > 0
                        ? `Tagged: ${tags.join(", ")}`
                        : "Click to tag riders"
                    }
                  >
                    <img
                      src={thumbUrl(src)}
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                    {tags.length > 0 && (
                      <div className="tagging-thumb-overlay">
                        {tags.map((t) => (
                          <span key={t} className="tagging-tag-pill">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Tagging modal ── */}
          {openPhoto && (
            <div
              className="tagging-modal-backdrop"
              role="dialog"
              aria-modal
              aria-label="Tag riders in photo"
              onClick={() => setOpenPhoto(null)}
              onKeyDown={handleModalKeyDown}
              tabIndex={-1}
            >
              <div
                className="tagging-modal"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="tagging-modal-close"
                  onClick={() => setOpenPhoto(null)}
                  aria-label="Close"
                >
                  ×
                </button>
                <img
                  className="tagging-modal-photo"
                  src={openPhoto}
                  alt=""
                />
                <div className="tagging-modal-body">
                  <p className="tagging-modal-question">
                    Who's in this photo?
                  </p>
                  <div className="tagging-rider-chips">
                    {riderNames.map((name) => {
                      const active = tagsForPhoto(openPhoto).includes(name);
                      return (
                        <button
                          key={name}
                          className={`tagging-rider-chip${active ? " tagging-rider-chip--active" : ""}`}
                          onClick={() => toggleRiderInPhoto(openPhoto, name)}
                        >
                          {active && <span className="tagging-chip-check" aria-hidden>✓ </span>}
                          {name}
                        </button>
                      );
                    })}
                  </div>
                  {tagsForPhoto(openPhoto).length > 0 && (
                    <p className="tagging-modal-current">
                      Tagged: {tagsForPhoto(openPhoto).join(", ")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Output panel ── */}
          {ride && (
            <div className="tagging-output">
              <div className="tagging-output-head">
                <span className="tagging-output-label">
                  Paste this into the <code>{ride.slug}</code> entry in{" "}
                  <code>rides.ts</code>
                </span>
                <button
                  type="button"
                  className={`tagging-copy-btn${copied ? " tagging-copy-btn--done" : ""}`}
                  onClick={handleCopy}
                >
                  {copied ? "✓ Copied!" : "Copy"}
                </button>
              </div>
              <pre className="tagging-output-pre">{outputCode}</pre>
            </div>
          )}
        </>
      )}
    </div>
  );
}
