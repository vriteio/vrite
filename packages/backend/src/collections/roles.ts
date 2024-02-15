import { Db, Collection, ObjectId } from "mongodb";
import { z } from "zod";
import { UnderscoreID, zodId } from "#lib/mongo";

const permission = z.enum([
  "editContent",
  "editMetadata",
  "manageDashboard",
  "manageTokens",
  "manageWebhooks",
  "manageWorkspace",
  "manageExtensions",
  "manageVariants",
  "manageGit",
  "manageBilling"
]);
const role = z.object({
  id: zodId().describe("ID of the role"),
  name: z.string().min(1).max(20).describe("Name of the role"),
  description: z.string().optional().describe("Description of the role"),
  permissions: z.array(permission).describe("Permissions assigned to the role")
});
const baseRoleType = z.enum(["viewer", "admin"]);

type Permission = z.infer<typeof permission>;
type BaseRoleType = z.infer<typeof baseRoleType>;

interface Role<ID extends string | ObjectId = string> extends Omit<z.infer<typeof role>, "id"> {
  id: ID;
}
interface FullRole<ID extends string | ObjectId = string> extends Role<ID> {
  workspaceId: ID;
  baseType?: BaseRoleType;
}

type ExtendedRole<
  K extends keyof Omit<FullRole, keyof Role> | undefined = undefined,
  ID extends string | ObjectId = string
> = Role<ID> & Pick<FullRole<ID>, Exclude<K, undefined>>;

const getRolesCollection = (db: Db): Collection<UnderscoreID<FullRole<ObjectId>>> => {
  return db.collection("roles");
};

export { permission, role, baseRoleType, getRolesCollection };
export type { Permission, Role, FullRole, BaseRoleType, ExtendedRole };
