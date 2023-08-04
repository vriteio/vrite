import { Collection, Db, ObjectId } from "mongodb";
import { z } from "zod";
import { UnderscoreID, zodId } from "#lib/mongo";

const githubData = z.object({
  installationId: z.number(),
  repositoryName: z.string(),
  repositoryOwner: z.string(),
  branchName: z.string(),
  baseDirectory: z.string(),
  variantsDirectory: z.string().optional(),
  matchPattern: z.string().optional(),
  inputTransformer: z.string(),
  outputTransformer: z.string(),
  formatOutput: z.boolean()
});
const gitRecord = z.object({
  contentPieceId: zodId(),
  syncedHash: z.string(),
  currentHash: z.string(),
  staged: z.boolean().optional(),
  variantId: zodId().optional(),
  path: z.string()
});
const gitData = z.object({
  id: zodId(),
  provider: z.enum(["github"]),
  github: githubData.optional(),
  records: z.array(gitRecord),
  contentGroupId: zodId().optional(),
  lastCommitDate: z.string().optional(),
  lastCommitId: z.string().optional()
});

interface GitRecord<ID extends string | ObjectId = string>
  extends Omit<z.infer<typeof gitRecord>, "contentPieceId"> {
  contentPieceId: ID;
}
interface GitHubData extends z.infer<typeof githubData> {}
interface GitData<ID extends string | ObjectId = string>
  extends Omit<z.infer<typeof gitData>, "id" | "records" | "contentGroupId"> {
  id: ID;
  contentGroupId?: ID;
  records: Array<GitRecord<ID>>;
}
interface FullGitData<ID extends string | ObjectId = string> extends GitData<ID> {
  workspaceId: ID;
}

const getGitDataCollection = (db: Db): Collection<UnderscoreID<FullGitData<ObjectId>>> => {
  return db.collection("git-data");
};

export { gitData, githubData, gitRecord, getGitDataCollection };
export type { GitHubData, FullGitData, GitData, GitRecord };
