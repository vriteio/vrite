import { db, fromObjectID, objectID, UnderscoreID } from "#backend/lib/mongo";
import { Static, t } from "elysia";
import { ObjectId } from "mongodb";

const membershipType = t.Object({
  id: objectID({ description: "ID of the membership" }),
  userID: objectID({ description: "ID of the user" }),

  roleID: t.Optional(objectID({ description: "ID of the role" })),
  admin: t.Optional(t.Boolean({ description: "Whether the member is an admin" }))
});

interface Membership<ID extends string | ObjectId = string>
  extends Omit<Static<typeof membershipType>, "id" | "userID" | "workspaceID" | "roleID"> {
  id: ID;
  userID: ID;
  roleID?: ID;
}
interface FullMembership<ID extends string | ObjectId = string> extends Membership<ID> {
  workspaceID: ID;
}

const membershipID = (id: ObjectId) => fromObjectID(id, "ms");
const membershipDB = db.collection<UnderscoreID<FullMembership<ObjectId>>>("memberships");

await membershipDB.createIndex({ userID: 1, workspaceID: 1 });
await membershipDB.createIndex({ userID: 1 });
await membershipDB.createIndex({ workspaceID: 1 });
await membershipDB.createIndex({ roleID: 1 });

export { membershipType, membershipDB, membershipID };
export type { Membership };
