import { Collection, Db, ObjectId } from "mongodb";
import { z } from "zod";
import { UnderscoreID, zodId } from "#lib/mongo";

const commonGitProviderData = z.object({
  baseDirectory: z.string().describe("Base directory to sync from"),
  matchPattern: z.string().describe("Pattern to match files to sync"),
  transformer: z.string().describe("Name or ID of the content transformer to use")
});
const githubData = commonGitProviderData.extend({
  installationId: z.number().describe("ID of the GitHub App installation"),
  repositoryName: z.string().describe("Name of the repository"),
  repositoryOwner: z.string().describe("Owner (GitHub user or organization) of the repository"),
  branchName: z.string().describe("Name of the branch to sync from")
});
const gitRecord = z.object({
  contentPieceId: zodId().describe("ID of the content piece the record is associated with"),
  syncedHash: z.string().describe("Last-synced hash of the content piece"),
  currentHash: z.string().describe("Current hash of the content piece"),
  path: z.string().describe("Path of the file in the repository, relative to the base directory")
});
const gitDirectory = z.object({
  path: z
    .string()
    .describe("Path of the directory in the repository, relative to the base directory"),
  contentGroupId: zodId().describe("ID of the content group the directory is associated with")
});
const gitData = z.object({
  id: zodId().describe("ID of the Git sync configuration data"),
  provider: z.enum(["github"]).describe("Name of the used Git provider"),
  github: githubData.describe("GitHub-specific provider configuration data").optional(),
  records: z.array(gitRecord).describe("Git sync records"),
  directories: z.array(gitDirectory).describe("Git sync directories"),
  contentGroupId: zodId()
    .describe("ID of the top-level content group connected with Git sync")
    .optional(),
  lastCommitDate: z.string().describe("Date of the last commit").optional(),
  lastCommitId: z.string().describe("ID of the last commit").optional()
});

interface GitRecord<ID extends string | ObjectId = string>
  extends Omit<z.infer<typeof gitRecord>, "contentPieceId"> {
  contentPieceId: ID;
}
interface GitDirectory<ID extends string | ObjectId = string>
  extends Omit<z.infer<typeof gitDirectory>, "contentGroupId"> {
  contentGroupId: ID;
}
interface GitHubData extends z.infer<typeof githubData> {}
interface CommonGitProviderData extends z.infer<typeof commonGitProviderData> {}
interface GitData<ID extends string | ObjectId = string>
  extends Omit<
    z.infer<typeof gitData>,
    "id" | "records" | "directories" | "contentGroupId" | "versionId"
  > {
  id: ID;
  contentGroupId?: ID;
  records: Array<GitRecord<ID>>;
  directories: Array<GitDirectory<ID>>;
  versionId?: ID;
}
interface FullGitData<ID extends string | ObjectId = string> extends GitData<ID> {
  workspaceId: ID;
}

const getGitDataCollection = (db: Db): Collection<UnderscoreID<FullGitData<ObjectId>>> => {
  return db.collection("git-data");
};

export {
  gitData,
  githubData,
  gitRecord,
  gitDirectory,
  commonGitProviderData,
  getGitDataCollection
};
export type { GitHubData, FullGitData, GitData, GitRecord, GitDirectory, CommonGitProviderData };
