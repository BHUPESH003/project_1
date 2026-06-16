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
    },
    server: {
      // Admin console runs on 5175 (user-web 5173, seller-web 5174) so all three
      // can run together.
      port: 5175,
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
    optimizeDeps: {
      include: ["@repo/types"],
    },
    build: {
      commonjsOptions: {
        include: [/packages\/types/, /node_modules/],
      },
    },
  };
});
