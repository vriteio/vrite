import { workspaces } from "#backend/db";
import { db } from "#backend/lib/adapters";
import { toUUID } from "#backend/lib/primitives";
import { and, eq } from "drizzle-orm";

const cancelWorkspaceDeletion = async (input: {
  deletingAt: Date;
  workspaceID: string;
}): Promise<void> => {
  await db
    .update(workspaces)
    .set({ deletingAt: null, updatedAt: new Date() })
    .where(
      and(eq(workspaces.id, toUUID(input.workspaceID)), eq(workspaces.deletingAt, input.deletingAt))
    );
};

export { cancelWorkspaceDeletion };
