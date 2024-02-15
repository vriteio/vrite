import { z } from "zod";
import { Collection, Db, ObjectId } from "mongodb";
import { UnderscoreID, zodId } from "#lib/mongo";

const workspace = z.object({
  id: zodId().describe("ID of the workspace"),
  name: z.string().min(1).max(50).describe("Name of the workspace"),
  description: z.string().optional().describe("Description of the workspace"),
  logo: z.string().optional().describe("URL of the workspace logo"),
  contentGroups: z.array(zodId()).describe("IDs of the top-level content groups in the workspace"),
  customerId: z
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
  subscriptionExpiresAt: z
    .string()
    .optional()
    .describe("Expiration date of the current workspace's billing cycle")
});

interface Workspace<ID extends string | ObjectId = string>
  extends Omit<z.infer<typeof workspace>, "id" | "contentGroups"> {
  id: ID;
  contentGroups: ID[];
}

interface FullWorkspace<ID extends string | ObjectId = string> extends Workspace<ID> {}

const getWorkspacesCollection = (db: Db): Collection<UnderscoreID<FullWorkspace<ObjectId>>> => {
  return db.collection("workspaces");
};

export { workspace, getWorkspacesCollection };
export type { Workspace, FullWorkspace };
