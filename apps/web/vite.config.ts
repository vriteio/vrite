import { PluginOption, defineConfig, loadEnv } from "vite";
import solidPlugin from "vite-plugin-solid";
import tsconfigPaths from "vite-tsconfig-paths";
import unocss from "unocss/vite";

export default defineConfig(async ({ mode }) => {
  const plugins: PluginOption[] = [tsconfigPaths(), unocss(), solidPlugin()];
  const env = loadEnv(mode, process.cwd(), "PUBLIC_");

  if (mode === "development") {
    // Only transform index.html in dev mode - in production Handlebars will do this
    plugins.push({
      name: "html-transform",
      transformIndexHtml(html: string) {
        return html.replace(/{{(PUBLIC_.+?)}}/g, (_match, name) => {
          return env[name];
        });
      }
    });
  }

  return {
    logLevel: "info",
    envPrefix: "PUBLIC_",
    server: {
      proxy: {
        "/api": {
          target: "http://localhost:3333",
          ws: true
        },
        "/session": { target: "http://localhost:3333", ws: true },
        "/login": { target: "http://localhost:3333", ws: true },
        "/github": { target: "http://localhost:3333", ws: true },
        "/upload": { target: "http://localhost:3333", ws: true }
      }
    },
    build: {
      minify: "terser",
      target: "esnext"
    },
    plugins
  };
});
