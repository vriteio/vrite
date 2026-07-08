import { contentsDB, entriesDB } from "#backend/db";
import { toUUID } from "#backend/lib/mongo";

const deleteEntries = async (input: { ids: string[]; workspaceID: string }): Promise<void> => {
  const ids = input.ids.map(toUUID);
  const workspaceID = toUUID(input.workspaceID);

  await entriesDB.deleteMany({ _id: { $in: ids }, workspaceID });
  await contentsDB.deleteMany({ entryID: { $in: ids }, workspaceID });
};

export { deleteEntries };
