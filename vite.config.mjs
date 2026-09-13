import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/").pop();
const base = process.env.BASE_PATH || (
  process.env.GITHUB_ACTIONS === "true" && repositoryName ? `/${repositoryName}/` : "/"
);

export default defineConfig({
  build: {
    outDir: "dist/client",
  },
  base,
  optimizeDeps: {
    include: ["react", "react-dom/client"],
  },
  server: {
    port: 5199,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: ["terminal.local"],
    warmup: {
      clientFiles: ["./src/main.jsx"],
    },
  },
  plugins: [react()],
});
