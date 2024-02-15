import { Collection, Db, ObjectId } from "mongodb";
import { z } from "zod";
import { UnderscoreID, zodId } from "#lib/mongo";

const transformer = z.object({
  id: zodId().describe("ID of the transformer"),
  label: z.string().min(1).max(50).describe("Label assigned to the transformer"),
  input: z.string().url().describe("URL of the input transformer"),
  output: z.string().url().describe("URL of the output transformer"),
  maxBatchSize: z.number().min(1).max(1000).describe("Maximum batch size for the transformer")
});

interface Transformer<ID extends string | ObjectId = string>
  extends Omit<z.infer<typeof transformer>, "id"> {
  id: ID;
}
interface FullTransformer<ID extends string | ObjectId = string> extends Transformer<ID> {
  workspaceId: ID;
  extensionId?: ID;
}

const getTransformersCollection = (db: Db): Collection<UnderscoreID<FullTransformer<ObjectId>>> => {
  return db.collection("transformers");
};

export { transformer, getTransformersCollection };
export type { Transformer };
