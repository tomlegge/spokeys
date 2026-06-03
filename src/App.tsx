import { Link, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import RideDetailPage from "./pages/RideDetailPage";
import RideBlogPage from "./pages/RideBlogPage";
import AboutPage from "./pages/AboutPage";
import PhotosPage from "./pages/PhotosPage";
import StatsPage from "./pages/StatsPage";
import TaggingPage from "./pages/TaggingPage";

export default function App() {
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
