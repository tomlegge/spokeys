import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// IMPORTANT: When deploying to GitHub Pages at https://<user>.github.io/<repo>/
// set base to "/<repo>/". For a project repo named "spokeys" set base: "/spokeys/".
// If you use a custom domain or deploy at the root, set base: "/".
export default defineConfig({
  plugins: [react()],
  base: "/spokeys/",
});
