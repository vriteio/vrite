import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  entries: [
    { input: "./src", builder: "mkdist", outDir: "dist" },
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
