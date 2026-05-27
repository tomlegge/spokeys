import { useEffect, useState } from "react";
import { Link, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import RideDetailPage from "./pages/RideDetailPage";
import RideBlogPage from "./pages/RideBlogPage";
import AboutPage from "./pages/AboutPage";
import PhotosPage from "./pages/PhotosPage";
import StatsPage from "./pages/StatsPage";
import TaggingPage from "./pages/TaggingPage";

type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "spokeys-theme";

/** Resolve the initial theme without flashing the wrong colours.
 *  The inline script in index.html sets data-theme on <html> before
 *  React mounts, so we read that here as the source of truth. */
function getInitialTheme(): Theme {
  if (typeof document === "undefined") return "light";
  const attr = document.documentElement.getAttribute("data-theme");
  return attr === "dark" ? "dark" : "light";
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // localStorage may be unavailable (e.g. private mode); harmless to ignore.
    }
  }, [theme]);

  const toggleTheme = () =>
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  return (
    <div className="app">
      <header className="app-header">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden>🚴</span>
          <span className="brand-text">Spokeys</span>
        </Link>
        <div className="app-header-right">
          <nav className="app-nav">
            <Link to="/">Map</Link>
            <Link to="/photos">Photos</Link>
            <Link to="/stats">Stats</Link>
            <Link to="/about">About</Link>
          </nav>
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={
              theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
            title={
              theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
          >
            <span aria-hidden>{theme === "dark" ? "☀️" : "🌙"}</span>
          </button>
        </div>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/rides/:slug" element={<RideDetailPage />} />
          <Route path="/rides/:slug/blog" element={<RideBlogPage />} />
          <Route path="/photos" element={<PhotosPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/tag" element={<TaggingPage />} />
        </Routes>
      </main>
      <footer className="app-footer">
        <span>© {new Date().getFullYear()} Spokeys cycling group</span>
        <span>Map data © OpenStreetMap contributors</span>
      </footer>
    </div>
  );
}
