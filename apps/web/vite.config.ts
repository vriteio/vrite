import { defineConfig, loadEnv } from "vite";
import solidPlugin from "vite-plugin-solid";
import tsconfigPaths from "vite-tsconfig-paths";
import unocss from "unocss/vite";

export default defineConfig(async () => {
  return {
    logLevel: "info",
    envPrefix: "PUBLIC_",
    server: {
      proxy: {
        "/api": {
          target: "http://192.168.1.100:3333",
          ws: true
        },
        "/session": { target: "http://192.168.1.100:3333", ws: true },
        "/login": { target: "http://192.168.1.100:3333", ws: true },
        "/proxy": { target: "http://192.168.1.100:3333", ws: true }
      }
    },
    build: {
      minify: "terser",
      target: "esnext"
    },
    plugins: [tsconfigPaths(), unocss(), solidPlugin()]
  };
});
