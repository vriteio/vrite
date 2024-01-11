import { Collection, Db, ObjectId } from "mongodb";
import { z } from "zod";
import { UnderscoreID, zodId } from "#lib/mongo";

const githubData = z.object({
  installationId: z.number(),
  repositoryName: z.string(),
  repositoryOwner: z.string(),
  branchName: z.string(),
  baseDirectory: z.string(),
  matchPattern: z.string(),
  variantsDirectory: z.string(),
  baseVariantDirectory: z.string(),
  transformer: z.string()
});
const gitRecord = z.object({
  contentPieceId: zodId(),
  syncedHash: z.string(),
  currentHash: z.string(),
  path: z.string(),
  variantId: zodId().optional()
});
const gitDirectory = z.object({
  path: z.string(),
  contentGroupId: zodId()
});
const gitData = z.object({
  id: zodId(),
  provider: z.enum(["github"]),
  github: githubData.optional(),
  records: z.array(gitRecord),
  directories: z.array(gitDirectory),
  contentGroupId: zodId().optional(),
  lastCommitDate: z.string().optional(),
  lastCommitId: z.string().optional()
});

interface GitRecord<ID extends string | ObjectId = string>
  extends Omit<z.infer<typeof gitRecord>, "contentPieceId" | "variantId"> {
  contentPieceId: ID;
  variantId?: ID;
}
interface GitDirectory<ID extends string | ObjectId = string>
  extends Omit<z.infer<typeof gitDirectory>, "contentGroupId"> {
  contentGroupId: ID;
}
interface GitHubData extends z.infer<typeof githubData> {}
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

export { gitData, githubData, gitRecord, gitDirectory, getGitDataCollection };
export type { GitHubData, FullGitData, GitData, GitRecord, GitDirectory };
