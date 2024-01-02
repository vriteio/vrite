import { z } from "zod";
import { ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import { tag, getTagsCollection, ExtendedTag } from "#collections";
import { publishTagEvent } from "#events";
import { errors } from "#lib/errors";

const inputSchema = tag.partial().required({ id: true });
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<void> => {
  const tagsCollection = getTagsCollection(ctx.db);
  const { id, ...update } = input;
  const tagUpdate: Partial<ExtendedTag<"value">> = {
    ...update
  };

  if (update.label) {
    tagUpdate.value = (update.label || "").toLowerCase().replace(/\s/g, "_");
  }

  const { matchedCount } = await tagsCollection.updateOne(
    {
      workspaceId: ctx.auth.workspaceId,
      _id: new ObjectId(id)
    },
    {
      $set: tagUpdate
    }
  );

  if (!matchedCount) throw errors.notFound("tag");

  publishTagEvent(ctx, `${ctx.auth.workspaceId}`, {
    action: "update",
    data: input
  });
};

export { inputSchema, handler };
