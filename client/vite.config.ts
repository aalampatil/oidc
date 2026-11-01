import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { resolveProviderIssuer } from "./src/lib/providerConfig";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // Run the same validation before emitting a production bundle, rather than
  // discovering a bad issuer when its top-level browser import crashes.
  const environment = loadEnv(mode, __dirname, "VITE_");
  resolveProviderIssuer(environment.VITE_API_BASE_URL, command === "serve" && mode !== "production");
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
