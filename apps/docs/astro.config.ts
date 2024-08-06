import { discordIcon } from "./src/assets/icons";
import { defineConfig } from "astro/config";
import solidJs from "@astrojs/solid-js";
import unocss from "unocss/astro";
import robotsTxt from "astro-robots-txt";
import mdx from "@astrojs/mdx";
import icon from "astro-icon";
import { content, vritePages } from "@vrite/pages";
import { mdiBookOpenBlankVariant, mdiConsoleLine, mdiGithub } from "@mdi/js";

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
    }),
    icon(),
    vritePages({
      source: content({
        groups: {
          docs: {
            data: {
              label: "Documentation",
              url: "/getting-started/introduction",
              icon: mdiBookOpenBlankVariant
            },
            collection: "docs",
            tree: {
              branches: [
                {
                  branchName: "Getting Started",
                  contentSlugs: ["getting-started/introduction", "getting-started/concepts"]
                },
                {
                  branchName: "Usage Guide",
                  contentSlugs: ["usage-guide/configuring-vrite"],
                  branches: [
                    {
                      branchName: "Navigation",
                      contentSlugs: [
                        "usage-guide/navigation/introduction",
                        "usage-guide/navigation/dashboard",
                        "usage-guide/navigation/explorer",
                        "usage-guide/navigation/command-palette"
                      ]
                    },
                    {
                      branchName: "Content Editing",
                      contentSlugs: ["usage-guide/content-editor", "usage-guide/metadata"]
                    },
                    {
                      branchName: "Vrite Extensions",
                      contentSlugs: [
                        "usage-guide/extensions/introduction",
                        "usage-guide/extensions/official/dev",
                        "usage-guide/extensions/official/hashnode",
                        "usage-guide/extensions/official/medium",
                        "usage-guide/extensions/official/gpt",
                        "usage-guide/extensions/official/mdx"
                      ]
                    }
                  ]
                },
                {
                  branchName: "JavaScript SDK",
                  contentSlugs: ["javascript-sdk/introduction"]
                },
                {
                  branchName: "Self-Hosting",
                  contentSlugs: ["self-hosting/docker", "self-hosting/configuration"]
                }
              ]
            }
          },
          api: {
            data: {
              label: "API Reference",
              url: "/api/authentication",
              icon: mdiConsoleLine
            },
            collection: "api",
            tree: {
              branches: [
                { branchName: "Getting Started", contentSlugs: ["api/authentication"] },
                {
                  branchName: "Endpoints",
                  contentSlugs: [
                    "api/content-groups",
                    "api/content-pieces",
                    "api/tags",
                    "api/profile",
                    "api/search",
                    "api/variants",
                    "api/webhooks",
                    "api/user-settings",
                    "api/roles",
                    "api/workspace",
                    "api/workspace-memberships",
                    "api/workspace-settings",
                    "api/transformers",
                    "api/extension"
                  ]
                }
              ]
            }
          }
        }
      }),
      config: {
        title: "Vrite Documentation",
        description: "",
        links: [
          {
            label: "GitHub",
            url: "https://github.com/vriteio/vrite",
            icon: mdiGithub
          },
          {
            label: "Community",
            url: "https://discord.gg/yYqDWyKnqE",
            icon: discordIcon
          }
        ]
      }
    }),
    mdx()
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
