import { toUUID } from "#backend/lib/id";
import { db } from "#backend/lib/postgres";
import { workspaces } from "#backend/db";
import { eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";

const updateWorkspace = async (input: { workspaceID: string; name?: string; logo?: string }) => {
  if (input.name === undefined) return;

  const [updated] = await db
    .update(workspaces)
    .set({ name: input.name, updatedAt: new Date() })
    .where(eq(workspaces.id, toUUID(input.workspaceID)))
    .returning({ id: workspaces.id });

  if (!updated) throw new ORPCError("NOT_FOUND", { message: "Workspace not found" });
};

export { updateWorkspace };
