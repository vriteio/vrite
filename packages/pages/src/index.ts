/* eslint-disable no-inline-comments */
import { parse as parseJs } from "acorn";
import type { ConfigureSource, DynamicConfig } from "./utils";
import type { AstroIntegration } from "astro";
import type { MdxjsEsm } from "mdast-util-mdx";
import type { VFile } from "vfile";
import type { Plugin as VitePlugin } from "vite";
import type { GeneralConfig } from "vrite:pages";

interface VritePagesPluginConfig {
  source: ReturnType<ConfigureSource>;
  config: DynamicConfig<GeneralConfig>;
}

const createVitePlugin = (): VitePlugin => {
  const virtualModuleId = "vrite:pages";
  const virtualComponentsModuleId = "vrite:pages/components";
  const resolvedVirtualModuleId = `\0${virtualModuleId}`;
  const resolvedVirtualComponentsModuleId = `\0${virtualComponentsModuleId}`;

  return {
    name: "vrite-pages",
    resolveId(id) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId;
      } else if (id === virtualComponentsModuleId) {
        return resolvedVirtualComponentsModuleId;
      }
    },
    load(id) {
      if (id === resolvedVirtualModuleId) {
        return /* js */ `
        import config from "./astro.config";

        const vritePagesIntegration = config.integrations.find((integration) => {
            return integration.name === "vrite-pages";
        });
        const getSource = vritePagesIntegration.__.source;

        let getConfig = vritePagesIntegration.__.config;

        if (typeof getConfig !== "function") getConfig = () => vritePagesIntegration.__.config;

        const useContentSource = (Astro) => {
          const config = getConfig(Astro);

          return getSource(Astro, getConfig);
        }
        const useConfig = (Astro) => {
          return getConfig(Astro);
        }

        export { useContentSource, useConfig }
        `;
      } else if (id === resolvedVirtualComponentsModuleId) {
        return /* js */ `
        const rootPath = import.meta.url.replace("%00vrite:pages/components","");
        const importPath = rootPath + "src/components/content";
        let Components = {};
        try {
          const contentComponentsModule = await import(/* @vite-ignore */ importPath);

          Object.keys(contentComponentsModule).forEach((key) => {
            if(key === "default") return;
            
            Components[key] = contentComponentsModule[key];
          });
        } catch (e) {
          components = {};
        }

        export { Components };
        `;
      }
    }
  };
};
const createAstroPlugin = (config: VritePagesPluginConfig): AstroIntegration => {
  return {
    __: config,
    name: "vrite-pages",
    hooks: {
      "astro:config:setup": ({ updateConfig }) => {
        updateConfig({
          vite: {
            plugins: [createVitePlugin() as any]
          },
          markdown: {
            remarkPlugins: [
              () => {
                const js = `import * as Components from "src/components/content"`;
                const importNode: MdxjsEsm = {
                  type: "mdxjsEsm",
                  value: js,
                  data: {
                    estree: {
                      ...parseJs(js, { ecmaVersion: "latest", sourceType: "module" }),
                      type: "Program",
                      sourceType: "module"
                    }
                  } as MdxjsEsm["data"]
                };

                return (tree: { children: any[] }, file: VFile) => {
                  const processNode = (node: any): void => {
                    if (node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement") {
                      node.name = `Components.${node.name}`;
                    }

                    if (node.children) {
                      node.children.forEach(processNode);
                    }
                  };

                  processNode(tree);

                  if (!file.basename?.endsWith(".md")) {
                    tree.children.unshift(importNode);
                  }
                };
              }
            ]
          }
        });
      }
    }
  } as AstroIntegration & { __: VritePagesPluginConfig };
};
const vritePages = createAstroPlugin;

export { vritePages };
export type { VritePagesPluginConfig };
export { content, vrite } from "./content-sources";
