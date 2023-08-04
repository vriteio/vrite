import { ContentPiece, contentPiece } from "./content-pieces";
import { ContentPieceVariant, contentPieceVariant } from "./content-piece-variants";
import { Binary, Collection, Db, ObjectId } from "mongodb";
import { z } from "zod";
import { UnderscoreID, zodId } from "#lib/mongo";

const version = z.object({
  id: zodId(),
  name: z.string(),
  date: z.string(),
  content: z.any().optional(),
  contentPiece: contentPieceVariant.omit({ variantId: true, contentPieceId: true, id: true }),
  contentPieceId: zodId(),
  variantId: zodId().optional()
});

interface Version<ID extends string | ObjectId = string>
  extends Omit<
    z.infer<typeof version>,
    "id" | "date" | "contentPieceId" | "variantId" | "content" | "contentPiece"
  > {
  date: ID extends string ? string : Date;
  content?: Binary;
  contentPiece: Omit<ContentPieceVariant<ID>, "id" | "variantId" | "contentPieceId">;
  contentPieceId: ID;
  variantId?: ID;
  id: ID;
}
interface FullVersion<ID extends string | ObjectId = string> extends Version<ID> {
  workspaceId: ID;
}

const getVersionsCollection = (db: Db): Collection<UnderscoreID<FullVersion<ObjectId>>> => {
  return db.collection("contents");
};

export { getVersionsCollection, version };
export type { Version, FullVersion };
