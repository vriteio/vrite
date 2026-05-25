import { keysDB } from "#backend/db";
import { toObjectID } from "#backend/lib/mongo";
import { Auth } from "#backend/services/auth";

const deleteKeys = async (input: { ids: string[]; workspaceID: string }): Promise<void> => {
  const ids = input.ids.map(toObjectID);
  const workspaceID = toObjectID(input.workspaceID);

  await keysDB.deleteMany({ _id: { $in: ids }, workspaceID });
  await Promise.all(input.ids.map((id) => Auth.invalidateSessionData({ keyID: id })));
};

export { deleteKeys };
