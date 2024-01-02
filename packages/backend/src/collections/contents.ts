import { Binary, Collection, Db, ObjectId } from "mongodb";
import { UnderscoreID } from "#lib/mongo";

interface Contents<ID extends string | ObjectId = string> {
  contentPieceId: ID;
  content?: Binary;
  id: ID;
}
interface FullContents<ID extends string | ObjectId = string> extends Contents<ID> {}

const getContentsCollection = (db: Db): Collection<UnderscoreID<FullContents<ObjectId>>> => {
  return db.collection("contents");
};

export { getContentsCollection };
export type { Contents, FullContents };
