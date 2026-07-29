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

export default defineConfig({
  cwd: __dirname,
  input: "./src/index.ts",
  platform: "node",
  tsconfig: "./tsconfig.json",
  resolve: {
    alias: {
      "@andesine/backend": path.resolve(__dirname, "../backend/src"),
      "#backend": path.resolve(__dirname, "../backend/src")
    }
  },
  external(id) {
    return (
      externals.has(id) ||
      (!id.startsWith(".") &&
        !id.startsWith("@andesine/backend/") &&
        !id.startsWith("#backend/") &&
        !path.isAbsolute(id))
    );
  },
  output: {
    file: path.resolve(__dirname, "dist/index.js"),
    format: "esm",
    sourcemap: false
  }
});
