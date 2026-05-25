import { db, fromObjectID, objectID, UnderscoreID } from "#backend/lib/mongo";
import { ObjectId } from "mongodb";
import { Static, t } from "elysia";

// TODO: Roles, groups, collaborators, etc.
const permissionType = t.UnionEnum([""]);
const roleType = t.Object({
  id: objectID({ description: "ID of the role" }),
  name: t.String({ description: "Name of the role", minLength: 1, maxLength: 50 }),
  permissions: t.Array(permissionType, { description: "Permissions granted to the role" })
});

interface Role<ID extends string | ObjectId = string> extends Omit<Static<typeof roleType>, "id"> {
  id: ID;
}
interface FullRole<ID extends string | ObjectId = string> extends Role<ID> {
  workspaceID: ID;
}

const roleID = (id: ObjectId) => fromObjectID(id, "rl");
const rolesDB = db.collection<UnderscoreID<FullRole<ObjectId>>>("roles");

await rolesDB.createIndex({ workspaceId: 1 });

export { permissionType, roleType, rolesDB, roleID };
export { Role, FullRole };
