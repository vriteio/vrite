import { Collection, Db, ObjectId } from "mongodb";
import { z } from "zod";
import { UnderscoreID, zodId } from "#lib/mongo";

const snippet = z.object({
  id: zodId().describe("ID of the snippet"),
  name: z.string().describe("Name of the snippet")
});

interface Snippet<ID extends string | ObjectId = string>
  extends Omit<z.infer<typeof snippet>, "id"> {
  id: ID;
}

interface FullSnippet<ID extends string | ObjectId = string> extends Snippet<ID> {
  workspaceId: ID;
}

const getSnippetsCollection = (db: Db): Collection<UnderscoreID<FullSnippet<ObjectId>>> => {
  return db.collection("snippets");
};

export { snippet, getSnippetsCollection };
export type { Snippet, FullSnippet };
