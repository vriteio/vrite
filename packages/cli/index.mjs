import { Command } from "commander";
import { context } from "esbuild";
import chalk from "chalk";
import fs from "fs/promises";
import path from "path";

const log = {
  info(msg) {
    console.log(chalk.blueBright.bold.inverse(msg));
  },
  error(msg, ...details) {
    console.log(chalk.redBright.bold.inverse(msg), ...details);
  },
  success(msg) {
    console.log(chalk.greenBright.bold.inverse(msg));
  }
};
const program = new Command();

program.name("vrite").description("Vrite CLI");
program
  .command("build-extension")
  .description("Builds a Vrite extension")
  .argument("[spec]", "Path to the extension's spec.json file", "./spec.json")
  .option("-o, --output <dir>", "Output directory", "build")
  .action(async (specPath, options) => {
    const baseDirectory = path.dirname(specPath);
    const specFile = await fs.readFile(specPath, "utf-8");
    const spec = JSON.parse(specFile);
    const outputDir = options.output;
    const build = await context({
      entryPoints: [path.join(baseDirectory, spec.runtime)],
      bundle: true,
      outfile: path.join(outputDir, "index.js"),
      platform: "browser",
      format: "esm",
      minify: true,
      plugins: [
        {
          name: "extension-files",
          setup(build) {
            build.onEnd(async (result) => {
              if (result.errors.length > 0) {
                log.error("Build failed!", result.errors);
              } else {
                try {
                  const processedSpec = {
                    ...spec,
                    runtime: path.join("./", "index.js"),
                    icon: undefined,
                    iconDark: undefined
                  };
                  if (spec.icon) {
                    const iconFileName = path.basename(spec.icon);
                    await fs.copyFile(
                      path.join(baseDirectory, spec.icon),
                      path.join(outputDir, iconFileName)
                    );

                    processedSpec.icon = path.join("./", iconFileName);
                  }
                  if (spec.iconDark) {
                    const iconDarkFileName = path.basename(spec.iconDark);
                    await fs.copyFile(
                      path.join(baseDirectory, spec.iconDark),
                      path.join(outputDir, iconDarkFileName)
                    );

                    processedSpec.iconDark = path.join("./", iconDarkFileName);
                  }

                  await fs.writeFile(
                    path.join(outputDir, "spec.json"),
                    JSON.stringify(processedSpec)
                  );

                  log.success("Build succeeded!");
                } catch (error) {
                  log.error("Build failed!", error);
                }
              }
            });
          }
        }
      ]
    });

    await build.rebuild();

    process.exit();
  });
program.parse();
