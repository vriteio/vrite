import { collectionsDB } from "#backend/db";
import { toObjectID } from "#backend/lib/mongo";

const deleteCollections = async (input: { ids: string[]; workspaceID: string }): Promise<void> => {
  const ids = input.ids.map(toObjectID);
  const workspaceID = toObjectID(input.workspaceID);

  await collectionsDB.deleteMany({ _id: { $in: ids }, workspaceID });
};

export { deleteCollections };
