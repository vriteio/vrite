import { z } from "zod";
import { AuthenticatedContext } from "#lib/middleware";
import { getTagsCollection, tag } from "#collections";

const inputSchema = z.object({
  perPage: z.number().describe("The number of tags to return per page").default(20),
  page: z.number().describe("The page number to fetch").default(1)
});
const outputSchema = z.array(tag);
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
  const tagsCollection = getTagsCollection(ctx.db);
  const tags = await tagsCollection
    .find({
      workspaceId: ctx.auth.workspaceId
    })
    .sort("_id", -1)
    .skip((input.page - 1) * input.perPage)
    .limit(input.perPage)
    .toArray();

  return tags.map((tag) => {
    return { ...tag, id: `${tag._id}` };
  });
};

export { inputSchema, outputSchema, handler };
