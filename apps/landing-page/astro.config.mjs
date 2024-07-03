import { defineConfig } from "astro/config";
import solidJs from "@astrojs/solid-js";
import sitemap from "@astrojs/sitemap";
import unocss from "unocss/astro";
import { vritePlugin } from "@vrite/sdk/astro";
import { loadEnv } from "vite";
import robotsTxt from "astro-robots-txt";

const { VRITE_ACCESS_TOKEN, VRITE_CONTENT_GROUP_ID, ...vars } = loadEnv(
  import.meta.env.MODE,
  process.cwd(),
  ""
);
console.log(VRITE_ACCESS_TOKEN, VRITE_CONTENT_GROUP_ID, vars);

export default defineConfig({
  integrations: [
    unocss({ injectReset: true }),
    solidJs(),
    sitemap(),
    robotsTxt({
      policy: [
        {
          userAgent: "*",
          disallow: ["/frame/"]
        }
      ]
    }),
    vritePlugin({
      accessToken: VRITE_ACCESS_TOKEN,
      contentGroupId: VRITE_CONTENT_GROUP_ID
    })
  ],
  site: "https://vrite.io",
  server: {
    port: 3000,
    host: true
  }
});
