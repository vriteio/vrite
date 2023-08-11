import { defineBuildConfig } from "unbuild";
import path from "path"

export default defineBuildConfig({
  entries: [
    { input: "./src/api" },
    { input: "./src/transformers" },
    { input: "./src/astro", builder: "mkdist", outDir: "dist/astro" },
    { input: "./src/types", builder: "mkdist", outDir: "dist/types" }
  ],
  declaration: true,
  clean: true,
  failOnWarn: false,
  rollup: {
    emitCJS: true,
    esbuild: {
      minify: true
    }
  }
});
