import { getDirectory, getLastCommit } from "./requests";
import {
  CommonGitProviderDirectory,
  CommonGitProviderRecord,
  GitSyncConfiguration
} from "../../provider";
import { minimatch } from "minimatch";
import crypto from "node:crypto";
import { errors } from "#lib/errors";

const initialSync: GitSyncConfiguration["initialSync"] = async ({ ctx, gitData }) => {
  if (!gitData?.github) throw errors.notFound("gitData");

  const octokit = await ctx.fastify.github.getInstallationOctokit(gitData?.github.installationId);

  let { baseDirectory } = gitData.github;

  if (baseDirectory.startsWith("/")) baseDirectory = baseDirectory.slice(1);

  const latestGitHubCommit = await getLastCommit({ octokit, githubData: gitData.github! });

  if (!latestGitHubCommit) throw errors.notFound("lastCommit");

  const fetchGitDirectory = async (path: string): Promise<CommonGitProviderDirectory> => {
    const syncedPath = path.startsWith("/") ? path.slice(1) : path;
    const recordPath = path.replace(baseDirectory, "").split("/").filter(Boolean).join("/");
    const name = recordPath.split("/").pop() || gitData.github?.repositoryName || "";
    const gitRecords: CommonGitProviderRecord[] = [];
    const gitDirectories: CommonGitProviderDirectory[] = [];
    const entries = await getDirectory({
      githubData: gitData.github!,
      octokit,
      payload: { path: syncedPath }
    });

    for await (const entry of entries) {
      if (entry.type === "tree") {
        const gitDirectory = await fetchGitDirectory(
          syncedPath.split("/").filter(Boolean).concat(entry.name).join("/")
        );

        gitDirectories.push(gitDirectory);
      } else if (
        entry.type === "blob" &&
        entry.object.text &&
        minimatch(entry.name, gitData.github!.matchPattern)
      ) {
        const path = [...recordPath.split("/"), entry.name].filter(Boolean).join("/");

        gitRecords.push({
          content: entry.object.text,
          hash: crypto.createHash("md5").update(entry.object.text).digest("hex"),
          status: "added",
          path
        });
      }
    }

    return {
      records: gitRecords,
      directories: gitDirectories,
      path: recordPath,
      name
    };
  };
  const directory = await fetchGitDirectory(baseDirectory);

  return {
    directory,
    lastCommit: {
      date: latestGitHubCommit.committedDate,
      id: latestGitHubCommit.oid
    }
  };
};

export { initialSync };
