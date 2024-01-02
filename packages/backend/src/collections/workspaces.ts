import { z } from "zod";
import { Collection, Db, ObjectId } from "mongodb";
import { UnderscoreID, zodId } from "#lib/mongo";

const workspace = z.object({
  id: zodId(),
  name: z.string().min(1).max(50),
  description: z.string().optional(),
  logo: z.string().optional(),
  contentGroups: z.array(zodId())
});

interface Workspace<ID extends string | ObjectId = string>
  extends Omit<z.infer<typeof workspace>, "id" | "contentGroups"> {
  id: ID;
  contentGroups: ID[];
}

interface FullWorkspace<ID extends string | ObjectId = string> extends Workspace<ID> {}

const getWorkspacesCollection = (db: Db): Collection<UnderscoreID<FullWorkspace<ObjectId>>> => {
  return db.collection("workspaces");
};

export { workspace, getWorkspacesCollection };
export type { Workspace, FullWorkspace };
