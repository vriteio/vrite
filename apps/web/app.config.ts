import { defineConfig } from "@solidjs/start/config";
import tsconfigPaths from "vite-tsconfig-paths";
import unoCSS from "unocss/vite";

export default defineConfig({
  middleware: "./src/middleware.ts",
  vite: {
    envPrefix: "PUBLIC_",
    ssr: {
      noExternal: [
        /^@atlaskit\/pragmatic-drag-and-drop(?:$|\/)/,
        /^@atlaskit\/pragmatic-drag-and-drop-hitbox(?:$|\/)/
      ]
    },
    plugins: [tsconfigPaths(), unoCSS()]
  }
});
