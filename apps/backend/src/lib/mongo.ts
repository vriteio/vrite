import { config } from "#backend/lib/config";
import { base62ToBytes, bytesToBase62 } from "#backend/lib/utils";
import { MongoClient, UUID } from "mongodb";
import * as z from "zod";

type UnderscoreID<T extends Record<string, any>> = Omit<T, "id"> & { _id: T["id"] };

const UUID_REGEX = /^[a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i;
const ID_REGEX = /^(?:\w+?_[A-Za-z\d]{1,22})$/;

const id = (options?: Exclude<Parameters<typeof z.regex>[1], string>) => {
  return z.string().regex(ID_REGEX, { error: "invalid id", ...options });
};
const mongoClient = new MongoClient(config.MONGO_URL);
const db = mongoClient.db("data");

const generateUUID = (): UUID => new UUID();

const toUUID = (id: string | UUID): UUID => {
  if (id instanceof UUID) return id;
  if (UUID_REGEX.test(id)) return new UUID(id);

  const bytes = base62ToBytes(id.split("_").pop() || "");
  if (bytes.length > 16) throw new Error("Invalid ID");

  const uuidBytes = new Uint8Array(16);
  uuidBytes.set(bytes, 16 - bytes.length);

  return new UUID(uuidBytes);
};
const fromUUID = (uuid: UUID, prefix?: string): string => {
  return `${prefix || ""}${prefix ? "_" : ""}${bytesToBase62(uuid.id)}`;
};

await mongoClient.connect();

export { db, mongoClient, id, generateUUID, toUUID, fromUUID };
export type { UnderscoreID, UUID };
