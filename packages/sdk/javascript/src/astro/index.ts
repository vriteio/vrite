import { AstroIntegration } from "astro";
import { Plugin as VitePlugin } from "vite";

interface VritePluginOptions {
  accessToken: string;
  contentGroupId: string;
}

const createVitePlugin = (options: VritePluginOptions): VitePlugin => {
  const virtualModuleId = "virtual:vrite";
  const resolvedVirtualModuleId = `\0${virtualModuleId}`;

  return {
    name: "vrite",
    resolveId(id) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId;
      }
    },
    load(id) {
      if (id === resolvedVirtualModuleId) {
        return `import{createClient}from"@vrite/sdk/api";import Content from"@vrite/sdk/astro/content.astro";import*as utils from"@vrite/sdk/astro/utils";const client=createClient({token:"${options.accessToken}"}),getStaticPaths=()=>utils.getStaticPaths("${options.contentGroupId}"),getContentPieces=t=>utils.getContentPieces("${options.contentGroupId}",t),getContentGroupId=()=>"${options.contentGroupId}";export{client,Content,getStaticPaths,getContentPieces,getContentGroupId};`;
      }
    }
  };
};
const createAstroPlugin = (options: VritePluginOptions): AstroIntegration => {
  return {
    name: "vrite",
    hooks: {
      "astro:config:setup": ({ updateConfig }) => {
        updateConfig({
          vite: {
            plugins: [createVitePlugin(options)]
          }
        });
      }
    }
  };
};
const vritePlugin = createAstroPlugin;

export { vritePlugin };
