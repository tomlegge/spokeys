import { useState } from "react";

type Props = { photos: string[] };

export default function PhotoGallery({ photos }: Props) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <>
      <div className="photo-grid">
        {photos.map((src) => (
          <button
            key={src}
            className="photo-thumb"
            onClick={() => setOpen(src)}
            aria-label="Open photo"
          >
            <img src={src} alt="" loading="lazy" />
          </button>
        ))}
      </div>
      {open && (
        <div
          className="photo-lightbox"
          role="dialog"
          aria-modal
          onClick={() => setOpen(null)}
        >
          <img src={open} alt="" />
          <button
            className="photo-close"
            onClick={() => setOpen(null)}
            aria-label="Close"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
