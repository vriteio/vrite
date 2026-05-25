import { db, fromObjectID, objectID, UnderscoreID } from "#backend/lib/mongo";
import { ObjectId } from "mongodb";
import * as z from "zod";

const workspaceType = z.object({
  id: objectID().describe("ID of the workspace"),
  name: z.string().min(1).max(50).describe("Name of the workspace"),
  customerID: z
    .string()
    .optional()
    .describe("ID of the Stripe customer associated with the workspace"),
  subscriptionStatus: z.string().optional().describe("Status of the workspace's subscription"),
  subscriptionPlan: z
    .string()
    .optional()
    .describe("Identifier of the workspace's subscription plan"),
  subscriptionData: z
    .string()
    .optional()
    .describe("JSON-stringified Stripe subscription data associated with the workspace"),
  subscriptionExpiresAt: z.iso
    .datetime()
    .optional()
    .describe("Expiration date of the current workspace's billing cycle")
});

interface Workspace<ID extends string | ObjectId = string> extends Omit<
  z.infer<typeof workspaceType>,
  "id"
> {
  id: ID;
}
interface FullWorkspace<ID extends string | ObjectId = string> extends Workspace<ID> {}

const toWorkspaceID = (id: ObjectId) => fromObjectID(id, "ws");
const workspacesDB = db.collection<UnderscoreID<FullWorkspace<ObjectId>>>("workspaces");

export { workspaceType, workspacesDB, toWorkspaceID };
export type { Workspace, FullWorkspace };
