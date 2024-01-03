import { getCommitsSince, getFilesChangedInCommit, getDirectory } from "./requests";
import { GitSyncConfiguration } from "../integration";
import { minimatch } from "minimatch";
import crypto from "node:crypto";
import { errors } from "#lib/errors";

const pull: GitSyncConfiguration["pull"] = async ({ ctx, gitData }) => {
  if (!gitData.github) throw errors.notFound("githubData");

  const octokit = await ctx.fastify.github.getInstallationOctokit(gitData?.github.installationId);
  const changedRecordsByDirectory = new Map<
    string,
    Array<{ fileName: string; status: string; content?: string; hash: string }>
  >();
  const lastCommits = await getCommitsSince({
    payload: { since: gitData.lastCommitDate! },
    githubData: gitData.github!,
    octokit
  });
  const { baseDirectory } = gitData.github!;
  const basePath = baseDirectory.startsWith("/") ? baseDirectory.slice(1) : baseDirectory;

  for await (const commit of lastCommits) {
    const filesChangedInCommit = await getFilesChangedInCommit({
      payload: { commitId: commit.oid },
      githubData: gitData.github!,
      octokit
    });

    filesChangedInCommit.forEach((file) => {
      if (
        !file.filename.startsWith(basePath) ||
        !minimatch(file.filename, gitData.github!.matchPattern)
      ) {
        return;
      }

      const recordPath = file.filename.replace(basePath, "").split("/").filter(Boolean).join("/");
      const directory = recordPath.split("/").slice(0, -1).join("/");
      const fileName = recordPath.split("/").pop() || "";
      const { status } = file;
      const directoryRecords = changedRecordsByDirectory.get(directory) || [];
      const existingRecordIndex = directoryRecords.findIndex(
        (record) => record.fileName === fileName
      );

      if (existingRecordIndex === -1) {
        directoryRecords.push({ fileName, status, hash: "" });
      } else {
        directoryRecords[existingRecordIndex].status = status;
      }

      changedRecordsByDirectory.set(directory, directoryRecords);
    });
  }

  for await (const [directory, files] of changedRecordsByDirectory.entries()) {
    const directoryEntries = await getDirectory({
      githubData: gitData.github!,
      octokit,
      payload: {
        path: [...basePath.split("/"), ...directory.split("/")].filter(Boolean).join("/")
      }
    });

    for await (const entry of directoryEntries) {
      const file = files.find((file) => file.fileName === entry.name);

      if (entry.type === "blob" && file && entry.object.text) {
        file.content = entry.object.text;
        file.hash = crypto.createHash("md5").update(entry.object.text).digest("hex");
      }
    }
  }

  const lastCommit = lastCommits.at(-1) || {
    committedDate: gitData.lastCommitDate || "",
    oid: gitData.lastCommitId || ""
  };

  return {
    changedRecordsByDirectory,
    lastCommit: {
      date: lastCommit.committedDate,
      id: lastCommit.oid
    }
  };
};

export { pull };
