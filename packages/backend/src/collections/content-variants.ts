import { Binary, Collection, Db, ObjectId } from "mongodb";
import { UnderscoreID } from "#lib/mongo";

interface ContentVariant<ID extends string | ObjectId = string> {
  contentPieceId: ID;
  variantId: ID;
  content?: Binary;
  id: ID;
}

interface FullContentVariant<ID extends string | ObjectId = string> extends ContentVariant<ID> {}

const getContentVariantsCollection = (
  db: Db
): Collection<UnderscoreID<FullContentVariant<ObjectId>>> => {
  return db.collection("content-variants");
};

export { getContentVariantsCollection };
export type { ContentVariant, FullContentVariant };
