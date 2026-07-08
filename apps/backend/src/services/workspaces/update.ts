import { workspacesDB } from "#backend/db";
import { toUUID } from "#backend/lib/mongo";
import { ORPCError } from "@orpc/server";

const updateWorkspace = async (input: { workspaceID: string; name?: string; logo?: string }) => {
  const updates: Record<string, any> = {};

  if (input.name !== undefined) updates.name = input.name;
  if (input.logo !== undefined) updates.logo = input.logo;

  if (Object.keys(updates).length === 0) return;

  const result = await workspacesDB.updateOne(
    { _id: toUUID(input.workspaceID) },
    { $set: updates }
  );

  if (result.matchedCount === 0) {
    throw new ORPCError("NOT_FOUND", { message: "Workspace not found" });
  }
};

export { updateWorkspace };
