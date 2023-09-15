import { defineConfig } from "astro/config";
import solidJs from "@astrojs/solid-js";
import unocss from "unocss/astro";
import robotsTxt from "astro-robots-txt";

export default defineConfig({
  markdown: {
    shikiConfig: {
      theme: "github-dark"
    }
  },
  integrations: [
    unocss({ injectReset: true }),
    solidJs(),
    robotsTxt({
      policy: [
        {
          userAgent: "*"
        }
      ]
    })
  ],
  build: {
    redirects: false
  },
  site: "https://docs.vrite.io",
  server: {
    port: 3000,
    host: true
  }
});
