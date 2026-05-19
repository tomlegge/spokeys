import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { RIDES } from "../data/rides";

/**
 * Renders an internal blog post for a ride.
 *
 * The post lives at `public/blogs/<slug>.md`. It's fetched at runtime
 * (not bundled), so you can edit a post and re-deploy without touching code.
 *
 * Images inside the markdown should use either:
 *   - an absolute path from the site root, e.g. `/photos/<slug>/foo.jpg`
 *     (works because the site is hosted at `/` via the custom domain), or
 *   - a relative path like `./<slug>/foo.jpg`, where the file lives at
 *     `public/blogs/<slug>/foo.jpg`. Relative paths are immune to base-URL
 *     changes so they keep working if you ever move off the custom domain.
 */
export default function RideBlogPage() {
  const { slug } = useParams<{ slug: string }>();
  const ride = RIDES.find((r) => r.slug === slug);

  const [markdown, setMarkdown] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">(
    "loading",
  );
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (!ride) return;
    setStatus("loading");
    setMarkdown(null);
    setErrorMsg("");

    const url = `${import.meta.env.BASE_URL}blogs/${ride.slug}.md`;
    fetch(url)
      .then(async (res) => {
        if (res.status === 404) {
          setStatus("missing");
          return;
        }
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const text = await res.text();
        // GitHub Pages serves a friendly 404 HTML when a file is missing.
        // Detect that case so we don't try to render HTML as markdown.
        if (/^\s*<!doctype html/i.test(text)) {
          setStatus("missing");
          return;
        }
        setMarkdown(text);
        setStatus("ready");
      })
      .catch((e) => {
        setStatus("error");
        setErrorMsg(e instanceof Error ? e.message : String(e));
      });
  }, [ride?.slug]);

  if (!ride) {
    return (
      <div className="ride-detail">
        <p>
          Ride not found. <Link to="/">Back to map</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="ride-detail ride-blog">
      <div className="ride-detail-head">
        <Link to={`/rides/${ride.slug}`} className="back-link">
          ← Back to ride
        </Link>
        <h1>{ride.title}</h1>
        <p className="ride-meta">{formatDate(ride.date)}</p>
      </div>

      {status === "loading" && <p>Loading blog post…</p>}

      {status === "missing" && (
        <p className="ride-pending-note">
          No blog post for this ride yet.
        </p>
      )}

      {status === "error" && (
        <p className="ride-error">Failed to load blog post: {errorMsg}</p>
      )}

      {status === "ready" && markdown && (
        <article className="blog-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
        </article>
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
