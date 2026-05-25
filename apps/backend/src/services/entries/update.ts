import { entriesDB, Entry } from "#backend/db";
import { toObjectID } from "#backend/lib/mongo";
import { status } from "elysia";

const updateEntry = async (
  input: {
    id: string;
    workspaceID: string;
  } & Partial<Pick<Entry, "name">>
) => {
  const { id, workspaceID, ...setProperties } = input;
  const { matchedCount } = await entriesDB.updateOne(
    { _id: toObjectID(input.id), workspaceID: toObjectID(input.workspaceID) },
    { $set: setProperties }
  );

  if (matchedCount !== 1) throw status("Not Found");
};

export { updateEntry };
