import { ChildProcess, fork } from "child_process";
import { Command } from "commander";
import { context } from "esbuild";
import chalk from "chalk";

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
  .command("build-node")
  .description("Build Node.js backend project")
  .argument("<entry>", "Entry point for the project")
  .argument("[output]", "Output directory for the build", "dist")
  .action(async (entry, output) => {
    const build = await context({
      entryPoints: [entry],
      bundle: true,
      outfile: `${output}/index.js`,
      platform: "node",
      minify: true,
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
program.parse();
