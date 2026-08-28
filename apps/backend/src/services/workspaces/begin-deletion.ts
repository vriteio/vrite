import { workspaces } from "#backend/db";
import { db } from "#backend/lib/adapters";
import { withAuthorization } from "#backend/lib/policy";
import { toUUID } from "#backend/lib/primitives";
import { ORPCError } from "@orpc/server";
import { and, eq, sql } from "drizzle-orm";

const beginWorkspaceDeletionOperation = async (input: {
  workspaceID: string;
}): Promise<{ deletingAt: Date }> => {
  const workspaceID = toUUID(input.workspaceID);
  const deletingAt = new Date();

  await db.transaction(async (tx) => {
    const [workspace] = await tx
      .select({ deletingAt: workspaces.deletingAt })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceID))
      .for("update");

    if (!workspace) throw new ORPCError("NOT_FOUND", { message: "Workspace not found" });

    if (workspace.deletingAt) {
      throw new ORPCError("CONFLICT", { message: "Workspace deletion is already in progress" });
    }

    await tx
      .update(workspaces)
      .set({ deletingAt, updatedAt: new Date() })
      .where(and(eq(workspaces.id, workspaceID), sql`${workspaces.deletingAt} is null`));
  });

  return { deletingAt };
};
const beginWorkspaceDeletion = withAuthorization<
  Record<never, never>,
  undefined,
  { deletingAt: Date }
>({ permissions: { session: true } }, async ({ auth, workspaceID }) => {
  // Workspace deletion is a special case that only admins can perform.
  if (!auth.session?.admin) throw new ORPCError("FORBIDDEN");

  return beginWorkspaceDeletionOperation({ workspaceID });
});

export { beginWorkspaceDeletion };
