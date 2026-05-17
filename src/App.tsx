import { Link, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import RideDetailPage from "./pages/RideDetailPage";
import AboutPage from "./pages/AboutPage";
import PhotosPage from "./pages/PhotosPage";

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden>🚴</span>
          <span className="brand-text">Spokeys</span>
        </Link>
        <nav className="app-nav">
          <Link to="/">Map</Link>
          <Link to="/photos">Photos</Link>
          <Link to="/about">About</Link>
        </nav>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/rides/:slug" element={<RideDetailPage />} />
          <Route path="/photos" element={<PhotosPage />} />
          <Route path="/about" element={<AboutPage />} />
        </Routes>
      </main>
      <footer className="app-footer">
        <span>© {new Date().getFullYear()} Spokeys cycling group</span>
        <span>Map data © OpenStreetMap contributors</span>
      </footer>
    </div>
  );
}
