import { defineConfig } from "astro/config";
import solidJs from "@astrojs/solid-js";
import mdx from "@astrojs/mdx";
import unocss from "unocss/astro";
import robotsTxt from "astro-robots-txt";
import node from "@astrojs/node";

export default defineConfig({
  markdown: {
    shikiConfig: {
      theme: "github-dark"
    }
  },
  integrations: [
    mdx({ jsxImportSource: "solid-js/h" }),
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
  site: "https://docs.vrite.io",
  output: "server",
  adapter: node({
    mode: "standalone"
  }),
  server: {
    port: 3000,
    host: true
  }
});
