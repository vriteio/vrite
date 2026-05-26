import { readFile } from "node:fs/promises";
import { isProduction, serverEntryPath, templatePath } from "./config.mjs";

const createModuleLoader = (vite) => {
  let productionModulePromise;

  return async () => {
    if (!isProduction) {
      return vite.ssrLoadModule("/src/entry-server.tsx");
    }

    productionModulePromise ||= import(serverEntryPath);

    return productionModulePromise;
  };
};

const createTemplateLoader = (vite) => {
  let productionTemplatePromise;

  return async (url) => {
    if (!isProduction) {
      const template = await readFile(templatePath, "utf8");

      return vite.transformIndexHtml(url, template);
    }

    productionTemplatePromise ||= readFile(templatePath, "utf8");

    return productionTemplatePromise;
  };
};

export { createModuleLoader, createTemplateLoader };
