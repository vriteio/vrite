import { entriesDB } from "#backend/db";
import { toObjectID } from "#backend/lib/mongo";
import { ORPCError } from "@orpc/server";

const moveEntry = async (input: {
  id: string;
  workspaceID: string;
  order: string;
  collectionID?: string | null;
}) => {
  const workspaceID = toObjectID(input.workspaceID);
  const entry = await entriesDB.findOne({
    _id: toObjectID(input.id),
    workspaceID
  });

  if (!entry) throw new ORPCError("NOT_FOUND");

  await entriesDB.updateOne(
    { _id: toObjectID(input.id) },
    {
      $set: {
        order: input.order,
        ...(input.collectionID && {
          collectionID: toObjectID(input.collectionID)
        })
      },
      ...(input.collectionID === null && { $unset: { collectionID: true } })
    }
  );
};

export { moveEntry };
