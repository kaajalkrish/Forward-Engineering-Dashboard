import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Port 8788 mirrors the reference BMAD dashboard.
export default defineConfig({
  plugins: [react()],
  server: { port: 8788 },
  preview: { port: 8788 },
});
