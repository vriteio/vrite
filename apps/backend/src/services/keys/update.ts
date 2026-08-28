import { toUUID } from "#backend/lib/primitives";
import { db } from "#backend/lib/adapters";
import { apiKeys, type KeyPermission } from "#backend/db";
import { withAuthorization } from "#backend/lib/policy";
import { and, eq } from "drizzle-orm";

interface UpdateKeyInput {
  id: string;
  name?: string;
  permissions?: KeyPermission[];
}

const updateKeyOperation = async (
  input: UpdateKeyInput & { workspaceID: string }
): Promise<void> => {
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
const updateKey = withAuthorization<UpdateKeyInput>(
  { permissions: { session: ["api_keys"] } },
  async ({ input, workspaceID }) => updateKeyOperation({ ...input, workspaceID })
);

export { updateKey };
