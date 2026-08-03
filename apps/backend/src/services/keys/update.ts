import { toUUID } from "#backend/lib/primitives";
import { db } from "#backend/lib/adapters";
import { apiKeys, type KeyPermission } from "#backend/db";
import { and, eq } from "drizzle-orm";

const updateKey = async (input: {
  id: string;
  workspaceID: string;
  name?: string;
  permissions?: KeyPermission[];
}): Promise<void> => {
  if (input.name === undefined && input.permissions === undefined) return;

  await db
    .update(apiKeys)
    .set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.permissions !== undefined && { permissions: input.permissions }),
      updatedAt: new Date()
    })
    .where(
      and(eq(apiKeys.id, toUUID(input.id)), eq(apiKeys.workspaceID, toUUID(input.workspaceID)))
    );
};

export { updateKey };
