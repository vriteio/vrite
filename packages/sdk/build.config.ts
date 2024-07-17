import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  entries: [{ input: "./src/api" }, { input: "./src/transformers" }, { input: "./src/extensions" }],
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
