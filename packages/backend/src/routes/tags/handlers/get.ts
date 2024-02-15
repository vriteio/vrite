import { z } from "zod";
import { ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import { tag, getTagsCollection } from "#collections";
import { errors } from "#lib/errors";

const inputSchema = tag.pick({ id: true });
const outputSchema = tag;
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
  const tagsCollection = getTagsCollection(ctx.db);
  const tag = await tagsCollection.findOne({
    workspaceId: ctx.auth.workspaceId,
    ...(input.id ? { _id: new ObjectId(input.id) } : {})
  });

  if (!tag) throw errors.notFound("tag");

  return {
    label: tag.label,
    color: tag.color,
    id: `${tag._id}`
  };
};

export { inputSchema, outputSchema, handler };
