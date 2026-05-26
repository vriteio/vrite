import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import tsconfigPaths from "vite-tsconfig-paths";
import unoCSS from "unocss/vite";

export default defineConfig(() => {
  return {
    envPrefix: "PUBLIC_",
    ssr: {
      noExternal: [
        /^@atlaskit\/pragmatic-drag-and-drop(?:$|\/)/,
        /^@atlaskit\/pragmatic-drag-and-drop-hitbox(?:$|\/)/
      ]
    },
    plugins: [solid({ ssr: true }), tsconfigPaths(), unoCSS()]
  };
});
