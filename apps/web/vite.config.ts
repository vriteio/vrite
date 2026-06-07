import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
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
    plugins: [unoCSS(), solid({ ssr: true })],
    resolve: { tsconfigPaths: true }
  };
});
