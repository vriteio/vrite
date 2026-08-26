import path from "node:path";
import { builtinModules } from "node:module";
import { fileURLToPath } from "node:url";
import { defineConfig } from "rolldown";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const externals = new Set([
  ...builtinModules,
  ...builtinModules.map((moduleName) => `node:${moduleName}`)
]);
const bundledModules = new Set([
  "@andesine/editor/normalize-resource-name",
  "@andesine/editor/normalize-source-name"
]);

export default defineConfig({
  cwd: __dirname,
  input: {
    index: "./src/index.ts",
    migrate: "./src/migrate.ts"
  },
  platform: "node",
  tsconfig: "./tsconfig.json",
  resolve: {
    alias: {
      "#backend": path.resolve(__dirname, "src")
    }
  },
  external(id) {
    if (externals.has(id)) {
      return true;
    }

    if (bundledModules.has(id)) {
      return false;
    }

    return !id.startsWith(".") && !path.isAbsolute(id) && !id.startsWith("#backend/");
  },
  output: {
    dir: path.resolve(__dirname, "dist"),
    entryFileNames: "[name].js",
    format: "esm",
    sourcemap: false
  }
});
