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
    const specsPaths = await glob("**/spec.json", { cwd: location });

    for await (const specPath of specsPaths) {
      const specFile = await fs.readFile(path.join(location, specPath), "utf-8");
      const spec = JSON.parse(specFile);
      const functionsDir = path.join(location, path.dirname(specPath), "functions");
      const outPath = path.join(options.output, `${spec.name}.json`);
      const functionsPaths = await glob(["*.[tj]s", "**/index.[tj]s"], {
        cwd: functionsDir
      });
      const [iconPath] = await glob("icon.*", {
        cwd: path.join(location, path.dirname(specPath))
      });
      const [darkIconPath] = await glob("icon-dark.*", {
        cwd: path.join(location, path.dirname(specPath))
      });
      const build = await context({
        entryPoints: functionsPaths.map((functionPath) => path.join(functionsDir, functionPath)),
        platform: "browser",
        bundle: true,
        format: "esm",
        // globalName: "__extension_function__",
        write: false,
        minify: false,
        outdir: "out",
        plugins: [
          {
            name: "json",
            setup(build) {
              build.onEnd(async (result) => {
                if (result.errors.length > 0) {
                  log.error("Build failed!", result.errors);
                } else {
                  try {
                    if (iconPath) {
                      const contents = await fs.readFile(
                        path.join(location, path.dirname(specPath), iconPath)
                      );
                      const b64 = contents.toString("base64");
                      const type = await imageType(contents);

                      spec.icon = `data:${type?.mime || "image/svg+xml"};base64,${b64}`;
                    }

                    if (darkIconPath) {
                      const contents = await fs.readFile(
                        path.join(location, path.dirname(specPath), darkIconPath)
                      );
                      const b64 = contents.toString("base64");
                      const type = await imageType(contents);

                      spec.darkIcon = `data:${type?.mime || "image/svg+xml"};base64,${b64}`;
                    }

                    spec.functions = {};

                    for (const file of result.outputFiles) {
                      const name = path.basename(file.path, ".js");

                      spec.functions[name] = file.text;
                    }

                    await fs.mkdir(path.dirname(outPath), { recursive: true });
                    await fs.writeFile(outPath, JSON.stringify(spec));
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
    }

    process.exit();
  });
program.parse();
