import { z } from "zod";
import { Collection, Db, ObjectId } from "mongodb";
import { UnderscoreID, zodId } from "#lib/mongo";

const contentGroup = z.object({
  id: zodId(),
  name: z.string().describe("Content group name"),
  ancestors: z.array(zodId()).describe("Ancestor content group ID"),
  descendants: z.array(zodId()).describe("Array of descendant content group IDs")
});

interface ContentGroup<ID extends string | ObjectId = string>
  extends Omit<z.infer<typeof contentGroup>, "id" | "ancestors" | "descendants"> {
  id: ID;
  ancestors: ID[];
  descendants: ID[];
}

interface FullContentGroup<ID extends string | ObjectId = string> extends ContentGroup<ID> {
  workspaceId: ID;
}

const getContentGroupsCollection = (
  db: Db
): Collection<UnderscoreID<FullContentGroup<ObjectId>>> => {
  return db.collection("content-groups");
};

export { contentGroup, getContentGroupsCollection };
export type { ContentGroup, FullContentGroup };
