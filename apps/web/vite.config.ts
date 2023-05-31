import { defineConfig, loadEnv } from "vite";
import solidPlugin from "vite-plugin-solid";
import tsconfigPaths from "vite-tsconfig-paths";
import unocss from "unocss/vite";

export default defineConfig(async () => {
  return {
    logLevel: "info",
    server: {
      proxy: {
        "/api": {
          target: "http://localhost:3333",
          ws: true
        },
        "/session": { target: "http://localhost:3333", ws: true },
        "/login": { target: "http://localhost:3333", ws: true },
        "/proxy": { target: "http://localhost:3333", ws: true }
      }
    },
    build: {
      minify: "terser",
      target: "esnext",
      terserOptions: {
        mangle: { keep_fnames: true },
        compress: { keep_fnames: true }
      }
    },
    plugins: [tsconfigPaths(), unocss(), solidPlugin()]
  };
});
