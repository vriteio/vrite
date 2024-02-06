import { Collection, Db, ObjectId } from "mongodb";
import { z } from "zod";
import { UnderscoreID, zodId } from "#lib/mongo";

const variant = z.object({
  id: zodId(),
  label: z.string().min(1).max(50),
  description: z.string().optional(),
  key: z.string().min(1).max(50)
});

interface Variant<ID extends string | ObjectId = string>
  extends Omit<z.infer<typeof variant>, "id"> {
  id: ID;
}
interface FullVariant<ID extends string | ObjectId = string> extends Variant<ID> {
  workspaceId: ID;
}

const getVariantsCollection = (db: Db): Collection<UnderscoreID<FullVariant<ObjectId>>> => {
  return db.collection("variants");
};

export { variant, getVariantsCollection };
export type { Variant, FullVariant };
