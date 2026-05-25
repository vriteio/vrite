import { db, fromObjectID, objectID, UnderscoreID } from "#backend/lib/mongo";
import { Static, t } from "elysia";
import { ObjectId } from "mongodb";

// TODO: Adjust permissions
const tokenPermissionType = t.UnionEnum([
  "entries.read",
  "entries.write",
  "roles.read",
  "roles.write",
  "users.settings.read",
  "users.settings.write",
  "workspace.settings.read",
  "workspace.settings.write",
  "webhooks.read",
  "webhooks.write"
]);
const tokenType = t.Object({
  id: objectID({
    description: "The ID of the token"
  }),
  label: t.String({
    description: "The label for the token"
  }),
  permissions: t.Array(tokenPermissionType, {
    description: "The permissions of the token"
  })
});

interface Token<ID extends string | ObjectId = string>
  extends Omit<Static<typeof tokenType>, "id"> {
  id: ID;
}
interface FullToken<ID extends string | ObjectId = string> extends Token<ID> {
  workspaceID: ID;
}

const tokenID = (id: ObjectId) => fromObjectID(id, "an");
const tokensDB = db.collection<UnderscoreID<FullToken<ObjectId>>>("tokens");

await tokensDB.createIndex({ workspaceId: 1 });

export { tokenPermissionType, tokenType, tokensDB, tokenID };
export { Token, FullToken };
