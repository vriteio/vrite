/* eslint-disable no-inline-comments */
import autoImportPlugin from "unplugin-auto-import/vite";
import type { AstroIntegration } from "astro";
import type { Plugin as VitePlugin } from "vite";

interface VritePagesSourceConfig<T extends object = Record<string, any>> {
  name: string;
  config: T;
}
interface VritePagesConfig {
  name?: string;
  logo?: string;
  favicon?: string;
  theme?: string;
  links?: Array<{ url: string; label: string; icon?: string }>;
}
interface VritePagesPluginConfig {
  source: VritePagesSourceConfig;
  config: VritePagesConfig;
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

        if (typeof getConfig !== "function") getConfig = () => getConfig;

        const useContentSource = (Astro) => {
          const config = getConfig({ Astro });

          return getSource({Astro}, getConfig);
        }

        export { useContentSource }
        `;
      } else if (id === resolvedVirtualComponentsModuleId) {
        return /* js */ `
        const rootPath = import.meta.url.replace("%00vrite:pages/components","");
        const importPath = rootPath + "src/components/content";
        const Components = {};
        try {
          const contentComponentsModule = await import(/* @vite-ignore */ importPath);

          Object.keys(contentComponentsModule).forEach((key) => {
            if(key === "default") return;
            
            Components[key] = contentComponentsModule[key];
          });
        } catch (e){
          console.log("No content components found");
        }

        export { Components };
        `;
      }
    }
  };
};
const createAstroPlugin = (
  config: VritePagesPluginConfig
): AstroIntegration & { __: VritePagesPluginConfig } => {
  return {
    __: config,
    name: "vrite-pages",
    hooks: {
      "astro:config:setup": ({ updateConfig }) => {
        updateConfig({
          vite: {
            plugins: [
              autoImportPlugin({ dirs: ["./src/components/content/**"], dts: false }),
              createVitePlugin()
            ]
          }
        });
      }
    }
  };
};
const vritePages = createAstroPlugin;

export { vritePages };
export { vrite } from "./content-sources";
