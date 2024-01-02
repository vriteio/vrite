import { Db, ObjectId } from "mongodb";
import { FullContentPiece, FullContentPieceVariant, getVariantsCollection } from "#collections";
import { errors } from "#lib/errors";
import { UnderscoreID } from "#lib/mongo";

const getVariantDetails = async (
  db: Db,
  variantIdOrKey?: string
): Promise<{ variantId: ObjectId | null; variantKey: string | null }> => {
  const variantsCollection = getVariantsCollection(db);

  if (!variantIdOrKey) return { variantId: null, variantKey: null };

  const isId = ObjectId.isValid(variantIdOrKey);
  const variant = await variantsCollection.findOne({
    ...(isId && { _id: new ObjectId(variantIdOrKey) }),
    ...(!isId && { key: variantIdOrKey })
  });

  if (!variant) throw errors.notFound("variant");

  return { variantId: variant._id || null, variantKey: variant.key || null };
};
const mergeVariantData = (
  contentPiece: UnderscoreID<FullContentPiece<ObjectId>>,
  contentPieceVariant: UnderscoreID<FullContentPieceVariant<ObjectId>>
): UnderscoreID<FullContentPiece<ObjectId>> => {
  const { _id, contentPieceId, variantId, ...variantData } = contentPieceVariant;
  const mergedVariantData = Object.fromEntries(
    Object.keys(variantData).map((key) => {
      const typedKey = key as keyof Omit<
        UnderscoreID<FullContentPieceVariant<ObjectId>>,
        "_id" | "contentPieceId" | "variantId"
      >;

      return [typedKey, variantData[typedKey] || contentPiece[typedKey]];
    })
  );

  return { ...contentPiece, ...mergedVariantData };
};

export { getVariantDetails, mergeVariantData };
