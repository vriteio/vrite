import { context } from "esbuild";

const buildExtension = async (extensionCreator) => {
  const build = await context({
    entryPoints: ["./v1.tsx"],
    bundle: true,
    external: ["saslprep", "sharp"],
    outfile: `index.js`,
    platform: "node"
  });

  await build.rebuild();
};

buildExtension();
