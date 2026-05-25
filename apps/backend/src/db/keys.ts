import { db, fromObjectID, objectID, UnderscoreID } from "#backend/lib/mongo";
import { ObjectId } from "mongodb";
import * as z from "zod";

const keyPermissionType = z.enum([
  "entries",
  "read:entries",
  "collections",
  "read:collections",
  "memberships",
  "read:memberships",
  "roles",
  "read:roles"
]);
const keyType = z.object({
  id: objectID().describe("The ID of the API key"),
  name: z.string().describe("The name for the API key"),
  permissions: z.array(keyPermissionType).describe("The permissions of the API key"),
  prefix: z.string().describe("The first 8 characters of the raw key (for display)"),
  memberID: objectID().describe("The ID of the workspace member who created the API key"),
  createdAt: z.iso.datetime().describe("The creation date of the API key"),
  updatedAt: z.iso.datetime().describe("The date of the last update of the API key"),
  expiresAt: z.iso.datetime().nullable().describe("The expiration date of the API key")
});

type KeyPermission = z.infer<typeof keyPermissionType>;

interface Key<ID extends string | ObjectId = string> extends Omit<
  z.infer<typeof keyType>,
  "id" | "memberID" | "createdAt" | "updatedAt" | "expiresAt"
> {
  id: ID;
  memberID: ID;
  createdAt: ID extends string ? string : Date;
  updatedAt: ID extends string ? string : Date;
  expiresAt: ID extends string ? string | null : Date | null;
}
interface FullKey<ID extends string | ObjectId = string> extends Key<ID> {
  workspaceID: ID;
  hash: string;
  salt: string;
}

const toKeyID = (id: ObjectId) => fromObjectID(id, "sk");
const keysDB = db.collection<UnderscoreID<FullKey<ObjectId>>>("keys");

await keysDB.createIndex({ workspaceID: 1 }, { name: "workspaceID_1" });
await keysDB.createIndex({ prefix: 1 }, { name: "prefix_1" });
await keysDB.createIndex({ memberID: 1 }, { name: "memberID_1" });
await keysDB.createIndex({ expiresAt: 1 }, { name: "expiresAt_1", expireAfterSeconds: 0 });

export { keyPermissionType, keyType, keysDB, toKeyID };
export type { KeyPermission, Key, FullKey };
