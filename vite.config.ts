import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Served from the custom domain https://www.spokeys.uk/, so the site lives at
// the root path. If you ever revert to https://<user>.github.io/spokeys/, change
// base back to "/spokeys/".
export default defineConfig({
  plugins: [react()],
  base: "/",
});
