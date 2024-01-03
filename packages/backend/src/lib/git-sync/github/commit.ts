import { commitChanges } from "./requests";
import { GitSyncConfiguration } from "../integration";
import { errors } from "#lib/errors";

const commit: GitSyncConfiguration["commit"] = async ({
  ctx,
  gitData,
  message,
  additions,
  deletions
}) => {
  if (!gitData.github) throw errors.notFound("githubData");

  const octokit = await ctx.fastify.github.getInstallationOctokit(gitData?.github.installationId);
  const { baseDirectory } = gitData.github!;
  const result = await commitChanges({
    githubData: gitData.github!,
    octokit,
    payload: {
      additions: additions.map((addition, index) => {
        return {
          contents: Buffer.from(addition.contents).toString("base64"),
          path: [...baseDirectory.split("/"), ...addition.path.split("/")].filter(Boolean).join("/")
        };
      }),
      deletions: deletions.map((deletion) => {
        return {
          ...deletion,
          path: [...baseDirectory.split("/"), ...deletion.path.split("/")].filter(Boolean).join("/")
        };
      }),
      message,
      expectedCommitId: gitData.lastCommitId!
    }
  });

  if (!result) throw errors.serverError();

  if (result.status === "stale-data") {
    return {
      status: "stale"
    };
  }

  return {
    commit: {
      id: result.oid,
      date: result.committedDate
    },
    status: "success"
  };
};

export { commit };
