import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const serverDir = dirname(fileURLToPath(import.meta.url));
const appRoot = dirname(serverDir);
const port = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === "production";
const templatePath = isProduction
  ? resolve(appRoot, "dist/client/index.html")
  : resolve(appRoot, "index.html");
const clientRoot = resolve(appRoot, "dist/client");
const serverEntryPath = resolve(appRoot, "dist/server/entry-server.js");
const viteConfigPath = resolve(appRoot, "vite.config.ts");

export {
  appRoot,
  clientRoot,
  isProduction,
  port,
  serverDir,
  serverEntryPath,
  templatePath,
  viteConfigPath
};
