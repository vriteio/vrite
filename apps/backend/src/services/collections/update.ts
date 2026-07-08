import { Collection, collectionsDB } from "#backend/db";
import { toUUID } from "#backend/lib/mongo";
import { ORPCError } from "@orpc/server";
import { ROOT_COLLECTION_NAME } from "./root";

const updateCollection = async (
  input: {
    id: string;
    workspaceID: string;
  } & Partial<Pick<Collection, "name">>
) => {
  const { id, workspaceID, ...setProperties } = input;
  const collection = await collectionsDB.findOne({
    _id: toUUID(input.id),
    workspaceID: toUUID(input.workspaceID)
  });

  if (!collection) throw new ORPCError("NOT_FOUND");
  if (collection.name === ROOT_COLLECTION_NAME || input.name === ROOT_COLLECTION_NAME) {
    throw new ORPCError("BAD_REQUEST", { message: "Reserved collection name" });
  }

  const { matchedCount } = await collectionsDB.updateOne(
    { _id: toUUID(input.id), workspaceID: toUUID(input.workspaceID) },
    { $set: setProperties }
  );

  if (matchedCount !== 1) throw new ORPCError("NOT_FOUND");
};

export { updateCollection };
