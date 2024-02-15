import { z } from "zod";
import { ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import { tag, getTagsCollection } from "#collections";
import { publishTagEvent } from "#events";

const inputSchema = tag.omit({ id: true });
const outputSchema = tag.pick({ id: true });
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
  const tagsCollection = getTagsCollection(ctx.db);
  const tag = {
    ...input,
    _id: new ObjectId(),
    workspaceId: ctx.auth.workspaceId,
    value: (input.label || "").toLowerCase().replace(/\s/g, "_")
  };

  await tagsCollection.insertOne(tag);
  publishTagEvent(ctx, `${ctx.auth.workspaceId}`, {
    action: "create",
    data: {
      ...input,
      id: `${tag._id}`
    }
  });

  return { id: `${tag._id}` };
};

export { inputSchema, outputSchema, handler };
