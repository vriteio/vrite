import { Collection, Db, ObjectId } from "mongodb";
import { z } from "zod";
import { UnderscoreID, zodId } from "#lib/mongo";

const githubData = z.object({
  installationId: z.number(),
  repositoryName: z.string(),
  repositoryOwner: z.string(),
  branchName: z.string()
});
const gitRecord = z.object({
  contentPieceId: zodId(),
  syncedHash: z.string(),
  currentHash: z.string(),
  path: z.string()
});
const gitData = z.object({
  id: zodId(),
  github: githubData,
  records: z.array(gitRecord)
});

interface GitRecord<ID extends string | ObjectId = string>
  extends Omit<z.infer<typeof gitRecord>, "contentPieceId"> {
  contentPieceId: ID;
}
interface GitData<ID extends string | ObjectId = string>
  extends Omit<z.infer<typeof gitData>, "id" | "records"> {
  id: ID;
  records: Array<GitRecord<ID>>;
}
interface FullGitData<ID extends string | ObjectId = string> extends GitData<ID> {
  workspaceId: ID;
}

const getGitDataCollection = (db: Db): Collection<UnderscoreID<FullGitData<ObjectId>>> => {
  return db.collection("git-data");
};

export { gitData, githubData, gitRecord, getGitDataCollection };
export type { FullGitData, GitData, GitRecord };
