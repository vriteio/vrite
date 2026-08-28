import { toUUID } from "#backend/lib/primitives";
import { db } from "#backend/lib/adapters";
import { apiKeys } from "#backend/db";
import { withAuthorization } from "#backend/lib/policy";
import { and, eq, inArray } from "drizzle-orm";

interface DeleteKeysInput {
  ids: string[];
}

const deleteKeysOperation = async (
  input: DeleteKeysInput & { workspaceID: string }
): Promise<void> => {
  if (input.ids.length === 0) return;

  await db
    .delete(apiKeys)
    .where(
      and(
        inArray(apiKeys.id, input.ids.map(toUUID)),
        eq(apiKeys.workspaceID, toUUID(input.workspaceID))
      )
    );
};
const deleteKeys = withAuthorization<DeleteKeysInput>(
  { permissions: { session: ["api_keys"] } },
  async ({ input, workspaceID }) => deleteKeysOperation({ ...input, workspaceID })
);

export { deleteKeys };
