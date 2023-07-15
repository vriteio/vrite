import { Binary, Collection, Db, ObjectId } from "mongodb";
import { UnderscoreID } from "#lib/mongo";

interface ContentVariant<ID extends string | ObjectId = string> {
  contentPieceId: ID;
  variantId: ID;
  content?: Binary;
  id: ID;
}

const getContentVariantsCollection = (
  db: Db
): Collection<UnderscoreID<ContentVariant<ObjectId>>> => {
  return db.collection("content-variants");
};

export { getContentVariantsCollection };
export type { ContentVariant };
