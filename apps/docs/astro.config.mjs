import { defineConfig } from "astro/config";
import solidJs from "@astrojs/solid-js";
import unocss from "unocss/astro";
import robotsTxt from "astro-robots-txt";
import node from "@astrojs/node";

export default defineConfig({
  integrations: [
    unocss(),
    solidJs(),
    robotsTxt({
      policy: [
        {
          userAgent: "*"
        }
      ]
    })
  ],
  output: "server",
  adapter: node({
    mode: "standalone"
  }),
  site: "https://docs.vrite.io",
  server: {
    port: 3000,
    host: true
  }
});
