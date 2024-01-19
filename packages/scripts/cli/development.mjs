import { ChildProcess, fork } from "child_process";
import { Command } from "commander";
import { context } from "esbuild";
import chalk from "chalk";
import { glob } from "glob";
import fs from "fs/promises";
import path from "path";
import imageType from "image-type";

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

program.name("scripts").description("Scripts for the Vrite monorepo");
program
  .command("dev-node")
  .description("Start the development server for Node.js backend project")
  .argument("<entry>", "Entry point for the project")
  .action(async (entry) => {
    /** @type {ChildProcess|undefined} */
    let proc;

    const build = await context({
      entryPoints: [entry],
      bundle: true,
      external: ["saslprep", "sharp"],
      outfile: "dist/index.js",
      platform: "node",
      plugins: [
        {
          name: "run",
          setup(build) {
            build.onEnd((result) => {
              if (result.errors.length > 0) {
                log.error("Build failed!", result.errors);
              } else {
                log.success("Build succeeded!");
                proc?.kill();
                proc = fork("dist/index.js", { stdio: "inherit" });
                log.info("App restarted");
              }
            });
          }
        }
      ]
    });

    build.watch();
  });
program
  .command("dev-script")
  .description("Start the development server for a web script")
  .argument("<entry>", "Entry point for the script")
  .argument("[output]", "Output path for the build", "dist/index.js")
  .action(async (entry, output) => {
    /** @type {ChildProcess|undefined} */
    let proc;

    const build = await context({
      entryPoints: [entry],
      bundle: true,
      outfile: `${output}`,
      platform: "browser"
    });

    build.watch();
  });
program
  .command("build-node")
  .description("Build Node.js backend project")
  .argument("<entry>", "Entry point for the project")
  .argument("[output]", "Output directory for the build", "dist")
  .action(async (entry, output) => {
    const build = await context({
      entryPoints: [entry],
      bundle: true,
      external: ["saslprep", "sharp"],
      outfile: `${output}/index.js`,
      platform: "node",
      plugins: [
        {
          name: "run",
          setup(build) {
            build.onEnd((result) => {
              if (result.errors.length > 0) {
                log.error("Build failed!", result.errors);
              } else {
                log.success("Build succeeded!");
              }
            });
          }
        }
      ]
    });

    await build.rebuild();
    process.exit(0);
  });
program
  .command("build-script")
  .description("Build a a web script")
  .argument("<entry>", "Entry point for the script")
  .argument("[output]", "Output path for the build", "dist/index.js")
  .action(async (entry, output) => {
    /** @type {ChildProcess|undefined} */
    let proc;

    const build = await context({
      entryPoints: [entry],
      bundle: true,
      outfile: `${output}`,
      platform: "browser",
      minify: true
    });

    await build.rebuild();
    process.exit(0);
  });
program
  .command("build-extension")
  .alias("build-extensions")
  .description("Builds Vrite extension(s)")
  .argument("[location]", "Location of the extension(s)", "./")
  .option("-o, --output <dir>", "Output directory", "build")
  .action(async (location, options) => {
    const indexPath = await glob("src/index.*", { cwd: location });
    const assetsDir = path.join(location, "assets");
    const outputDir = options.output;
    const build = await context({
      entryPoints: [indexPath[0]],
      bundle: true,
      outfile: `${outputDir}/index.js`,
      platform: "browser",
      format: "esm",
      minify: true,
      plugins: [
        {
          name: "copy-assets",
          setup(build) {
            build.onEnd(async (result) => {
              if (result.errors.length > 0) {
                log.error("Build failed!", result.errors);
              } else {
                try {
                  await fs.cp(assetsDir, path.join(outputDir, "assets"), { recursive: true });
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
