import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      // Force all workspace packages that import React to resolve it from this
      // app's node_modules — Rolldown (Vite 8 bundler) can't find peer deps
      // when following symlinks into packages/*/src.
      dedupe: ["react", "react-dom"],
    },
    server: {
      port: 5173,
      proxy: {
        // NestJS backend runs on :3000 with global prefix `/api`
        // (services/api/.env → PORT=3000, API_PREFIX=api).
        "/api": {
          target: env.VITE_API_URL,
          changeOrigin: true,
        },
      },
    },
    // @repo/types ships CommonJS (it's also consumed by the NestJS backend, so we
    // don't convert it to ESM). Force Vite to pre-bundle it so its named enum
    // exports resolve in the browser at dev time.
    // @repo/icons is raw TSX source — exclude from esbuild pre-bundling so
    // @vitejs/plugin-react handles the JSX transform instead.
    optimizeDeps: {
      include: ["@repo/types"],
      exclude: ["@repo/icons"],
    },
    build: {
      commonjsOptions: {
        include: [/packages\/types/, /node_modules/],
      },
    },
  };
});
