import { db, fromUUID, id, UnderscoreID } from "#backend/lib/mongo";
import type { UUID } from "#backend/lib/mongo";
import * as z from "zod";

const workspaceType = z.object({
  id: id().describe("ID of the workspace"),
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

interface Workspace<ID extends string | UUID = string> extends Omit<
  z.infer<typeof workspaceType>,
  "id"
> {
  id: ID;
}
interface FullWorkspace<ID extends string | UUID = string> extends Workspace<ID> {}

const toWorkspaceID = (id: UUID) => fromUUID(id, "ws");
const workspacesDB = db.collection<UnderscoreID<FullWorkspace<UUID>>>("workspaces");

export { workspaceType, workspacesDB, toWorkspaceID };
export type { Workspace, FullWorkspace };
