import { config } from "#backend/lib/config";
import { base62ToBytes, bytesToBase62, hexToBytes } from "#backend/lib/utils";
import { MongoClient, ObjectId } from "mongodb";
import * as z from "zod";

type UnderscoreID<T extends Record<string, any>> = Omit<T, "id"> & { _id: T["id"] };

const objectID = (options?: Exclude<Parameters<typeof z.regex>[1], string>) => {
  return z
    .string()
    .regex(/^(?:[a-f\d]{24})|(?:\w+?_[A-Za-z\d]{16})$/, { error: "invalid id", ...options });
};
const mongoClient = new MongoClient(config.MONGO_URL);
const db = mongoClient.db("data");

const toObjectID = (id: string | ObjectId): ObjectId => {
  if (typeof id !== "string") return id;

  // Handle raw hex ObjectId strings (e.g. from better-auth)
  if (/^[a-f\d]{24}$/.test(id)) return new ObjectId(id);

  const bytes = base62ToBytes(id.split("_").pop() || "");

  return new ObjectId(bytes);
};
const fromObjectID = (id: ObjectId, prefix?: string): string => {
  const bytes = hexToBytes(`${id}`);

  return `${prefix || ""}${prefix ? "_" : ""}${bytesToBase62(bytes)}`;
};

await mongoClient.connect();

export { db, mongoClient, objectID, toObjectID, fromObjectID };
export type { UnderscoreID };
