import { z } from "zod";
import { Collection, Db, ObjectId } from "mongodb";
import { UnderscoreID, zodId } from "#lib/mongo";

const workspace = z.object({
  id: zodId().describe("ID of the workspace"),
  name: z.string().describe("Name of the workspace").min(1).max(50),
  description: z.string().describe("Description of the workspace").optional(),
  logo: z.string().describe("URL of the workspace logo").optional(),
  contentGroups: z.array(zodId()).describe("IDs of the top-level content groups in the workspace"),
  customerId: z
    .string()
    .describe("ID of the Stripe customer associated with the workspace")
    .optional(),
  subscriptionStatus: z.string().describe("Status of the workspace's subscription").optional(),
  subscriptionPlan: z
    .string()
    .describe("Identifier of the workspace's subscription plan")
    .optional(),
  subscriptionData: z
    .string()
    .describe("JSON-stringified Stripe subscription data associated with the workspace")
    .optional(),
  subscriptionExpiresAt: z
    .string()
    .describe("Expiration date of the current workspace's billing cycle")
    .optional()
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
