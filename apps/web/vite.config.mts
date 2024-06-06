import { PluginOption, defineConfig, loadEnv } from "vite";
import solidPlugin from "vite-plugin-solid";
import tsconfigPaths from "vite-tsconfig-paths";
import unocss from "unocss/vite";

export default defineConfig(async ({ mode }) => {
  const plugins: PluginOption[] = [tsconfigPaths(), unocss(), solidPlugin()];
  const env = loadEnv(mode, process.cwd(), "PUBLIC_");
  const proxyTarget = env.PUBLIC_APP_URL;

  if (mode === "development") {
    // Only transform index.html in dev mode - in production Handlebars will do this
    plugins.push({
      name: "html-transform",
      transformIndexHtml(html: string) {
        return html
          .replace(/{{(PUBLIC_.+?)}}/g, (_match, name) => {
            return env[name];
          })
          .replace(/{{#if VRITE_CLOUD}}(?:.|\n)+?{{\/if}}/g, "");
      }
    });
  }

  return {
    logLevel: "info",
    envPrefix: "PUBLIC_",
    server: {
      proxy: {
        "/api": {
          target: proxyTarget,
          ws: true
        },
        "/session": { target: proxyTarget, ws: true },
        "/login": { target: proxyTarget, ws: true },
        "/github": { target: proxyTarget, ws: true },
        "/upload": { target: proxyTarget, ws: true }
      }
    },
    build: {
      minify: "terser",
      target: "esnext"
    },
    plugins
  };
});
