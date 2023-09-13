import { Collection, Db, ObjectId } from "mongodb";
import { z } from "zod";
import { UnderscoreID, zodId } from "#lib/mongo";

const transformer = z.object({
  id: zodId(),
  label: z.string().min(1).max(50),
  input: z.string().url(),
  output: z.string().url(),
  maxBatchSize: z.number().min(1).max(1000)
});

interface Transformer<ID extends string | ObjectId = string>
  extends Omit<z.infer<typeof transformer>, "id"> {
  id: ID;
}
interface FullTransformer<ID extends string | ObjectId = string> extends Transformer<ID> {
  workspaceId: ID;
}

const getTransformersCollection = (db: Db): Collection<UnderscoreID<FullTransformer<ObjectId>>> => {
  return db.collection("transformers");
};

export { transformer, getTransformersCollection };
export type { Transformer };
