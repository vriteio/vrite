import { Collection, Db, ObjectId } from "mongodb";
import { z } from "zod";
import { UnderscoreID, zodId } from "#lib/mongo";

// eslint-disable-next-line no-use-before-define
type ContextValue = string | number | boolean | ContextObject | ContextArray;

interface ContextObject {
  [x: string]: ContextValue;
}
interface ContextArray extends Array<ContextValue> {}

const contextValue: z.ZodType<ContextValue> = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.lazy(() => z.record(contextValue)),
  z.lazy(() => z.array(contextValue))
]);
const contextObject = z.record(contextValue);
const extension = z.object({
  id: zodId(),
  name: z.string(),
  url: z.string(),
  config: contextObject,
  token: z.string()
});

interface Extension<ID extends string | ObjectId = string>
  extends Omit<z.infer<typeof extension>, "id"> {
  id: ID;
}
interface FullExtension<ID extends string | ObjectId = string> extends Extension<ID> {
  workspaceId: ID;
}

const getExtensionsCollection = (db: Db): Collection<UnderscoreID<FullExtension<ObjectId>>> => {
  return db.collection("extensions");
};

export { contextValue, contextObject, extension, getExtensionsCollection };
export type { Extension, FullExtension, ContextObject, ContextArray, ContextValue };
