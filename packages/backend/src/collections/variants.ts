import { Collection, Db, ObjectId } from "mongodb";
import { z } from "zod";
import { UnderscoreID, zodId } from "#lib/mongo";

const variant = z.object({
  id: zodId().describe("ID of the variant"),
  label: z.string().min(1).max(50).describe("Label assigned to the variant"),
  description: z.string().optional().describe("Description of the variant"),
  key: z
    .string()
    .min(1)
    .max(50)
    .describe("Short, unique key for the variant (for use with the API)")
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
