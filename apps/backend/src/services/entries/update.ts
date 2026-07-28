import { updateDocumentTitle } from "#backend/collaboration";
import { entriesDB, Entry } from "#backend/db";
import { toUUID } from "#backend/lib/mongo";
import { ORPCError } from "@orpc/server";

const updateEntry = async (
  input: {
    id: string;
    workspaceID: string;
  } & Partial<Pick<Entry, "name">>
) => {
  const { id, workspaceID, ...setProperties } = input;
  const { matchedCount } = await entriesDB.updateOne(
    { _id: toUUID(input.id), workspaceID: toUUID(input.workspaceID) },
    { $set: setProperties }
  );

  if (typeof input.name === "string") {
    await updateDocumentTitle(input.id, input.name);
  }

  if (matchedCount !== 1) throw new ORPCError("NOT_FOUND");
};

export { updateEntry };
