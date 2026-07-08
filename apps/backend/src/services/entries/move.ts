import { entriesDB } from "#backend/db";
import { toUUID } from "#backend/lib/mongo";
import { ORPCError } from "@orpc/server";

const moveEntry = async (input: {
  id: string;
  workspaceID: string;
  order: string;
  collectionID?: string | null;
}) => {
  const workspaceID = toUUID(input.workspaceID);
  const entry = await entriesDB.findOne({
    _id: toUUID(input.id),
    workspaceID
  });

  if (!entry) throw new ORPCError("NOT_FOUND");

  await entriesDB.updateOne(
    { _id: toUUID(input.id) },
    {
      $set: {
        order: input.order,
        ...(input.collectionID && {
          collectionID: toUUID(input.collectionID)
        })
      },
      ...(input.collectionID === null && { $unset: { collectionID: true } })
    }
  );
};

export { moveEntry };
