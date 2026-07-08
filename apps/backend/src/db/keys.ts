import { db, fromUUID, id, UnderscoreID } from "#backend/lib/mongo";
import type { UUID } from "#backend/lib/mongo";
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
  id: id().describe("The ID of the API key"),
  name: z.string().describe("The name for the API key"),
  permissions: z.array(keyPermissionType).describe("The permissions of the API key"),
  prefix: z.string().describe("The first 8 characters of the raw key (for display)"),
  memberID: id().describe("The ID of the workspace member who created the API key"),
  createdAt: z.iso.datetime().describe("The creation date of the API key"),
  updatedAt: z.iso.datetime().describe("The date of the last update of the API key"),
  expiresAt: z.iso.datetime().nullable().describe("The expiration date of the API key")
});

type KeyPermission = z.infer<typeof keyPermissionType>;

interface Key<ID extends string | UUID = string> extends Omit<
  z.infer<typeof keyType>,
  "id" | "memberID" | "createdAt" | "updatedAt" | "expiresAt"
> {
  id: ID;
  memberID: ID;
  createdAt: ID extends UUID ? Date : string;
  updatedAt: ID extends UUID ? Date : string;
  expiresAt: ID extends UUID ? Date | null : string | null;
}
interface FullKey<ID extends string | UUID = string> extends Key<ID> {
  workspaceID: ID;
  hash: string;
  salt: string;
}

const toKeyID = (id: UUID) => fromUUID(id, "sk");
const keysDB = db.collection<UnderscoreID<FullKey<UUID>>>("keys");

await keysDB.createIndex({ workspaceID: 1 }, { name: "workspaceID_1" });
await keysDB.createIndex({ prefix: 1 }, { name: "prefix_1" });
await keysDB.createIndex({ memberID: 1 }, { name: "memberID_1" });
await keysDB.createIndex({ expiresAt: 1 }, { name: "expiresAt_1", expireAfterSeconds: 0 });

export { keyPermissionType, keyType, keysDB, toKeyID };
export type { KeyPermission, Key, FullKey };
