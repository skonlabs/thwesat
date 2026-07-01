import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const sanitizeViteEnvKeys = () => {
  for (const [key, value] of Object.entries(process.env)) {
    const trimmedKey = key.trim();

    if (trimmedKey !== key && trimmedKey.startsWith("VITE_")) {
      if (process.env[trimmedKey] === undefined && value !== undefined) {
        process.env[trimmedKey] = value;
      }
      delete process.env[key];
    }
  }
};

sanitizeViteEnvKeys();

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
}));
