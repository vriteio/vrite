import { contentsDB, entriesDB } from "#backend/db";
import { toObjectID } from "#backend/lib/mongo";

const deleteEntries = async (input: { ids: string[]; workspaceID: string }): Promise<void> => {
  const ids = input.ids.map(toObjectID);
  const workspaceID = toObjectID(input.workspaceID);

  await entriesDB.deleteMany({ _id: { $in: ids }, workspaceID });
  await contentsDB.deleteMany({ entryID: { $in: ids }, workspaceID });
};

export { deleteEntries };
