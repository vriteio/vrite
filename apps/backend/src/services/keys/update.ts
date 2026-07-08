import { keysDB } from "#backend/db";
import { toUUID } from "#backend/lib/mongo";
import type { z } from "zod";
import type { keyPermissionType } from "#backend/db";
import { Auth } from "#backend/services/auth";

const updateKey = async (input: {
  id: string;
  workspaceID: string;
  name?: string;
  permissions?: z.infer<typeof keyPermissionType>[];
}): Promise<void> => {
  const update: Record<string, any> = {};

  if (input.name !== undefined) update.name = input.name;
  if (input.permissions !== undefined) update.permissions = input.permissions;

  if (Object.keys(update).length === 0) return;

  await keysDB.updateOne(
    { _id: toUUID(input.id), workspaceID: toUUID(input.workspaceID) },
    { $set: update }
  );

  if (input.permissions !== undefined) {
    await Auth.invalidateSessionData({ keyID: input.id });
  }
};

export { updateKey };
