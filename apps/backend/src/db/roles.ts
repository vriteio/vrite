import { db, fromObjectID, objectID, UnderscoreID } from "#backend/lib/mongo";
import { ObjectId } from "mongodb";
import * as z from "zod";

const permissionType = z.enum([
  "content",
  "api_keys",
  "read:api_keys",
  "billing",
  "read:billing",
  "workspace"
]);
const baseRoleType = z.enum(["admin", "viewer"]);
const roleType = z.object({
  id: objectID().describe("ID of the role"),
  name: z.string().min(1).max(50).describe("Name of the role"),
  permissions: z.array(permissionType).describe("Permissions granted to the role"),
  baseRole: baseRoleType.optional().describe("If this role is an unremovable base role")
});

type Permission = z.infer<typeof permissionType>;
type BaseRole = z.infer<typeof baseRoleType>;

interface Role<ID extends string | ObjectId = string> extends Omit<z.infer<typeof roleType>, "id"> {
  id: ID;
}
interface FullRole<ID extends string | ObjectId = string> extends Role<ID> {
  workspaceID: ID;
}

const toRoleID = (id: ObjectId) => fromObjectID(id, "rl");
const rolesDB = db.collection<UnderscoreID<FullRole<ObjectId>>>("roles");

await rolesDB.createIndex({ workspaceID: 1 }, { name: "workspaceID_1" });

export { permissionType, baseRoleType, roleType, rolesDB, toRoleID };
export type { Permission, BaseRole, Role, FullRole };
