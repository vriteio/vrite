import { z } from "zod";
import { ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import { getContentPiecesCollection, getTagsCollection } from "#collections";
import { zodId } from "#lib/mongo";
import { errors } from "#lib/errors";
import { publishTagEvent } from "#events";

const inputSchema = z.object({ id: zodId() });
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<void> => {
  const tagsCollection = getTagsCollection(ctx.db);
  const contentPiecesCollection = getContentPiecesCollection(ctx.db);
  const tagId = new ObjectId(input.id);
  const { deletedCount } = await tagsCollection.deleteOne({
    workspaceId: ctx.auth.workspaceId,
    _id: tagId
  });

  if (!deletedCount) throw errors.notFound("tag");

  await contentPiecesCollection.updateMany(
    {
      workspaceId: ctx.auth.workspaceId,
      tags: tagId
    },
    {
      $pull: {
        tags: tagId
      }
    }
  );
  publishTagEvent(ctx, `${ctx.auth.workspaceId}`, {
    action: "delete",
    data: { id: input.id }
  });
};

export { inputSchema, handler };
