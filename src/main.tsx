import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import { UnitsProvider } from "./utils/units";
import "leaflet/dist/leaflet.css";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* HashRouter avoids GitHub Pages 404s on direct URL refresh. */}
    <HashRouter>
      <UnitsProvider>
        <App />
      </UnitsProvider>
    </HashRouter>
  </React.StrictMode>,
);
