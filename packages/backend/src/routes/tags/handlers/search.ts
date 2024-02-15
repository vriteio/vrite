import { z } from "zod";
import { AuthenticatedContext } from "#lib/middleware";
import { tag, getTagsCollection } from "#collections";
import { stringToRegex } from "#lib/utils";

const inputSchema = z.object({
  query: z.string().describe("Query to search tag values by").optional()
});
const outputSchema = z.array(tag);
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
  const tagsCollection = getTagsCollection(ctx.db);
  const tags = await tagsCollection
    .find({
      workspaceId: ctx.auth.workspaceId,
      ...(input.query ? { value: stringToRegex(input.query) } : {})
    })
    .limit(10)
    .sort("_id", -1)
    .toArray();

  return tags.map((tag) => {
    return { ...tag, id: `${tag._id}` };
  });
};

export { inputSchema, outputSchema, handler };
