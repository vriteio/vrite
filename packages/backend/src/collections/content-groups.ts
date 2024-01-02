import { z } from "zod";
import { Collection, Db, ObjectId } from "mongodb";
import { UnderscoreID, zodId } from "#lib/mongo";

const contentGroup = z.object({
  id: zodId(),
  name: z.string(),
  ancestors: z.array(zodId()),
  descendants: z.array(zodId())
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
