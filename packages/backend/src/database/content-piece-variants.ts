import { Tag } from "./tags";
import { ContentPiece, ContentPieceMember, contentPiece } from "./content-pieces";
import { Collection, Db, ObjectId } from "mongodb";
import { z } from "zod";
import { UnderscoreID, zodId } from "#lib/mongo";

const contentPieceVariant = contentPiece
  .omit({ contentGroupId: true })
  .partial()
  .required({ id: true })
  .merge(z.object({ variantId: zodId(), contentPieceId: zodId() }));

interface ContentPieceVariant<ID extends string | ObjectId = string>
  extends Partial<Omit<ContentPiece<ID>, "contentGroupId" | "contentPieceId">> {
  variantId: ID;
  contentPieceId: ID;
}
interface ContentPieceVariantWithAdditionalData<ID extends string | ObjectId = string>
  extends Omit<ContentPieceVariant<ID>, "tags" | "members"> {
  tags?: Array<Tag<ID>>;
  members?: Array<ContentPieceMember<ID>>;
}
interface FullContentPieceVariant<ID extends string | ObjectId = string>
  extends ContentPieceVariant<ID> {
  coverWidth?: string;
}
interface FullContentPieceVariantWithAdditionalData<ID extends string | ObjectId = string>
  extends Omit<FullContentPieceVariant<ID>, "tags" | "members"> {
  tags?: Array<Tag<ID>>;
  members?: Array<ContentPieceMember<ID>>;
}

type ExtendedContentPieceVariant<
  K extends keyof Omit<FullContentPieceVariant, keyof ContentPieceVariant> | undefined = undefined,
  ID extends string | ObjectId = string
> = ContentPieceVariant<ID> & Pick<FullContentPieceVariant<ID>, Exclude<K, undefined>>;

type ExtendedContentPieceVariantWithAdditionalData<
  K extends keyof Omit<FullContentPieceVariant, keyof ContentPiece> | undefined = undefined,
  ID extends string | ObjectId = string
> = ContentPieceVariantWithAdditionalData<ID> &
  Pick<FullContentPieceVariantWithAdditionalData<ID>, Exclude<K, undefined>>;

const getContentPieceVariantsCollection = (
  db: Db
): Collection<UnderscoreID<FullContentPieceVariant<ObjectId>>> => {
  return db.collection("content-piece-variants");
};

export { contentPieceVariant, getContentPieceVariantsCollection };
export type {
  ContentPieceVariant,
  ContentPieceVariantWithAdditionalData,
  FullContentPieceVariant,
  FullContentPieceVariantWithAdditionalData,
  ExtendedContentPieceVariant,
  ExtendedContentPieceVariantWithAdditionalData
};
