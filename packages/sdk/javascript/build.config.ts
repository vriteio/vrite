import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  entries: [
    { input: "./src/api" },
    { input: "./src/transformers" },
    { input: "./src/extensions" },
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
