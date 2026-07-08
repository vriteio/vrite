import { keysDB } from "#backend/db";
import { toUUID } from "#backend/lib/mongo";
import { Auth } from "#backend/services/auth";

const deleteKeys = async (input: { ids: string[]; workspaceID: string }): Promise<void> => {
  const ids = input.ids.map(toUUID);
  const workspaceID = toUUID(input.workspaceID);

  await keysDB.deleteMany({ _id: { $in: ids }, workspaceID });
  await Promise.all(input.ids.map((id) => Auth.invalidateSessionData({ keyID: id })));
};

export { deleteKeys };
