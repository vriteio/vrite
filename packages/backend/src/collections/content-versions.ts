import { Binary, Collection, Db, ObjectId } from "mongodb";
import { UnderscoreID } from "#lib/mongo";

interface ContentVersion<ID extends string | ObjectId = string> {
  contentPieceId: ID;
  versionId: ID;
  variantId?: ID;
  content: Binary;
  id: ID;
}

interface FullContentVersion<ID extends string | ObjectId = string> extends ContentVersion<ID> {
  expiresAt?: ID extends ObjectId ? Date : string;
}

const getContentVersionsCollection = (
  db: Db
): Collection<UnderscoreID<FullContentVersion<ObjectId>>> => {
  return db.collection("content-versions");
};

export { getContentVersionsCollection };
export type { ContentVersion, FullContentVersion };
