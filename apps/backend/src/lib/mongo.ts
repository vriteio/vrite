import { config } from "#backend/lib/config";
import { base62ToBytes, bytesToBase62, hexToBytes } from "#backend/lib/utils";
import { MongoClient, ObjectId } from "mongodb";
import { t } from "elysia";

type UnderscoreID<T extends Record<string, any>> = Omit<T, "id"> & { _id: T["id"] };

const objectID = (options?: Parameters<typeof t.RegExp>[1]) => {
  return t.RegExp(/^(?:[a-f\d]{24})|(?:\w+?_[A-Za-z\d]{16})$/, { error: "invalid id", ...options });
};
const mongoClient = new MongoClient(config.MONGO_URL);
const db = mongoClient.db("data");

const toObjectID = (id: string | ObjectId): ObjectId => {
  if (typeof id !== "string") return id;

  const bytes = base62ToBytes(id.split("_").pop() || "");

  return new ObjectId(bytes);
};
const fromObjectID = (id: ObjectId, prefix?: string): string => {
  const bytes = hexToBytes(`${id}`);

  return `${prefix || ""}${prefix ? "_" : ""}${bytesToBase62(bytes)}`;
};

await mongoClient.connect();

export { db, objectID, toObjectID, fromObjectID };
export type { UnderscoreID };
