import { defineConfig, loadEnv } from "vite";
import solidPlugin from "vite-plugin-solid";
import tsconfigPaths from "vite-tsconfig-paths";
import unocss from "unocss/vite";

export default defineConfig(async () => {
  return {
    logLevel: "info",
    server: {
      proxy: {
        "/api": { target: "http://localhost:3333", ws: true },
        "/session": { target: "http://localhost:3333", ws: true },
        "/login": { target: "http://localhost:3333", ws: true },
        "/proxy": { target: "http://localhost:3333", ws: true }
      }
    },
    build: { minify: false, target: "esnext" },
    plugins: [tsconfigPaths(), unocss(), solidPlugin()]
  };
});
