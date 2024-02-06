import { Db, ObjectId } from "mongodb";
import { getVariantsCollection } from "#collections";
import { errors } from "#lib/errors";

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

export { getVariantDetails };
