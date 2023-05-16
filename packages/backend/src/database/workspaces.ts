import { z } from "zod";
import { Collection, Db, ObjectId } from "mongodb";
import { UnderscoreID, zodId } from "#lib/mongo";

const contentGroup = z.object({
  id: zodId(),
  name: z.string().describe("Content group name"),
  locked: z.boolean().optional()
});
const workspace = z.object({
  id: zodId(),
  name: z.string().min(1).max(20),
  description: z.string().optional(),
  logo: z.string().optional(),
  contentGroups: z.array(contentGroup.extend({ id: z.string() }))
});

interface ContentGroup<ID extends string | ObjectId = string>
  extends Omit<z.infer<typeof contentGroup>, "id"> {
  id: ID;
}
interface Workspace<ID extends string | ObjectId = string>
  extends Omit<z.infer<typeof workspace>, "contentGroups" | "id"> {
  id: ID;
  contentGroups: Array<ContentGroup<ID>>;
}

interface FullWorkspace<ID extends string | ObjectId = string> extends Workspace<ID> {}

const getWorkspacesCollection = (
  db: Db
): Collection<
  UnderscoreID<
    Omit<FullWorkspace<ObjectId>, "contentGroups"> & {
      contentGroups: Array<UnderscoreID<ContentGroup<ObjectId>>>;
    }
  >
> => {
  return db.collection("workspaces");
};

export { contentGroup, workspace, getWorkspacesCollection };
export type { ContentGroup, Workspace, FullWorkspace };
