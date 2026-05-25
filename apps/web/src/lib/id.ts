import { ObjectId } from "bson";
import { base62ToBytes, bytesToBase62, hexToBytes } from "./base-conversion";

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
const toEntryID = (id: ObjectId) => fromObjectID(id, "ent");
const toCollectionID = (id: ObjectId) => fromObjectID(id, "coll");

export { toObjectID, fromObjectID, toEntryID };
