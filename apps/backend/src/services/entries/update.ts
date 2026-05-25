import { entriesDB, Entry } from "#backend/db";
import { toObjectID } from "#backend/lib/mongo";
import { ORPCError } from "@orpc/server";

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

  if (matchedCount !== 1) throw new ORPCError("NOT_FOUND");
};

export { updateEntry };
