import { db, fromObjectID, objectID } from "#backend/lib/mongo";
import { ObjectId } from "mongodb";
import { Static, t } from "elysia";

const workspaceSettingsType = t.Object({
  prettierConfig: t.String({ description: "JSON-stringified Prettier configuration" })
});
const workspaceType = t.Object({
  id: objectID({
    description: "ID of the workspace"
  }),
  name: t.String({
    description: "Name of the workspace",
    minLength: 1,
    maxLength: 50
  }),
  logo: t.Optional(
    t.String({
      description: "URL of the workspace logo"
    })
  ),
  customerID: t.Optional(
    t.String({
      description: "ID of the Stripe customer associated with the workspace"
    })
  ),
  subscriptionStatus: t.Optional(
    t.String({
      description: "Status of the workspace's subscription"
    })
  ),
  subscriptionPlan: t.Optional(
    t.String({
      description: "Identifier of the workspace's subscription plan"
    })
  ),
  subscriptionData: t.Optional(
    t.String({
      description: "JSON-stringified Stripe subscription data associated with the workspace"
    })
  ),
  subscriptionExpiresAt: t.Optional(
    t.String({
      description: "Expiration date of the current workspace's billing cycle",
      format: "date-time"
    })
  ),
  settings: workspaceSettingsType
});

interface WorkspaceSettings extends Static<typeof workspaceSettingsType> {}
interface Workspace<ID extends string | ObjectId = string>
  extends Omit<Static<typeof workspaceType>, "id"> {
  id: ID;
}
interface FullWorkspace<ID extends string | ObjectId = string> extends Workspace<ID> {}

const workspaceID = (id: ObjectId) => fromObjectID(id, "ws");
const workspacesDB = db.collection("workspaces");

export { workspaceType, workspacesDB, workspaceID };
export type { WorkspaceSettings, Workspace, FullWorkspace };
