import { Binary, Collection, Db, ObjectId } from "mongodb";
import { UnderscoreID } from "#lib/mongo";

interface SnippetContent<ID extends string | ObjectId = string> {
  snippetId: ID;
  content?: Binary;
  id: ID;
}
interface FullSnippetContent<ID extends string | ObjectId = string> extends SnippetContent<ID> {}

const getSnippetContentsCollection = (
  db: Db
): Collection<UnderscoreID<FullSnippetContent<ObjectId>>> => {
  return db.collection("snippet-contents");
};

export { getSnippetContentsCollection };
export type { SnippetContent, FullSnippetContent };
