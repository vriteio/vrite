import { Collection, collectionsDB } from "#backend/db";
import { toObjectID } from "#backend/lib/mongo";
import { ORPCError } from "@orpc/server";

const updateCollection = async (
  input: {
    id: string;
    workspaceID: string;
  } & Partial<Pick<Collection, "name">>
) => {
  const { id, workspaceID, ...setProperties } = input;
  const { matchedCount } = await collectionsDB.updateOne(
    { _id: toObjectID(input.id), workspaceID: toObjectID(input.workspaceID) },
    { $set: setProperties }
  );

  if (matchedCount !== 1) throw new ORPCError("NOT_FOUND");
};

export { updateCollection };
